import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { Application } from '../applications/application.model.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { env } from '../../core/config/env.js';

const DRAFT_STATUSES = [
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.PENDING_AUTHORIZATION,
];

/**
 * Column order shared by CSV and XLSX exports and the ERP sync payload.
 */
export const RECORD_COLUMNS = [
  { key: 'requestId', label: 'Request ID' },
  { key: 'status', label: 'Status' },
  { key: 'applicantName', label: 'Applicant Name' },
  { key: 'applicantEmail', label: 'Applicant Email' },
  { key: 'applicantMobile', label: 'Applicant Mobile' },
  { key: 'serviceName', label: 'Service' },
  { key: 'offeringName', label: 'Offering' },
  { key: 'currentStep', label: 'Current Step' },
  { key: 'assignedToName', label: 'Assigned To' },
  { key: 'assignedToEmail', label: 'Assigned To Email' },
  { key: 'slaBreached', label: 'SLA Breached' },
  { key: 'outcome', label: 'Latest Outcome' },
  { key: 'lastActionNote', label: 'Latest Note' },
  { key: 'lastActionAt', label: 'Latest Action At' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function encodeCursor(record) {
  if (!record) return null;
  const raw = `${new Date(record.updatedAt).toISOString()}|${record.requestId}`;
  return Buffer.from(raw, 'utf8').toString('base64url');
}

/**
 * @param {string | null | undefined} cursor
 * @returns {{ updatedAt: Date, id: mongoose.Types.ObjectId } | null}
 */
function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [iso, id] = raw.split('|');
    const updatedAt = new Date(iso);
    if (Number.isNaN(updatedAt.getTime()) || !mongoose.isValidObjectId(id)) return null;
    return { updatedAt, id: toObjectId(id) };
  } catch {
    return null;
  }
}

function toIso(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * Build the MongoDB match stage for record queries.
 * @param {string} instituteId
 * @param {object} options
 */
function buildMatch(instituteId, options) {
  const match = { instituteId: toObjectId(instituteId) };

  if (options.id) {
    match._id = toObjectId(options.id);
    return match;
  }

  if (options.status) {
    match.status = options.status;
  } else if (!options.includeDrafts) {
    match.status = { $nin: DRAFT_STATUSES };
  }

  const updatedAt = {};
  if (options.from) updatedAt.$gte = options.from;
  if (options.to) updatedAt.$lte = options.to;
  if (options.updatedSince) {
    updatedAt.$gte = updatedAt.$gte
      ? new Date(Math.max(updatedAt.$gte.getTime(), options.updatedSince.getTime()))
      : options.updatedSince;
  }
  if (Object.keys(updatedAt).length) match.updatedAt = updatedAt;

  if (options.serviceId) match.serviceId = toObjectId(options.serviceId);
  if (options.offeringId) match.offeringId = toObjectId(options.offeringId);

  const cursor = decodeCursor(options.cursor);
  if (cursor) {
    match.$or = [
      { updatedAt: { $gt: cursor.updatedAt } },
      { updatedAt: cursor.updatedAt, _id: { $gt: cursor.id } },
    ];
  }

  return match;
}

/**
 * Fetch flattened application/service-request records for export or ERP sync.
 *
 * @param {string} instituteId
 * @param {{
 *   from?: Date, to?: Date, updatedSince?: Date,
 *   serviceId?: string, offeringId?: string, status?: string,
 *   limit?: number, cursor?: string, includeDrafts?: boolean,
 * }} [options]
 * @returns {Promise<{ records: object[], nextCursor: string | null, hasMore: boolean }>}
 */
export async function fetchApplicationRecords(instituteId, options = {}) {
  const limit = Math.max(1, options.limit ?? env.EXPORT_MAX_ROWS);
  const match = buildMatch(instituteId, options);

  const rows = await Application.aggregate([
    { $match: match },
    { $sort: { updatedAt: 1, _id: 1 } },
    { $limit: limit + 1 },
    { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
    { $lookup: { from: 'offerings', localField: 'offeringId', foreignField: '_id', as: 'offering' } },
    { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: 'assignee' } },
    {
      $addFields: {
        lastAction: { $arrayElemAt: [{ $ifNull: ['$workflowHistory', []] }, -1] },
        currentStepName: {
          $let: {
            vars: {
              matched: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: { $ifNull: ['$workflowSnapshot', []] },
                      as: 'step',
                      cond: { $eq: ['$$step.stepId', '$currentStepId'] },
                    },
                  },
                  0,
                ],
              },
            },
            in: { $ifNull: ['$$matched.name', ''] },
          },
        },
      },
    },
    {
      $project: {
        status: 1,
        applicantName: 1,
        applicantEmail: 1,
        applicantMobile: 1,
        slaBreached: 1,
        createdAt: 1,
        updatedAt: 1,
        currentStepName: 1,
        serviceName: { $ifNull: [{ $arrayElemAt: ['$service.name', 0] }, ''] },
        offeringName: { $ifNull: [{ $arrayElemAt: ['$offering.name', 0] }, ''] },
        assignedToName: { $ifNull: [{ $arrayElemAt: ['$assignee.name', 0] }, ''] },
        assignedToEmail: { $ifNull: [{ $arrayElemAt: ['$assignee.email', 0] }, ''] },
        outcome: { $ifNull: ['$lastAction.outcome', ''] },
        lastActionNote: { $ifNull: ['$lastAction.note', ''] },
        lastActionAt: '$lastAction.createdAt',
      },
    },
  ]);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const records = pageRows.map((row) => ({
    requestId: row._id.toString(),
    status: row.status,
    applicantName: row.applicantName ?? '',
    applicantEmail: row.applicantEmail ?? '',
    applicantMobile: row.applicantMobile ?? '',
    serviceName: row.serviceName ?? '',
    offeringName: row.offeringName ?? '',
    currentStep: row.currentStepName ?? '',
    assignedToName: row.assignedToName ?? '',
    assignedToEmail: row.assignedToEmail ?? '',
    slaBreached: Boolean(row.slaBreached),
    outcome: row.outcome ?? '',
    lastActionNote: row.lastActionNote ?? '',
    lastActionAt: toIso(row.lastActionAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }));

  return {
    records,
    hasMore,
    nextCursor: hasMore ? encodeCursor(records[records.length - 1]) : null,
  };
}

