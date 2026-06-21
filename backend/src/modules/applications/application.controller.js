import * as applicationService from './application.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import {
  assignApplicationSchema,
  listApplicationsQuerySchema,
  slaActionSchema,
  updateApplicationStatusSchema,
  workflowActionSchema,
} from './application.validator.js';
import { AppError } from '../../core/utils/AppError.js';

export async function list(req, res, next) {
  try {
    const query = listApplicationsQuerySchema.parse(req.query);
    const result = await applicationService.listApplications(req.user.instituteId, query);
    sendSuccess(res, 200, 'Applications', result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const application = await applicationService.getApplicationDetail(
      req.user.instituteId,
      req.params.id,
      req.user,
    );
    sendSuccess(res, 200, 'Application detail', { application });
  } catch (err) {
    next(err);
  }
}

export async function workflowAction(req, res, next) {
  try {
    const payload = workflowActionSchema.parse(req.body);
    const application = await applicationService.performApplicationWorkflowAction(
      req.user.instituteId,
      req.params.id,
      req.user,
      payload,
    );
    sendSuccess(res, 200, 'Workflow action applied', { application });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const payload = updateApplicationStatusSchema.parse(req.body);
    const application = await applicationService.updateApplicationStatus(
      req.user.instituteId,
      req.params.id,
      payload.status,
      req.user,
    );
    sendSuccess(res, 200, 'Application status updated', { application });
  } catch (err) {
    next(err);
  }
}

export async function assign(req, res, next) {
  try {
    const payload = assignApplicationSchema.parse(req.body);
    const application = await applicationService.assignApplication(
      req.user.instituteId,
      req.params.id,
      payload.staffUserId,
      req.user,
    );
    sendSuccess(res, 200, 'Request assigned', { application });
  } catch (err) {
    next(err);
  }
}

export async function slaAction(req, res, next) {
  try {
    const payload = slaActionSchema.parse(req.body);
    const application = await applicationService.respondToSlaBreach(
      req.user.instituteId,
      req.params.id,
      payload,
      req.user,
    );
    sendSuccess(res, 200, 'SLA action applied', { application });
  } catch (err) {
    next(err);
  }
}

export async function streamDocument(req, res, next) {
  try {
    await applicationService.streamAdminApplicationDocument(
      req.user.instituteId,
      req.params.id,
      req.params.documentId,
      res,
      { download: req.query.download === '1' },
    );
  } catch (err) {
    if (err instanceof AppError && !res.headersSent) {
      next(err);
      return;
    }
    if (!res.headersSent) {
      next(err);
    }
  }
}

export async function listAssigned(req, res, next) {
  try {
    const query = listApplicationsQuerySchema.parse(req.query);
    const result = await applicationService.listAssignedApplications(
      req.user.instituteId,
      req.user.userId,
      query,
    );
    sendSuccess(res, 200, 'Assigned applications', result);
  } catch (err) {
    next(err);
  }
}

export async function getAssignedSummary(req, res, next) {
  try {
    const summary = await applicationService.getStaffAssignmentSummary(
      req.user.instituteId,
      req.user.userId,
    );
    sendSuccess(res, 200, 'Assigned request summary', { summary });
  } catch (err) {
    next(err);
  }
}

export async function getAssignedById(req, res, next) {
  try {
    const application = await applicationService.getAssignedApplicationDetail(
      req.user.instituteId,
      req.params.id,
      req.user.userId,
      req.user,
    );
    sendSuccess(res, 200, 'Assigned application detail', { application });
  } catch (err) {
    next(err);
  }
}

export async function assignedWorkflowAction(req, res, next) {
  try {
    const payload = workflowActionSchema.parse(req.body);
    const application = await applicationService.performAssignedApplicationWorkflowAction(
      req.user.instituteId,
      req.params.id,
      req.user.userId,
      req.user,
      payload,
    );
    sendSuccess(res, 200, 'Workflow action applied', { application });
  } catch (err) {
    next(err);
  }
}

export async function updateAssignedStatus(req, res, next) {
  try {
    const payload = updateApplicationStatusSchema.parse(req.body);
    const application = await applicationService.updateAssignedApplicationStatus(
      req.user.instituteId,
      req.params.id,
      req.user.userId,
      payload.status,
      req.user,
    );
    sendSuccess(res, 200, 'Application status updated', { application });
  } catch (err) {
    next(err);
  }
}

export async function assignedSlaAction(req, res, next) {
  try {
    const payload = slaActionSchema.parse(req.body);
    const application = await applicationService.respondToAssignedSlaBreach(
      req.user.instituteId,
      req.params.id,
      req.user.userId,
      payload,
      req.user,
    );
    sendSuccess(res, 200, 'SLA action applied', { application });
  } catch (err) {
    next(err);
  }
}

export async function streamAssignedDocument(req, res, next) {
  try {
    await applicationService.streamAssignedApplicationDocument(
      req.user.instituteId,
      req.params.id,
      req.user.userId,
      req.params.documentId,
      res,
      { download: req.query.download === '1' },
    );
  } catch (err) {
    if (err instanceof AppError && !res.headersSent) {
      next(err);
      return;
    }
    if (!res.headersSent) {
      next(err);
    }
  }
}
