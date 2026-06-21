import mongoose from 'mongoose';
import { Application } from '../applications/application.model.js';
import { QueueTicket, QUEUE_TICKET_STATUS } from '../queue/queueTicket.model.js';
import { Appointment, APPOINTMENT_STATUS } from '../appointments/appointment.model.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { User } from '../users/user.model.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { OUTCOME_TYPE } from '../../shared/enums/workflow.enums.js';
import { ROLES } from '../../shared/constants/roles.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';

const EXCLUDED_STATUSES = [
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.PENDING_AUTHORIZATION,
];

const TERMINAL_STATUSES = [APPLICATION_STATUS.ADMITTED, APPLICATION_STATUS.REJECTED];
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 14;
const MAX_RANGE_DAYS = 90;

function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function roundHours(ms) {
  if (!ms || ms <= 0) return 0;
  return Math.round((ms / (60 * 60 * 1000)) * 10) / 10;
}

function roundMinutes(ms) {
  if (!ms || ms <= 0) return 0;
  return Math.round(ms / (60 * 1000));
}

/**
 * @param {import('./analytics.validator.js').analyticsFiltersSchema['_output']} query
 * @param {{ allowStaffFilter?: boolean }} [options]
 */
export function parseAnalyticsFilters(query = {}, options = {}) {
  const { allowStaffFilter = true } = options;
  const today = startOfDay(new Date());
  const defaultFrom = startOfDay(new Date(today.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS));

  const from = query.from ? startOfDay(new Date(`${query.from}T00:00:00`)) : defaultFrom;
  const to = query.to ? endOfDay(new Date(`${query.to}T00:00:00`)) : endOfDay(today);
  const rawDays = Math.ceil((to.getTime() - from.getTime()) / DAY_MS) + 1;
  const days = Math.min(Math.max(rawDays, 1), MAX_RANGE_DAYS);

  return {
    from,
    to,
    days,
    fromKey: from.toISOString().slice(0, 10),
    toKey: to.toISOString().slice(0, 10),
    serviceId: query.serviceId ?? null,
    offeringId: query.offeringId ?? null,
    status: query.status ?? null,
    staffId: allowStaffFilter ? (query.staffId ?? null) : null,
  };
}

function buildApplicationFilter(instituteId, filters, extra = {}) {
  const match = {
    instituteId: toObjectId(instituteId),
    status: { $nin: EXCLUDED_STATUSES },
    updatedAt: { $gte: filters.from, $lte: filters.to },
    ...extra,
  };

  if (filters.serviceId) match.serviceId = toObjectId(filters.serviceId);
  if (filters.offeringId) match.offeringId = toObjectId(filters.offeringId);
  if (filters.status) match.status = filters.status;
  if (filters.staffId) match.assignedTo = toObjectId(filters.staffId);

  return match;
}

function buildDateSeries(rawRows, filters, valueKey = 'count') {
  const map = new Map(
    (rawRows ?? []).map((row) => [row._id ?? row.date, row[valueKey] ?? row.count ?? 0]),
  );
  const series = [];

  for (let offset = filters.days - 1; offset >= 0; offset -= 1) {
    const date = new Date(filters.from.getTime() + offset * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    series.push({
      date: key,
      label: formatDayLabel(key),
      count: map.get(key) ?? 0,
      ...(valueKey !== 'count' ? { [valueKey]: map.get(key) ?? 0 } : {}),
    });
  }

  return series;
}

async function aggregateDailyActivity(filter, dateField, filters) {
  const rows = await Application.aggregate([
    { $match: { ...filter, [dateField]: { $gte: filters.from, $lte: filters.to } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return buildDateSeries(rows, filters);
}

async function aggregateServiceVolume(filter, limit = 6) {
  const rows = await Application.aggregate([
    { $match: filter },
    { $group: { _id: '$serviceId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'services',
        localField: '_id',
        foreignField: '_id',
        as: 'service',
      },
    },
    {
      $project: {
        count: 1,
        label: { $ifNull: [{ $arrayElemAt: ['$service.name', 0] }, 'Unknown service'] },
      },
    },
  ]);

  return rows.map((row) => ({
    serviceId: row._id?.toString?.() ?? '',
    label: row.label,
    count: row.count,
  }));
}

async function aggregateOfferingVolume(filter, limit = 6) {
  const rows = await Application.aggregate([
    { $match: filter },
    { $group: { _id: '$offeringId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'offerings',
        localField: '_id',
        foreignField: '_id',
        as: 'offering',
      },
    },
    {
      $project: {
        count: 1,
        label: { $ifNull: [{ $arrayElemAt: ['$offering.name', 0] }, 'Unknown option'] },
      },
    },
  ]);

  return rows.map((row) => ({
    offeringId: row._id?.toString?.() ?? '',
    label: row.label,
    count: row.count,
  }));
}

async function aggregateStaffWorkload(instituteId, filters, limit = 8) {
  const match = {
    instituteId: toObjectId(instituteId),
    assignedTo: { $ne: null },
    status: { $nin: EXCLUDED_STATUSES },
    updatedAt: { $gte: filters.from, $lte: filters.to },
  };
  if (filters.serviceId) match.serviceId = toObjectId(filters.serviceId);
  if (filters.offeringId) match.offeringId = toObjectId(filters.offeringId);
  if (filters.status) match.status = filters.status;
  if (filters.staffId) match.assignedTo = toObjectId(filters.staffId);

  const rows = await Application.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$assignedTo',
        assigned: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $in: ['$status', TERMINAL_STATUSES] }, 1, 0],
          },
        },
        slaBreached: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$slaBreached', true] },
                  { $eq: ['$status', APPLICATION_STATUS.IN_REVIEW] },
                ],
              },
              1,
              0,
            ],
          },
        },
        avgTurnaroundMs: {
          $avg: {
            $cond: [
              { $in: ['$status', TERMINAL_STATUSES] },
              { $subtract: ['$updatedAt', '$createdAt'] },
              null,
            ],
          },
        },
      },
    },
    { $sort: { assigned: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'staff',
      },
    },
    {
      $project: {
        assigned: 1,
        resolved: 1,
        slaBreached: 1,
        avgTurnaroundHours: {
          $round: [{ $divide: [{ $ifNull: ['$avgTurnaroundMs', 0] }, 3600000] }, 1],
        },
        label: { $ifNull: [{ $arrayElemAt: ['$staff.name', 0] }, 'Unassigned'] },
      },
    },
  ]);

  return rows.map((row) => ({
    staffId: row._id?.toString?.() ?? '',
    label: row.label,
    count: row.assigned,
    assigned: row.assigned,
    resolved: row.resolved,
    slaBreached: row.slaBreached,
    avgTurnaroundHours: row.avgTurnaroundHours ?? 0,
  }));
}

