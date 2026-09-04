import * as paymentAdminService from './payment.admin.service.js';
import { listAdminPaymentsQuerySchema } from './payment.admin.validator.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export async function getOverview(req, res, next) {
  try {
    const overview = await paymentAdminService.getAdminPaymentOverview(req.user.instituteId);
    sendSuccess(res, 200, 'Payment overview', overview);
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const query = listAdminPaymentsQuerySchema.parse(req.query);
    const result = await paymentAdminService.listAdminPayments(req.user.instituteId, query);
    sendSuccess(res, 200, 'Payments', result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const result = await paymentAdminService.getAdminPaymentDetail(
      req.user.instituteId,
      req.params.id,
    );
    sendSuccess(res, 200, 'Payment detail', result);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await paymentAdminService.deleteAdminPayment(
      req.user.instituteId,
      req.params.id,
    );
    sendSuccess(res, 200, 'Payment deleted', result);
  } catch (error) {
    next(error);
  }
}