/**
 * Fetch a single record by application id (tenant-scoped).
 * @param {string} instituteId
 * @param {string} id
 * @returns {Promise<object | null>}
 */
export async function fetchApplicationRecordById(instituteId, id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const { records } = await fetchApplicationRecords(instituteId, { id, limit: 1 });
  return records[0] ?? null;
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * @param {object[]} records
 */
export function recordsToCsv(records) {
  const header = RECORD_COLUMNS.map((column) => csvEscape(column.label)).join(',');
  const lines = records.map((record) =>
    RECORD_COLUMNS.map((column) => csvEscape(record[column.key])).join(','),
  );
  return `${[header, ...lines].join('\n')}\n`;
}

/**
 * @param {object[]} records
 * @returns {Buffer}
 */
export function recordsToXlsx(records) {
  const rows = records.map((record) => {
    const row = {};
    RECORD_COLUMNS.forEach((column) => {
      row[column.label] = record[column.key];
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: RECORD_COLUMNS.map((column) => column.label),
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Produce an export payload (CSV, XLSX, or JSON) of application records.
 *
 * @param {string} instituteId
 * @param {import('./export.validator.js').exportRecordsSchema['_output']} query
 */
export async function exportApplicationRecords(instituteId, query) {
  const options = {
    from: query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined,
    to: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
    serviceId: query.serviceId,
    offeringId: query.offeringId,
    status: query.status,
    limit: env.EXPORT_MAX_ROWS,
  };

  const { records } = await fetchApplicationRecords(instituteId, options);
  const stamp = new Date().toISOString().slice(0, 10);

  if (query.format === 'json') {
    return {
      contentType: 'application/json; charset=utf-8',
      filename: `service-requests-${stamp}.json`,
      body: JSON.stringify({ count: records.length, records }, null, 2),
    };
  }

  if (query.format === 'xlsx') {
    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `service-requests-${stamp}.xlsx`,
      body: recordsToXlsx(records),
    };
  }

  return {
    contentType: 'text/csv; charset=utf-8',
    filename: `service-requests-${stamp}.csv`,
    body: recordsToCsv(records),
  };
}
