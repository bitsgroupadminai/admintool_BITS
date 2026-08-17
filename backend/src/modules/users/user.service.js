import bcrypt from 'bcrypt';
import { read, utils } from 'xlsx';
import { User } from './user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { ROLES, STAFF_ROLES, getStaffRoleLabel } from '../../shared/constants/roles.js';
import { Offering } from '../offerings/offering.model.js';
import { Service } from '../services/service.model.js';
import { SYSTEM_SERVICE_KEYS } from '../../shared/constants/systemServices.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import {
  STUDENT_IMPORT_COLUMN_ALIASES,
  STUDENT_IMPORT_REQUIRED_FIELDS,
  STUDENT_SORT_FIELDS,
} from './user.constants.js';
import {
  getStaffRolesForInstitute,
  resolveStaffRole,
} from '../../shared/helpers/staffRole.helper.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { Institute } from '../institutes/institute.model.js';
import { notifyStaffAccountCreated } from '../../shared/templates/applicationEmails.js';
import { logger } from '../../core/logger/index.js';

const SALT_ROUNDS = 12;

function toPositiveInt(value, fallback, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/**
 * @param {string} instituteId
 */
export async function listStaffUsers(instituteId) {
  return cachedRead(cacheNs.USERS_STAFF_LIST, [instituteId], async () => {
  const users = await User.find({
    instituteId,
    role: ROLES.STAFF,
    isActive: true,
  })
    .select('name email staffRole createdAt')
    .sort({ createdAt: -1 });

  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    staffRole: u.staffRole,
    createdAt: u.createdAt,
  }));
  });
}

/**
 * @param {string} instituteId
 * @param {{ name: string, email: string, staffRole: string, password: string }} payload
 */
export async function createStaffUser(instituteId, payload) {
  const email = payload.email.toLowerCase();
  const staffRole = await resolveStaffRole(instituteId, payload.staffRole);

  const existing = await User.findOne({ email, instituteId });
  if (existing) {
    throw new AppError('A user with this email already exists in this institute', 409);
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const user = await User.create({
    name: payload.name,
    email,
    passwordHash,
    role: ROLES.STAFF,
    staffRole,
    instituteId,
  });

  await flushInstituteReadCache(instituteId);

  const institute = await Institute.findById(instituteId).select('name');
  notifyStaffAccountCreated({
    name: user.name,
    email: user.email,
    staffRoleLabel: getStaffRoleLabel(user.staffRole),
    password: payload.password,
    instituteName: institute?.name ?? 'Your institute',
  }).catch((err) => {
    logger.error({ err, email: user.email }, 'Staff welcome email failed');
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    staffRole: user.staffRole,
    createdAt: user.createdAt,
  };
}

/**
 * @param {string} staffId
 * @param {string} instituteId
 * @param {{ name?: string, email?: string, staffRole?: string, password?: string }} payload
 */
export async function updateStaffUser(staffId, instituteId, payload) {
  const user = await User.findOne({
    _id: staffId,
    instituteId,
    role: ROLES.STAFF,
    isActive: true,
  });

  if (!user) {
    throw new AppError('Staff user not found', 404);
  }

  if (payload.name) {
    user.name = payload.name;
  }

  if (payload.email) {
    const email = payload.email.toLowerCase();
    if (email !== user.email) {
      const existing = await User.findOne({ email, instituteId, _id: { $ne: user._id } });
      if (existing) {
        throw new AppError('A user with this email already exists in this institute', 409);
      }
      user.email = email;
    }
  }

  if (payload.staffRole) {
    user.staffRole = await resolveStaffRole(instituteId, payload.staffRole);
  }

  if (payload.password) {
    user.passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
  }

  await user.save();

  await flushInstituteReadCache(instituteId);
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    staffRole: user.staffRole,
    createdAt: user.createdAt,
  };
}

/**
 * @param {string} staffId
 * @param {string} instituteId
 */
export async function deactivateStaffUser(staffId, instituteId) {
  const user = await User.findOne({
    _id: staffId,
    instituteId,
    role: ROLES.STAFF,
  });

  if (!user) {
    throw new AppError('Staff user not found', 404);
  }

  user.isActive = false;
  await user.save();
  await flushInstituteReadCache(instituteId);
  return { id: user._id.toString() };
}

/**
 * @param {string} instituteId
 * @param {{
 *   page?: string,
 *   limit?: string,
 *   search?: string,
 *   programmeId?: string,
 *   programme?: string,
 *   status?: string,
 *   mustChangePassword?: string,
 *   sortBy?: string,
 *   sortOrder?: string,
 * }} [query]
 */
export async function listStudentUsers(instituteId, query = {}) {
  return cachedRead(cacheNs.USERS_STUDENTS_LIST, [instituteId, query], async () => {
  const page = toPositiveInt(query.page, 1, 10000);
  const limit = toPositiveInt(query.limit, 10, 100);
  const sortBy = STUDENT_SORT_FIELDS.has(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const filter = {
    instituteId,
    role: ROLES.STUDENT,
    isActive: true,
  };

  const search = query.search?.trim();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { enrolledProgrammeName: { $regex: search, $options: 'i' } },
    ];
  }

  if (query.programmeId) {
    filter.enrolledOfferingId = query.programmeId;
  }

  const programme = query.programme?.trim();
  if (programme) {
    filter.enrolledProgrammeName = { $regex: programme, $options: 'i' };
  }

  if (query.status) {
    filter.enrollmentStatus = query.status;
  }

  if (query.mustChangePassword === 'true') {
    filter.mustChangePassword = true;
  } else if (query.mustChangePassword === 'false') {
    filter.mustChangePassword = false;
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select(
      'name email enrolledOfferingId enrolledProgrammeName enrollmentStatus mustChangePassword createdAt',
    )
    .sort({ [sortBy]: sortOrder, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const offeringIds = users
    .map((u) => u.enrolledOfferingId)
    .filter(Boolean);
  const offerings = await Offering.find({ _id: { $in: offeringIds } }).select('name');
  const offeringMap = Object.fromEntries(offerings.map((o) => [o._id.toString(), o.name]));

  const students = users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    enrollmentStatus: u.enrollmentStatus ?? 'enrolled',
    programmeName:
      u.enrolledProgrammeName ||
      (u.enrolledOfferingId ? offeringMap[u.enrolledOfferingId.toString()] ?? null : null),
    mustChangePassword: Boolean(u.mustChangePassword),
    createdAt: u.createdAt,
  }));

  return {
    students,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
    filters: {
      search: search ?? '',
      programmeId: query.programmeId ?? '',
      programme: programme ?? '',
      status: query.status ?? '',
      mustChangePassword: query.mustChangePassword ?? '',
      sortBy,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
    },
  };
  });
}

