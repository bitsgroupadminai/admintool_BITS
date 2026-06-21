import * as paymentService from './payment.service.js';
import { verifyPaymentSchema } from './payment.validator.js';

export async function createOrder(req, res, next) {
  try {
    const { serviceId, offeringId } = req.params;
    const order = await paymentService.createServicePaymentOrder(
      req.user.instituteId,
      req.user,
      serviceId,
      offeringId,
    );
    res.json({ success: true, message: 'Payment order created', data: order });
  } catch (error) {
    next(error);
  }
}

export async function verify(req, res, next) {
  try {
    const payload = verifyPaymentSchema.parse(req.body);
    const { serviceId, offeringId } = req.params;
    const result = await paymentService.verifyServicePayment(
      req.user.instituteId,
      req.user,
      serviceId,
      offeringId,
      payload,
    );
    res.json({ success: true, message: 'Payment verified', data: result });
  } catch (error) {
    next(error);
  }
}
