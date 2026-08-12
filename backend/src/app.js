import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env, isAllowedOrigin } from './core/config/env.js';
import { logger } from './core/logger/index.js';
import { globalErrorHandler } from './core/middlewares/globalErrorHandler.js';
import { notFoundHandler } from './core/middlewares/notFoundHandler.js';
import authRouter from './modules/auth/auth.router.js';
import instituteRouter from './modules/institutes/institute.router.js';
import userRouter from './modules/users/user.router.js';
import serviceRouter from './modules/services/service.router.js';
import offeringRouter from './modules/offerings/offering.router.js';
import knowledgeDocumentRouter from './modules/knowledge-documents/knowledgeDocument.router.js';
import studentRouter from './modules/student/student.router.js';
import applicationRouter, { staffRouter as staffApplicationRouter } from './modules/applications/application.router.js';
import notificationRouter from './modules/notifications/notification.router.js';
import analyticsRouter from './modules/analytics/analytics.router.js';
import queueRouter, {
  staffRouter as staffQueueRouter,
  adminRouter as adminQueueRouter,
} from './modules/queue/queue.router.js';
import appointmentRouter, {
  staffRouter as staffAppointmentRouter,
  adminRouter as adminAppointmentRouter,
} from './modules/appointments/appointment.router.js';
import chatRouter from './modules/chat/chat.router.js';
import enrollmentIntakeRouter, {
  staffRouter as staffEnrollmentIntakeRouter,
} from './modules/enrollment-intakes/enrollment-intake.router.js';
import adminPaymentRouter from './modules/payments/payment.admin.router.js';
import exportRouter from './modules/exports/export.router.js';
import erpAdminRouter, { apiRouter as erpApiRouter } from './modules/erp-sync/erp.router.js';
import monitoringRouter from './modules/monitoring/monitoring.router.js';
import { httpMetricsMiddleware } from './modules/monitoring/metrics.js';
import { readiness, metrics } from './modules/monitoring/monitoring.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../uploads');

const app = express();

// Railway / reverse proxies terminate TLS; required for secure cookies.
app.set('trust proxy', 1);

app.use(
  pinoHttp({
    logger,
    autoLogging: env.NODE_ENV !== 'test',
  }),
);

app.use(httpMetricsMiddleware);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    errors: [],
  },
});

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'OK', data: { status: 'healthy' } });
});

app.get('/api/v1/health/ready', readiness);

app.get('/metrics', metrics);

app.use('/uploads', express.static(uploadsDir));

app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/institutes', instituteRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/services', serviceRouter);
app.use('/api/v1/services/:serviceId/knowledge-documents', knowledgeDocumentRouter);
app.use('/api/v1/offerings', offeringRouter);
app.use('/api/v1/student', studentRouter);
app.use('/api/v1/applications', applicationRouter);
app.use('/api/v1/admin/payments', adminPaymentRouter);
app.use('/api/v1/enrollment-intakes', enrollmentIntakeRouter);
app.use('/api/v1/staff/enrollment-intakes', staffEnrollmentIntakeRouter);
app.use('/api/v1/staff/applications', staffApplicationRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/student/queue', queueRouter);
app.use('/api/v1/staff/queue', staffQueueRouter);
app.use('/api/v1/admin/queue', adminQueueRouter);
app.use('/api/v1/student/appointments', appointmentRouter);
app.use('/api/v1/staff/appointments', staffAppointmentRouter);
app.use('/api/v1/admin/appointments', adminAppointmentRouter);
app.use('/api/v1/student/services/:serviceId/chat', chatRouter);
app.use('/api/v1/exports', exportRouter);
app.use('/api/v1/admin/erp', erpAdminRouter);
app.use('/api/v1/erp', erpApiRouter);
app.use('/api/v1/monitoring', monitoringRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