/**
 * @param {string} instituteId
 */
export async function listEnrollmentProgrammes(instituteId) {
  return cachedRead(cacheNs.USERS_PROGRAMMES, [instituteId], async () => {
  const service = await Service.findOne({
    instituteId,
    systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
  });
  if (!service) return [];

  const offerings = await Offering.find({
    instituteId,
    serviceId: service._id,
    status: OFFERING_STATUS.ACTIVE,
  }).sort({ name: 1 });

  return offerings.map((o) => ({
    id: o._id.toString(),
    name: o.name,
  }));
  });
}

/**
 * @param {string} instituteId
 * @param {{ name: string, email: string, password: string, offeringId?: string, programmeName?: string }} payload
 */
export async function createStudentUser(instituteId, payload) {
  const email = payload.email.toLowerCase();
  const existing = await User.findOne({ email, instituteId });
  if (existing) {
    throw new AppError('A user with this email already exists in this institute', 409);
  }

  const service = await Service.findOne({
    instituteId,
    systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
  });
  if (!service) {
    throw new AppError('Enrollment service is not configured', 400);
  }

  const offering = await resolveEnrollmentOffering(service._id, instituteId, payload);
  const programmeName = offering?.name || payload.programmeName?.trim();
  if (!programmeName) {
    throw new AppError('Programme name is required', 400);
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const user = await User.create({
    name: payload.name,
    email,
    passwordHash,
    role: ROLES.STUDENT,
    instituteId,
    enrolledOfferingId: offering?._id,
    enrolledProgrammeName: programmeName,
    enrollmentStatus: 'enrolled',
    mustChangePassword: true,
  });

  await flushInstituteReadCache(instituteId);
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    programmeName,
    enrollmentStatus: user.enrollmentStatus,
    mustChangePassword: true,
    createdAt: user.createdAt,
  };
}

/**
 * @param {Buffer} buffer
 * @param {string} originalName
 */
function parseStudentImportRows(buffer, originalName) {
  const extension = originalName.split('.').pop()?.toLowerCase();
  const workbook = read(buffer, {
    type: 'buffer',
    raw: false,
    cellDates: false,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new AppError('Import file does not contain a readable sheet', 400);
  }

  const rows = utils.sheet_to_json(sheet, {
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new AppError(`${extension?.toUpperCase() || 'Import'} file has no student rows`, 400);
  }

  return rows.map((row, index) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.toString().trim().toLowerCase().replace(/\s+/g, '');
      normalized[normalizedKey] = typeof value === 'string' ? value.trim() : String(value).trim();
    }

    const readAlias = (field) => {
      for (const alias of STUDENT_IMPORT_COLUMN_ALIASES[field]) {
        if (normalized[alias]) return normalized[alias];
      }
      return '';
    };

    return {
      row: index + 2,
      name: readAlias('name'),
      email: readAlias('email'),
      password: readAlias('password'),
      offeringId: readAlias('offeringId'),
      programmeName: readAlias('programmeName'),
    };
  });
}

