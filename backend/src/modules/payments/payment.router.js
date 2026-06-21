import { Router } from 'express';
import * as paymentController from './payment.controller.js';

const router = Router({ mergeParams: true });

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verify);

export default router;
