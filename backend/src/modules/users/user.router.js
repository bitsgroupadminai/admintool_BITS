import { Router } from 'express';
import * as userController from './user.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { authorize } from '../../core/middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ROLES } from '../../shared/constants/roles.js';
import { studentImportUpload } from '../../core/config/upload.js';

const router = Router();

router.get('/staff-roles', requireAuth, userController.getStaffRoles);
router.get('/programmes', requireAuth, requireRole(ROLES.ADMIN), userController.listProgrammes);

router.use(requireAuth, requireRole(ROLES.ADMIN), authorize(PERMISSIONS.MANAGE_USERS));

router.get('/staff', userController.listStaff);
router.post('/staff', userController.createStaff);
router.patch('/staff/:id', userController.updateStaff);
router.delete('/staff/:id', userController.deactivateStaff);
router.get('/students', userController.listStudents);
router.post('/students', userController.createStudent);
router.patch('/students/:id', userController.updateStudent);
router.delete('/students/:id', userController.deactivateStudent);
router.post(
  '/students/import',
  studentImportUpload.single('file'),
  userController.importStudents,
);

export default router;