/**
 * @param {string} instituteId
 * @param {{ buffer: Buffer, originalname: string }} file
 */
export async function importStudentUsers(instituteId, file) {
  if (!file?.buffer) {
    throw new AppError('Upload a CSV or XLSX file to import students', 400);
  }

  const rows = parseStudentImportRows(file.buffer, file.originalname);
  const results = [];
  let created = 0;
  let failed = 0;

  for (const row of rows) {
    const missing = STUDENT_IMPORT_REQUIRED_FIELDS.filter((field) => {
      if (field === 'programmeName') return !row.programmeName && !row.offeringId;
      return !row[field];
    });
    if (missing.length > 0) {
      failed += 1;
      results.push({
        row: row.row,
        email: row.email,
        status: 'failed',
        message: `Missing ${missing.join(', ')}`,
      });
      continue;
    }

    try {
      const student = await createStudentUser(instituteId, {
        name: row.name,
        email: row.email,
        password: row.password,
        offeringId: row.offeringId,
        programmeName: row.programmeName,
      });
      created += 1;
      results.push({
        row: row.row,
        email: student.email,
        status: 'created',
        message: 'Student account created',
        student,
      });
    } catch (err) {
      failed += 1;
      results.push({
        row: row.row,
        email: row.email,
        status: 'failed',
        message: err.message || 'Failed to create student',
      });
    }
  }

  await flushInstituteReadCache(instituteId);
  return {
    total: rows.length,
    created,
    failed,
    results,
  };
}

/**
 * @param {string} studentId
 * @param {string} instituteId
 * @param {{ name?: string, email?: string, password?: string, offeringId?: string, programmeName?: string }} payload
 */
export async function updateStudentUser(studentId, instituteId, payload) {
  const user = await User.findOne({
    _id: studentId,
    instituteId,
    role: ROLES.STUDENT,
    isActive: true,
  }).select('+passwordHash');

  if (!user) {
    throw new AppError('Student user not found', 404);
  }

  if (payload.name) user.name = payload.name;

  if (payload.email) {
    const email = payload.email.toLowerCase();
    if (email !== user.email) {
      const existing = await User.findOne({ email, instituteId, _id: { $ne: user._id } });
      if (existing) {
        throw new AppError('A user with this email already exists in this institute', 409);
      }
      user.email = email;
    }
  }

  if (payload.password) {
    user.passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
    user.mustChangePassword = true;
  }

  if (payload.offeringId !== undefined || payload.programmeName !== undefined) {
    const service = await Service.findOne({
      instituteId,
      systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
    });
    if (!service) {
      throw new AppError('Enrollment service is not configured', 400);
    }
    const offering = await resolveEnrollmentOffering(service._id, instituteId, payload);
    const programmeName = offering?.name || payload.programmeName?.trim();
    if (!programmeName) {
      throw new AppError('Programme name is required', 400);
    }
    user.enrolledOfferingId = offering?._id ?? undefined;
    user.enrolledProgrammeName = programmeName;
  }

  await user.save();

  await flushInstituteReadCache(instituteId);
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    programmeName: user.enrolledProgrammeName,
    enrollmentStatus: user.enrollmentStatus,
    mustChangePassword: Boolean(user.mustChangePassword),
    createdAt: user.createdAt,
  };
}

/**
 * @param {string} studentId
 * @param {string} instituteId
 */
export async function deactivateStudentUser(studentId, instituteId) {
  const user = await User.findOne({
    _id: studentId,
    instituteId,
    role: ROLES.STUDENT,
    isActive: true,
  });

  if (!user) {
    throw new AppError('Student user not found', 404);
  }

  user.isActive = false;
  await user.save();
  await flushInstituteReadCache(instituteId);
  return { id: user._id.toString() };
}

async function resolveEnrollmentOffering(serviceId, instituteId, payload) {
  if (payload.offeringId) {
    const offering = await Offering.findOne({
      _id: payload.offeringId,
      instituteId,
      serviceId,
      status: OFFERING_STATUS.ACTIVE,
    });
    if (!offering) {
      throw new AppError('Programme offering not found', 404);
    }
    return offering;
  }

  const programmeName = payload.programmeName?.trim();
  if (!programmeName) return null;

  return Offering.findOne({
    instituteId,
    serviceId,
    status: OFFERING_STATUS.ACTIVE,
    name: { $regex: `^${escapeRegex(programmeName)}$`, $options: 'i' },
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} instituteId
 */
export async function getAvailableStaffRoles(instituteId) {
  return cachedRead(cacheNs.USERS_STAFF_ROLES, [instituteId], async () => {
  const customRoles = await getStaffRolesForInstitute(instituteId);
  const custom = customRoles.map((label) => ({
    value: label,
    label,
    isCustom: true,
  }));

  return [...STAFF_ROLES, ...custom];
  });
}
