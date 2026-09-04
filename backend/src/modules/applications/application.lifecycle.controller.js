import { z } from 'zod';
import * as lifecycleService from './application.lifecycle.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

const noteSchema = z.object({
  note: z.string().max(500).optional(),
});

const rollbackSchema = z.object({
  targetStepId: z.string().min(1),
  note: z.string().max(1000).optional(),
  auditNote: z.string().max(500).optional(),
  correctionRequiredDocuments: z.array(z.string().min(1)).max(40).optional(),
});

const transferSchema = z.object({
  staffUserId: z.string().min(1),
  note: z.string().max(500).optional(),
});

export async function getAuditLog(req, res, next) {
  try {
    const result = await lifecycleService.getApplicationAuditLog(
      req.user.instituteId,
      req.params.id,
      req.user,
    );
    sendSuccess(res, 200, 'Application audit log', result);
  } catch (err) {
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const payload = noteSchema.parse(req.body ?? {});
    const application = await lifecycleService.cancelApplication(
      req.user.instituteId,
      req.params.id,
      req.user,
      payload.note,
    );
    sendSuccess(res, 200, 'Request cancelled', { application: { id: application._id.toString(), status: application.status } });
  } catch (err) {
    next(err);
  }
}

export async function reopen(req, res, next) {
  try {
    const payload = noteSchema.parse(req.body ?? {});
    const application = await lifecycleService.reopenApplication(
      req.user.instituteId,
      req.params.id,
      req.user,
      payload.note,
    );
    sendSuccess(res, 200, 'Request reopened', { application: { id: application._id.toString(), status: application.status } });
  } catch (err) {
    next(err);
  }
}

export async function transfer(req, res, next) {
  try {
    const payload = transferSchema.parse(req.body);
    const application = await lifecycleService.transferApplication(
      req.user.instituteId,
      req.params.id,
      payload.staffUserId,
      req.user,
      payload.note,
    );
    sendSuccess(res, 200, 'Request transferred', { application: { id: application._id.toString(), status: application.status } });
  } catch (err) {
    next(err);
  }
}

export async function escalate(req, res, next) {
  try {
    const payload = noteSchema.parse(req.body ?? {});
    const application = await lifecycleService.escalateApplication(
      req.user.instituteId,
      req.params.id,
      req.user,
      payload.note,
    );
    sendSuccess(res, 200, 'Request escalated', { application: { id: application._id.toString(), status: application.status } });
  } catch (err) {
    next(err);
  }
}

export async function claim(req, res, next) {
  try {
    const application = await lifecycleService.claimApplication(
      req.user.instituteId,
      req.params.id,
      req.user,
    );
    sendSuccess(res, 200, 'Request claimed', { application: { id: application._id.toString(), status: application.status } });
  } catch (err) {
    next(err);
  }
}

export async function listUnassigned(req, res, next) {
  try {
    const result = await lifecycleService.listUnassignedApplications(req.user.instituteId, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    sendSuccess(res, 200, 'Unassigned requests', result);
  } catch (err) {
    next(err);
  }
}

export async function rollback(req, res, next) {
  try {
    const payload = rollbackSchema.parse(req.body);
    const application = await lifecycleService.rollbackToStep(
      req.user.instituteId,
      req.params.id,
      payload.targetStepId,
      req.user,
      payload.note,
      payload.correctionRequiredDocuments,
      payload.auditNote,
    );
    sendSuccess(res, 200, 'Request rolled back', {
      application: { id: application._id.toString(), status: application.status },
    });
  } catch (err) {
    next(err);
  }
}

export async function withdraw(req, res, next) {
  try {
    const payload = noteSchema.parse(req.body ?? {});
    const application = await lifecycleService.withdrawApplication(
      req.user.instituteId,
      req.params.id,
      req.user,
      payload.note,
    );
    sendSuccess(res, 200, 'Request withdrawn', { application: { id: application._id.toString(), status: application.status } });
  } catch (err) {
    next(err);
  }
}
