import { Application } from '../../modules/applications/application.model.js';
import { User } from '../../modules/users/user.model.js';
import { ROLES } from '../constants/roles.js';
import { HANDLER_TYPE } from '../enums/workflow.enums.js';
import { APPLICATION_STATUS } from '../enums/application.enums.js';
import { readAutoAssignmentConfig } from '../../modules/institutes/institute.settings.service.js';

/**
 * Pick the active staff member with the fewest open assigned requests.
 * @param {string} instituteId
 * @param {string} [staffRole]
 */
async function findLeastLoadedStaff(instituteId, staffRole) {
  const filter = {
    instituteId,
    role: ROLES.STAFF,
    isActive: true,
  };

  if (staffRole && staffRole !== 'general') {
    filter.staffRole = staffRole;
  }

  let staffMembers = await User.find(filter).select('_id name email staffRole');
  if (!staffMembers.length && staffRole && staffRole !== 'general') {
    staffMembers = await User.find({
      instituteId,
      role: ROLES.STAFF,
      isActive: true,
      staffRole: 'general',
    }).select('_id name email staffRole');
  }

  if (!staffMembers.length) return null;

  const loads = await Promise.all(
    staffMembers.map(async (staff) => {
      const openCount = await Application.countDocuments({
        instituteId,
        assignedTo: staff._id,
        status: { $in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.IN_REVIEW] },
      });
      return { staff, openCount };
    }),
  );

  loads.sort((a, b) => a.openCount - b.openCount);
  return loads[0].staff;
}

/**
 * Auto-assign a request when it reaches a staff workflow step.
 * @param {import('../../modules/applications/application.model.js').Application} application
 * @param {Object | null} step
 * @param {string} instituteId
 */
export async function autoAssignApplicationToStaff(application, step, instituteId) {
  if (!step || step.handledBy?.type !== HANDLER_TYPE.STAFF) {
    return null;
  }

  const config = await readAutoAssignmentConfig(instituteId);
  if (!config.enabled) {
    return null;
  }

  if (application.assignedTo) {
    return null;
  }

  const staff = await findLeastLoadedStaff(
    instituteId,
    step.handledBy.assignee ?? 'general',
  );

  if (!staff) {
    return null;
  }

  application.assignedTo = staff._id;
  application.assignedAt = new Date();
  application.autoAssignedAt = new Date();

  return staff;
}

/**
 * Reassign a breached request to another active staff member with the lowest load.
 * @param {import('../../modules/applications/application.model.js').Application} application
 * @param {Object | null} step
 * @param {string} instituteId
 * @param {string | null} [excludeStaffId]
 */
export async function reassignApplicationToStaff(application, step, instituteId, excludeStaffId = null) {
  if (!step || step.handledBy?.type !== HANDLER_TYPE.STAFF) {
    return null;
  }

  const staffRole = step.handledBy.assignee ?? 'general';
  const filter = {
    instituteId,
    role: ROLES.STAFF,
    isActive: true,
  };

  if (staffRole && staffRole !== 'general') {
    filter.staffRole = staffRole;
  }

  let staffMembers = await User.find(filter).select('_id name email staffRole');
  if (!staffMembers.length && staffRole && staffRole !== 'general') {
    staffMembers = await User.find({
      instituteId,
      role: ROLES.STAFF,
      isActive: true,
      staffRole: 'general',
    }).select('_id name email staffRole');
  }

  if (excludeStaffId) {
    staffMembers = staffMembers.filter((staff) => staff._id.toString() !== excludeStaffId);
  }

  if (!staffMembers.length) {
    return null;
  }

  const loads = await Promise.all(
    staffMembers.map(async (staff) => {
      const openCount = await Application.countDocuments({
        instituteId,
        assignedTo: staff._id,
        status: { $in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.IN_REVIEW] },
      });
      return { staff, openCount };
    }),
  );

  loads.sort((a, b) => a.openCount - b.openCount);
  const staff = loads[0].staff;

  application.assignedTo = staff._id;
  application.assignedAt = new Date();
  application.autoAssignedAt = new Date();

  return staff;
}
