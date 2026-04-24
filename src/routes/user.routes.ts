import { Router } from 'express';
import { userController, userRoleSchema, userListQuerySchema, userImportSchema } from '../controllers/user.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, validateQuery, validateParam } from '../middleware/validate.js';
import { csrfProtect } from '../middleware/csrf.js';

const router = Router();

// All user management endpoints require admin role
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  validateQuery(userListQuerySchema),
  userController.list
);

router.patch(
  '/:id/role',
  authenticate,
  requireRole('admin'),
  validateParam,
  csrfProtect,
  validate(userRoleSchema),
  userController.updateRole
);

router.post(
  '/import',
  authenticate,
  requireRole('admin'),
  csrfProtect,
  validate(userImportSchema),
  userController.import
);

export default router;
