import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, validateParam } from '../middleware/validate.js';
import { reservationCreateSchema } from '../controllers/reservation.controller.js';
import { csrfProtect } from '../middleware/csrf.js';

const router = Router();

router.get('/', authenticate, requireRole('customer', 'manager', 'admin'), reservationController.list);
router.post('/', authenticate, requireRole('customer', 'manager', 'admin'), csrfProtect, validate(reservationCreateSchema), reservationController.create);
router.delete('/:id', authenticate, requireRole('customer', 'manager', 'admin'), validateParam, csrfProtect, reservationController.cancel);

export default router;