async function aggregateStatusFunnel(filter) {
  const rows = await Application.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map(rows.map((row) => [row._id, row.count]));
  const steps = [
    { status: APPLICATION_STATUS.SUBMITTED, label: 'Submitted', order: 1 },
    { status: APPLICATION_STATUS.IN_REVIEW, label: 'In review', order: 2 },
    { status: APPLICATION_STATUS.NEEDS_CORRECTION, label: 'Needs correction', order: 3 },
    { status: APPLICATION_STATUS.ADMITTED, label: 'Approved', order: 4 },
    { status: APPLICATION_STATUS.REJECTED, label: 'Rejected', order: 5 },
  ];

  return steps.map((step) => ({
    status: step.status,
    label: step.label,
    order: step.order,
    count: countMap.get(step.status) ?? 0,
  }));
}

async function aggregateOfferingFunnel(filter, limit = 6) {
  const rows = await Application.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$offeringId',
        total: { $sum: 1 },
        submitted: {
          $sum: { $cond: [{ $eq: ['$status', APPLICATION_STATUS.SUBMITTED] }, 1, 0] },
        },
        inReview: {
          $sum: { $cond: [{ $eq: ['$status', APPLICATION_STATUS.IN_REVIEW] }, 1, 0] },
        },
        needsCorrection: {
          $sum: { $cond: [{ $eq: ['$status', APPLICATION_STATUS.NEEDS_CORRECTION] }, 1, 0] },
        },
        admitted: {
          $sum: { $cond: [{ $eq: ['$status', APPLICATION_STATUS.ADMITTED] }, 1, 0] },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', APPLICATION_STATUS.REJECTED] }, 1, 0] },
        },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'offerings',
        localField: '_id',
        foreignField: '_id',
        as: 'offering',
      },
    },
    {
      $project: {
        total: 1,
        submitted: 1,
        inReview: 1,
        needsCorrection: 1,
        admitted: 1,
        rejected: 1,
        label: { $ifNull: [{ $arrayElemAt: ['$offering.name', 0] }, 'Unknown option'] },
      },
    },
  ]);

  return rows.map((row) => ({
    offeringId: row._id?.toString?.() ?? '',
    label: row.label,
    total: row.total,
    funnel: [
      { label: 'Submitted', count: row.submitted },
      { label: 'In review', count: row.inReview },
      { label: 'Correction', count: row.needsCorrection },
      { label: 'Approved', count: row.admitted },
      { label: 'Rejected', count: row.rejected },
    ],
  }));
}

