import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './core/config/env.js';
import { logger } from './core/logger/index.js';
import { globalErrorHandler } from './core/middlewares/globalErrorHandler.js';
import authRouter from './modules/auth/auth.router.js';
import instituteRouter from './modules/institutes/institute.router.js';
import userRouter from './modules/users/user.router.js';
import serviceRouter from './modules/services/service.router.js';
import offeringRouter from './modules/offerings/offering.router.js';
import knowledgeDocumentRouter from './modules/knowledge-documents/knowledgeDocument.router.js';

const app = express();

app.use(
  pinoHttp({
    logger,
    autoLogging: env.NODE_ENV !== 'test',
  }),
);

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
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

app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/institutes', instituteRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/services', serviceRouter);
app.use('/api/v1/services/:serviceId/knowledge-documents', knowledgeDocumentRouter);
app.use('/api/v1/offerings', offeringRouter);

app.use(globalErrorHandler);

export default app;
