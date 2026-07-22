import { Router } from 'express';
import * as erpController from './erp.controller.js';
import { requireErpApiKey } from './erp.middleware.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { requireSetupComplete } from '../../core/middlewares/requireSetupComplete.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

/** Admin session-authed management of the ERP integration. */
const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(ROLES.ADMIN), requireSetupComplete);

adminRouter.get('/', erpController.getStatus);
adminRouter.post('/api-key', erpController.rotateApiKey);
adminRouter.delete('/api-key', erpController.revokeApiKey);

/** API-key-authed machine-to-machine sync feed. */
const apiRouter = Router();

apiRouter.use(requireErpApiKey);

apiRouter.get('/applications', erpController.listApplications);
apiRouter.get('/applications/:id', erpController.getApplication);

export { adminRouter as default, apiRouter };