async function aggregateWorkflowBottlenecks(filter, limit = 8) {
  const [currentStepRows, historyRows] = await Promise.all([
    Application.aggregate([
      {
        $match: {
          ...filter,
          status: { $in: [APPLICATION_STATUS.IN_REVIEW, APPLICATION_STATUS.NEEDS_CORRECTION] },
          currentStepId: { $ne: null },
        },
      },
      {
        $addFields: {
          currentStepName: {
            $let: {
              vars: {
                matchedStep: {
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
              in: { $ifNull: ['$$matchedStep.name', 'Workflow step'] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$currentStepId',
          activeCount: { $sum: 1 },
          overdueCount: {
            $sum: {
              $cond: [{ $eq: ['$slaBreached', true] }, 1, 0],
            },
          },
          stepName: { $first: '$currentStepName' },
        },
      },
      { $sort: { activeCount: -1 } },
      { $limit: limit },
    ]),
    Application.aggregate([
      { $match: filter },
      { $unwind: '$workflowHistory' },
      {
        $match: {
          'workflowHistory.createdAt': { $gte: filter.updatedAt.$gte, $lte: filter.updatedAt.$lte },
        },
      },
      {
        $group: {
          _id: {
            stepId: '$workflowHistory.stepId',
            stepName: '$workflowHistory.stepName',
          },
          actionCount: { $sum: 1 },
        },
      },
      { $sort: { actionCount: -1 } },
      { $limit: limit },
    ]),
  ]);

  const historyMap = new Map(
    historyRows.map((row) => [
      row._id.stepId,
      { stepName: row._id.stepName, actionCount: row.actionCount },
    ]),
  );

  const merged = new Map();

  currentStepRows.forEach((row) => {
    merged.set(row._id, {
      stepId: row._id,
      stepName: row.stepName ?? historyMap.get(row._id)?.stepName ?? 'Workflow step',
      activeCount: row.activeCount,
      overdueCount: row.overdueCount,
      actionCount: historyMap.get(row._id)?.actionCount ?? 0,
    });
  });

  historyRows.forEach((row) => {
    const stepId = row._id.stepId;
    if (!merged.has(stepId)) {
      merged.set(stepId, {
        stepId,
        stepName: row._id.stepName ?? 'Workflow step',
        activeCount: 0,
        overdueCount: 0,
        actionCount: row.actionCount,
      });
    }
  });

  return [...merged.values()]
    .sort((a, b) => (b.activeCount + b.actionCount) - (a.activeCount + a.actionCount))
    .slice(0, limit)
    .map((row) => ({
      stepId: row.stepId,
      label: row.stepName,
      activeCount: row.activeCount,
      overdueCount: row.overdueCount,
      actionCount: row.actionCount,
      count: row.activeCount + row.actionCount,
    }));
}

async function aggregateTurnaroundTrend(filter, filters) {
  const [summaryRow, trendRows] = await Promise.all([
    Application.aggregate([
      { $match: { ...filter, status: { $in: TERMINAL_STATUSES } } },
      {
        $group: {
          _id: null,
          avgMs: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Application.aggregate([
      { $match: { ...filter, status: { $in: TERMINAL_STATUSES } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          avgMs: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const avgMs = summaryRow[0]?.avgMs ?? 0;
  const resolvedCount = summaryRow[0]?.count ?? 0;
  const trendMap = new Map(
    trendRows.map((row) => [row._id, { avgHours: roundHours(row.avgMs), count: row.count }]),
  );

  const trend = buildDateSeries(
    trendRows.map((row) => ({ _id: row._id, count: roundHours(row.avgMs) })),
    filters,
  ).map((point) => ({
    ...point,
    resolvedCount: trendMap.get(point.date)?.count ?? 0,
    avgHours: trendMap.get(point.date)?.avgHours ?? 0,
  }));

  return {
    avgTurnaroundHours: roundHours(avgMs),
    resolvedCount,
    trend,
  };
}

async function aggregateSlaTrend(filter, filters) {
  const rows = await Application.aggregate([
    {
      $match: {
        ...filter,
        status: APPLICATION_STATUS.IN_REVIEW,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        overdue: { $sum: { $cond: [{ $eq: ['$slaBreached', true] }, 1, 0] } },
        onTrack: { $sum: { $cond: [{ $eq: ['$slaBreached', true] }, 0, 1] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return buildDateSeries(rows, filters).map((point) => {
    const row = rows.find((item) => item._id === point.date);
    return {
      ...point,
      overdue: row?.overdue ?? 0,
      onTrack: row?.onTrack ?? 0,
    };
  });
}

async function aggregateCorrectionAnalytics(filter, filters) {
  const [summaryRows, trendRows] = await Promise.all([
    Application.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          corrections: {
            $sum: {
              $cond: [{ $eq: ['$status', APPLICATION_STATUS.NEEDS_CORRECTION] }, 1, 0],
            },
          },
          correctionEvents: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$workflowHistory', []] },
                  as: 'entry',
                  cond: { $eq: ['$$entry.outcome', OUTCOME_TYPE.NEEDS_CORRECTION] },
                },
              },
            },
          },
        },
      },
    ]),
    Application.aggregate([
      { $match: filter },
      { $unwind: { path: '$workflowHistory', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'workflowHistory.outcome': OUTCOME_TYPE.NEEDS_CORRECTION,
          'workflowHistory.createdAt': { $gte: filters.from, $lte: filters.to },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$workflowHistory.createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const summary = summaryRows[0] ?? { total: 0, corrections: 0, correctionEvents: 0 };
  const correctionRate =
    summary.total > 0 ? Math.round((summary.corrections / summary.total) * 100) : 0;

  return {
    correctionRate,
    activeCorrections: summary.corrections,
    correctionEvents: summary.correctionEvents,
    trend: buildDateSeries(trendRows, filters),
  };
}

async function aggregateRejectionReasons(filter, limit = 8) {
  const rows = await Application.aggregate([
    { $match: filter },
    { $unwind: '$workflowHistory' },
    {
      $match: {
        'workflowHistory.outcome': OUTCOME_TYPE.REJECTED,
        'workflowHistory.createdAt': { $gte: filter.updatedAt.$gte, $lte: filter.updatedAt.$lte },
      },
    },
    {
      $group: {
        _id: {
          $trim: {
            input: {
              $cond: [
                { $gt: [{ $strLenCP: { $ifNull: ['$workflowHistory.note', ''] } }, 0] },
                '$workflowHistory.note',
                'No reason provided',
              ],
            },
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row, index) => ({
    reason: row._id,
    label: row._id.length > 48 ? `${row._id.slice(0, 45)}…` : row._id,
    count: row.count,
    fill: ['#B91C1C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA'][index % 6],
  }));
}

async function aggregateQueueWaitAnalytics(instituteId, filters) {
  const instituteObjectId = toObjectId(instituteId);
  const ticketMatch = {
    instituteId: instituteObjectId,
    createdAt: { $gte: filters.from, $lte: filters.to },
    calledAt: { $ne: null },
  };
  if (filters.serviceId) ticketMatch.serviceId = toObjectId(filters.serviceId);
  if (filters.offeringId) ticketMatch.offeringId = toObjectId(filters.offeringId);

  const [summaryRows, trendRows, statusRows] = await Promise.all([
    QueueTicket.aggregate([
      { $match: ticketMatch },
      {
        $group: {
          _id: null,
          avgWaitMs: { $avg: { $subtract: ['$calledAt', '$createdAt'] } },
          avgServiceMs: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$completedAt', null] }, { $ne: ['$calledAt', null] }] },
                { $subtract: ['$completedAt', '$calledAt'] },
                null,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    QueueTicket.aggregate([
      { $match: ticketMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          avgWaitMs: { $avg: { $subtract: ['$calledAt', '$createdAt'] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    QueueTicket.aggregate([
      {
        $match: {
          instituteId: instituteObjectId,
          ...(filters.serviceId ? { serviceId: toObjectId(filters.serviceId) } : {}),
          ...(filters.offeringId ? { offeringId: toObjectId(filters.offeringId) } : {}),
        },
      },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const summary = summaryRows[0] ?? { avgWaitMs: 0, avgServiceMs: 0, count: 0 };
  const statusMap = new Map(statusRows.map((row) => [row._id, row.count]));

  return {
    avgWaitMinutes: roundMinutes(summary.avgWaitMs),
    avgServiceMinutes: roundMinutes(summary.avgServiceMs),
    ticketsServed: summary.count ?? 0,
    trend: buildDateSeries(
      trendRows.map((row) => ({ _id: row._id, count: roundMinutes(row.avgWaitMs) })),
      filters,
    ).map((point) => ({
      ...point,
      avgWaitMinutes: point.count,
      tickets: trendRows.find((row) => row._id === point.date)?.count ?? 0,
    })),
    statusBreakdown: [
      { status: QUEUE_TICKET_STATUS.WAITING, label: 'Waiting', count: statusMap.get(QUEUE_TICKET_STATUS.WAITING) ?? 0 },
      { status: QUEUE_TICKET_STATUS.CALLED, label: 'Called', count: statusMap.get(QUEUE_TICKET_STATUS.CALLED) ?? 0 },
      { status: QUEUE_TICKET_STATUS.SERVING, label: 'Serving', count: statusMap.get(QUEUE_TICKET_STATUS.SERVING) ?? 0 },
      { status: QUEUE_TICKET_STATUS.COMPLETED, label: 'Completed', count: statusMap.get(QUEUE_TICKET_STATUS.COMPLETED) ?? 0 },
    ],
  };
}

async function aggregateAppointmentUtilization(instituteId, filters) {
  const instituteObjectId = toObjectId(instituteId);
  const match = {
    instituteId: instituteObjectId,
    slotStart: { $gte: filters.from, $lte: filters.to },
  };
  if (filters.offeringId) match.offeringId = toObjectId(filters.offeringId);

  const rows = await Appointment.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(rows.map((row) => [row._id, row.count]));
  const booked = countMap.get(APPOINTMENT_STATUS.BOOKED) ?? 0;
  const completed = countMap.get(APPOINTMENT_STATUS.COMPLETED) ?? 0;
  const cancelled = countMap.get(APPOINTMENT_STATUS.CANCELLED) ?? 0;
  const noShow = countMap.get(APPOINTMENT_STATUS.NO_SHOW) ?? 0;
  const total = booked + completed + cancelled + noShow;
  const utilizationRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    utilizationRate,
    total,
    breakdown: [
      { status: APPOINTMENT_STATUS.BOOKED, label: 'Booked', count: booked, fill: '#2563EB' },
      { status: APPOINTMENT_STATUS.COMPLETED, label: 'Completed', count: completed, fill: '#0A6640' },
      { status: APPOINTMENT_STATUS.CANCELLED, label: 'Cancelled', count: cancelled, fill: '#D97706' },
      { status: APPOINTMENT_STATUS.NO_SHOW, label: 'No show', count: noShow, fill: '#B91C1C' },
    ].filter((item) => item.count > 0),
  };
}

async function loadRecentRequests(filter) {
  const rows = await Application.aggregate([
    { $match: filter },
    { $sort: { updatedAt: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'services',
        localField: 'serviceId',
        foreignField: '_id',
        as: 'service',
      },
    },
    {
      $lookup: {
        from: 'offerings',
        localField: 'offeringId',
        foreignField: '_id',
        as: 'offering',
      },
    },
    {
      $project: {
        applicantName: 1,
        status: 1,
        updatedAt: 1,
        serviceName: { $ifNull: [{ $arrayElemAt: ['$service.name', 0] }, 'Service'] },
        offeringName: { $ifNull: [{ $arrayElemAt: ['$offering.name', 0] }, 'Option'] },
      },
    },
  ]);

  return rows.map((row) => ({
    id: row._id.toString(),
    applicantName: row.applicantName,
    status: row.status,
    serviceName: row.serviceName,
    offeringName: row.offeringName,
    updatedAt: row.updatedAt,
  }));
}

async function countStatusBreakdown(baseFilter) {
  const statuses = [
    APPLICATION_STATUS.SUBMITTED,
    APPLICATION_STATUS.IN_REVIEW,
    APPLICATION_STATUS.NEEDS_CORRECTION,
    APPLICATION_STATUS.ADMITTED,
    APPLICATION_STATUS.REJECTED,
  ];

  const counts = await Promise.all(
    statuses.map((status) =>
      Application.countDocuments({ ...baseFilter, status }).then((count) => ({ status, count })),
    ),
  );

  const labelMap = {
    [APPLICATION_STATUS.SUBMITTED]: 'New',
    [APPLICATION_STATUS.IN_REVIEW]: 'In review',
    [APPLICATION_STATUS.NEEDS_CORRECTION]: 'Correction',
    [APPLICATION_STATUS.ADMITTED]: 'Approved',
    [APPLICATION_STATUS.REJECTED]: 'Rejected',
  };

  return counts.map(({ status, count }) => ({
    status,
    label: labelMap[status],
    count,
  }));
}

async function loadAdminDashboardAnalytics(instituteId, filters) {
  const instituteObjectId = toObjectId(instituteId);
  const baseFilter = buildApplicationFilter(instituteId, filters);
  const intakeFilter = {
    instituteId: instituteObjectId,
    status: APPLICATION_STATUS.PENDING_AUTHORIZATION,
    createdAt: { $gte: filters.from, $lte: filters.to },
  };

  const weekStart = startOfDay(new Date(Math.max(filters.from.getTime(), filters.to.getTime() - 6 * DAY_MS)));
  const prevWeekStart = startOfDay(new Date(weekStart.getTime() - 7 * DAY_MS));

  const [
    totalRequests,
    submitted,
    inReview,
    needsCorrection,
    admitted,
    rejected,
    pendingAuthorization,
    slaBreached,
    activeServices,
    activeOfferings,
    waitingQueue,
    calledQueue,
    servingQueue,
    upcomingAppointments,
    staffCount,
    activityTrend,
    intakeTrend,
    serviceVolume,
    offeringVolume,
    staffWorkload,
    weeklyCurrent,
    weeklyPrevious,
    recentRequests,
    statusFunnel,
    offeringFunnel,
    workflowBottlenecks,
    turnaround,
    slaTrend,
    correctionAnalytics,
    rejectionReasons,
    queueAnalytics,
    appointmentUtilization,
  ] = await Promise.all([
    Application.countDocuments(baseFilter),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.SUBMITTED }),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.IN_REVIEW }),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.NEEDS_CORRECTION }),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.ADMITTED }),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.REJECTED }),
    Application.countDocuments(intakeFilter),
    Application.countDocuments({
      ...baseFilter,
      slaBreached: true,
      status: APPLICATION_STATUS.IN_REVIEW,
    }),
    Service.countDocuments({ instituteId: instituteObjectId, status: 'active' }),
    Offering.countDocuments({ instituteId: instituteObjectId, status: 'active' }),
    QueueTicket.countDocuments({ instituteId: instituteObjectId, status: QUEUE_TICKET_STATUS.WAITING }),
    QueueTicket.countDocuments({ instituteId: instituteObjectId, status: QUEUE_TICKET_STATUS.CALLED }),
    QueueTicket.countDocuments({ instituteId: instituteObjectId, status: QUEUE_TICKET_STATUS.SERVING }),
    Appointment.countDocuments({
      instituteId: instituteObjectId,
      status: APPOINTMENT_STATUS.BOOKED,
      slotStart: { $gte: new Date() },
    }),
    User.countDocuments({ instituteId: instituteObjectId, role: ROLES.STAFF, isActive: true }),
    aggregateDailyActivity(baseFilter, 'updatedAt', filters),
    aggregateDailyActivity(intakeFilter, 'createdAt', filters),
    aggregateServiceVolume(baseFilter),
    aggregateOfferingVolume(baseFilter),
    aggregateStaffWorkload(instituteId, filters),
    Application.countDocuments({ ...baseFilter, updatedAt: { $gte: weekStart, $lte: filters.to } }),
    Application.countDocuments({
      ...baseFilter,
      updatedAt: { $gte: prevWeekStart, $lt: weekStart },
    }),
    loadRecentRequests(baseFilter),
    aggregateStatusFunnel(baseFilter),
    aggregateOfferingFunnel(baseFilter),
    aggregateWorkflowBottlenecks(baseFilter),
    aggregateTurnaroundTrend(baseFilter, filters),
    aggregateSlaTrend(baseFilter, filters),
    aggregateCorrectionAnalytics(baseFilter, filters),
    aggregateRejectionReasons(baseFilter),
    aggregateQueueWaitAnalytics(instituteId, filters),
    aggregateAppointmentUtilization(instituteId, filters),
  ]);

  const onTrackReview = Math.max(inReview - slaBreached, 0);
  const activePipeline = submitted + inReview + needsCorrection;

  const statusBreakdown = [
    { status: 'submitted', label: 'New', count: submitted },
    { status: 'in_review', label: 'In review', count: inReview },
    { status: 'needs_correction', label: 'Correction', count: needsCorrection },
    { status: 'admitted', label: 'Approved', count: admitted },
    { status: 'rejected', label: 'Rejected', count: rejected },
  ];

  const outcomeBreakdown = [
    { label: 'Approved', count: admitted, fill: '#0A6640', status: APPLICATION_STATUS.ADMITTED },
    { label: 'Rejected', count: rejected, fill: '#B91C1C', status: APPLICATION_STATUS.REJECTED },
    { label: 'In progress', count: activePipeline, fill: '#10B981', status: 'in_progress' },
  ].filter((item) => item.count > 0);

  const slaHealth = [
    { label: 'On track', count: onTrackReview, fill: '#0A6640', filterKey: 'slaOnTrack' },
    { label: 'Overdue', count: slaBreached, fill: '#B91C1C', filterKey: 'slaOverdue' },
  ].filter((item) => item.count > 0);

  const operationsLoad = [
    { label: 'Queue waiting', count: waitingQueue, link: '/admin/applications' },
    { label: 'Called', count: calledQueue, link: '/staff/queue' },
    { label: 'Serving', count: servingQueue, link: '/staff/queue' },
    { label: 'Appointments', count: upcomingAppointments, link: '/staff/appointments' },
  ];

  const platformSnapshot = [
    { label: 'Active services', value: activeServices },
    { label: 'Active offerings', value: activeOfferings },
    { label: 'Staff members', value: staffCount },
    { label: 'Pending authorization', value: pendingAuthorization },
  ];

  return {
    filters: {
      from: filters.fromKey,
      to: filters.toKey,
      serviceId: filters.serviceId,
      offeringId: filters.offeringId,
      status: filters.status,
      staffId: filters.staffId,
    },
    summary: {
      totalRequests,
      submitted,
      inReview,
      needsCorrection,
      admitted,
      rejected,
      pendingAuthorization,
      slaBreached,
      activeServices,
      activeOfferings,
      waitingQueue,
      upcomingAppointments,
      staffCount,
      weeklyCurrent,
      weeklyPrevious,
      correctionRate: correctionAnalytics.correctionRate,
      avgTurnaroundHours: turnaround.avgTurnaroundHours,
      avgQueueWaitMinutes: queueAnalytics.avgWaitMinutes,
      appointmentUtilizationRate: appointmentUtilization.utilizationRate,
      completionRate:
        totalRequests > 0 ? Math.round(((admitted + rejected) / totalRequests) * 100) : 0,
    },
    charts: {
      activityTrend,
      intakeTrend,
      statusBreakdown,
      outcomeBreakdown,
      serviceVolume,
      offeringVolume,
      staffWorkload,
      slaHealth,
      operationsLoad,
      statusFunnel,
      offeringFunnel,
      workflowBottlenecks,
      turnaroundTrend: turnaround.trend,
      slaTrend,
      correctionTrend: correctionAnalytics.trend,
      rejectionReasons,
      queueWaitTrend: queueAnalytics.trend,
      queueStatusBreakdown: queueAnalytics.statusBreakdown,
      appointmentUtilization: appointmentUtilization.breakdown,
    },
    deepAnalytics: {
      turnaround,
      correctionAnalytics,
      queueAnalytics,
      appointmentUtilization,
    },
    platformSnapshot,
    recentRequests,
  };
}

async function loadStaffDashboardAnalytics(instituteId, staffUserId, filters) {
  const staffObjectId = toObjectId(staffUserId);
  const baseFilter = buildApplicationFilter(instituteId, filters, { assignedTo: staffObjectId });

  const weekStart = startOfDay(new Date(Math.max(filters.from.getTime(), filters.to.getTime() - 6 * DAY_MS)));

  const [
    total,
    submitted,
    inReview,
    needsCorrection,
    admitted,
    rejected,
    slaBreached,
    activityTrend,
    completionTrend,
    recentAssigned,
    resolvedThisWeek,
    statusBreakdownRows,
    statusFunnel,
    workflowBottlenecks,
    turnaround,
    slaTrend,
    correctionAnalytics,
    rejectionReasons,
    queueAnalytics,
    appointmentUtilization,
  ] = await Promise.all([
    Application.countDocuments(baseFilter),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.SUBMITTED }),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.IN_REVIEW }),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.NEEDS_CORRECTION }),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.ADMITTED }),
    Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.REJECTED }),
    Application.countDocuments({
      ...baseFilter,
      slaBreached: true,
      status: APPLICATION_STATUS.IN_REVIEW,
    }),
    aggregateDailyActivity(baseFilter, 'updatedAt', filters),
    aggregateDailyActivity(
      {
        ...baseFilter,
        status: { $in: TERMINAL_STATUSES },
      },
      'updatedAt',
      filters,
    ),
    loadRecentRequests(baseFilter),
    Application.countDocuments({
      ...baseFilter,
      status: { $in: TERMINAL_STATUSES },
      updatedAt: { $gte: weekStart, $lte: filters.to },
    }),
    countStatusBreakdown(baseFilter),
    aggregateStatusFunnel(baseFilter),
    aggregateWorkflowBottlenecks(baseFilter),
    aggregateTurnaroundTrend(baseFilter, filters),
    aggregateSlaTrend(baseFilter, filters),
    aggregateCorrectionAnalytics(baseFilter, filters),
    aggregateRejectionReasons(baseFilter),
    aggregateQueueWaitAnalytics(instituteId, filters),
    aggregateAppointmentUtilization(instituteId, filters),
  ]);

  const onTrackReview = Math.max(inReview - slaBreached, 0);
  const activePipeline = submitted + inReview + needsCorrection;

  const statusBreakdown = statusBreakdownRows.filter((item) => item.count > 0);

  const outcomeBreakdown = [
    { label: 'Approved', count: admitted, fill: '#0A6640', status: APPLICATION_STATUS.ADMITTED },
    { label: 'Rejected', count: rejected, fill: '#B91C1C', status: APPLICATION_STATUS.REJECTED },
    { label: 'Active', count: activePipeline, fill: '#10B981', status: 'in_progress' },
  ].filter((item) => item.count > 0);

  const slaHealth = [
    { label: 'On track', count: onTrackReview, fill: '#0A6640', filterKey: 'slaOnTrack' },
    { label: 'Overdue', count: slaBreached, fill: '#B91C1C', filterKey: 'slaOverdue' },
  ].filter((item) => item.count > 0);

  const priorityMix = [
    { label: 'Needs correction', count: needsCorrection, fill: '#D97706', status: APPLICATION_STATUS.NEEDS_CORRECTION },
    { label: 'Under review', count: inReview, fill: '#2563EB', status: APPLICATION_STATUS.IN_REVIEW },
    { label: 'New submissions', count: submitted, fill: '#10B981', status: APPLICATION_STATUS.SUBMITTED },
  ].filter((item) => item.count > 0);

  return {
    filters: {
      from: filters.fromKey,
      to: filters.toKey,
      serviceId: filters.serviceId,
      offeringId: filters.offeringId,
      status: filters.status,
    },
    summary: {
      total,
      submitted,
      inReview,
      needsCorrection,
      admitted,
      rejected,
      slaBreached,
      resolvedThisWeek,
      correctionRate: correctionAnalytics.correctionRate,
      avgTurnaroundHours: turnaround.avgTurnaroundHours,
      avgQueueWaitMinutes: queueAnalytics.avgWaitMinutes,
      appointmentUtilizationRate: appointmentUtilization.utilizationRate,
      completionRate: total > 0 ? Math.round(((admitted + rejected) / total) * 100) : 0,
    },
    charts: {
      activityTrend,
      completionTrend,
      statusBreakdown,
      outcomeBreakdown,
      slaHealth,
      priorityMix,
      statusFunnel,
      workflowBottlenecks,
      turnaroundTrend: turnaround.trend,
      slaTrend,
      correctionTrend: correctionAnalytics.trend,
      rejectionReasons,
      queueWaitTrend: queueAnalytics.trend,
      queueStatusBreakdown: queueAnalytics.statusBreakdown,
      appointmentUtilization: appointmentUtilization.breakdown,
    },
    deepAnalytics: {
      turnaround,
      correctionAnalytics,
      queueAnalytics,
      appointmentUtilization,
    },
    recentAssigned,
  };
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsvRow(values) {
  return values.map(csvEscape).join(',');
}

/**
 * @param {Awaited<ReturnType<typeof loadAdminDashboardAnalytics>> | Awaited<ReturnType<typeof loadStaffDashboardAnalytics>>} analytics
 * @param {'admin' | 'staff'} scope
 */
export function analyticsToCsv(analytics, scope = 'admin') {
  const lines = [];
  const { filters, summary } = analytics;

  lines.push(buildCsvRow(['Report scope', scope]));
  lines.push(buildCsvRow(['Date from', filters.from]));
  lines.push(buildCsvRow(['Date to', filters.to]));
  if (filters.serviceId) lines.push(buildCsvRow(['Service ID', filters.serviceId]));
  if (filters.offeringId) lines.push(buildCsvRow(['Offering ID', filters.offeringId]));
  if (filters.status) lines.push(buildCsvRow(['Status', filters.status]));
  if (filters.staffId) lines.push(buildCsvRow(['Staff ID', filters.staffId]));
  lines.push('');

  lines.push(buildCsvRow(['Metric', 'Value']));
  Object.entries(summary).forEach(([key, value]) => {
    lines.push(buildCsvRow([key, value]));
  });
  lines.push('');

  const chartSections = [
    ['Activity trend', analytics.charts.activityTrend, ['date', 'label', 'count']],
    ['Status breakdown', analytics.charts.statusBreakdown, ['status', 'label', 'count']],
    ['SLA trend', analytics.charts.slaTrend, ['date', 'label', 'overdue', 'onTrack']],
    ['Correction trend', analytics.charts.correctionTrend, ['date', 'label', 'count']],
    ['Turnaround trend', analytics.charts.turnaroundTrend, ['date', 'label', 'avgHours', 'resolvedCount']],
    ['Rejection reasons', analytics.charts.rejectionReasons, ['reason', 'label', 'count']],
    ['Queue wait trend', analytics.charts.queueWaitTrend, ['date', 'label', 'avgWaitMinutes', 'tickets']],
  ];

  chartSections.forEach(([title, rows, columns]) => {
    if (!rows?.length) return;
    lines.push(buildCsvRow([title]));
    lines.push(buildCsvRow(columns));
    rows.forEach((row) => {
      lines.push(buildCsvRow(columns.map((column) => row[column])));
    });
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} instituteId
 * @param {import('./analytics.validator.js').analyticsFiltersSchema['_output']} query
 */
export async function getAdminDashboardAnalytics(instituteId, query = {}) {
  const filters = parseAnalyticsFilters(query, { allowStaffFilter: true });
  return cachedRead(cacheNs.ANALYTICS_ADMIN, [instituteId, filters], () =>
    loadAdminDashboardAnalytics(instituteId, filters),
  );
}

/**
 * @param {string} instituteId
 * @param {string} staffUserId
 * @param {import('./analytics.validator.js').analyticsFiltersSchema['_output']} query
 */
export async function getStaffDashboardAnalytics(instituteId, staffUserId, query = {}) {
  const filters = parseAnalyticsFilters(query, { allowStaffFilter: false });
  return cachedRead(cacheNs.ANALYTICS_STAFF, [instituteId, staffUserId, filters], () =>
    loadStaffDashboardAnalytics(instituteId, staffUserId, filters),
  );
}

/**
 * @param {string} instituteId
 * @param {import('./analytics.validator.js').analyticsExportSchema['_output']} query
 */
export async function exportAdminAnalytics(instituteId, query) {
  const analytics = await getAdminDashboardAnalytics(instituteId, query);
  if (query.format === 'json') {
    return { contentType: 'application/json', body: JSON.stringify({ analytics }, null, 2) };
  }
  return {
    contentType: 'text/csv; charset=utf-8',
    body: analyticsToCsv(analytics, 'admin'),
    filename: `admin-dashboard-${analytics.filters.from}-${analytics.filters.to}.csv`,
  };
}

/**
 * @param {string} instituteId
 * @param {string} staffUserId
 * @param {import('./analytics.validator.js').analyticsExportSchema['_output']} query
 */
export async function exportStaffAnalytics(instituteId, staffUserId, query) {
  const analytics = await getStaffDashboardAnalytics(instituteId, staffUserId, query);
  if (query.format === 'json') {
    return { contentType: 'application/json', body: JSON.stringify({ analytics }, null, 2) };
  }
  return {
    contentType: 'text/csv; charset=utf-8',
    body: analyticsToCsv(analytics, 'staff'),
    filename: `staff-dashboard-${analytics.filters.from}-${analytics.filters.to}.csv`,
  };
}
