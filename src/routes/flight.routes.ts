import { Router } from 'express';
import { flightController } from '../controllers/flight.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, validateQuery, validateParam } from '../middleware/validate.js';
import { flightCreateSchema, flightStateSchema, flightSearchSchema } from '../controllers/flight.controller.js';
import { csrfProtect } from '../middleware/csrf.js';

const router = Router();

router.get('/', validateQuery(flightSearchSchema), flightController.list);
router.get('/:id', validateParam, flightController.get);
router.get('/:id/seats', validateParam, flightController.getSeats);

router.post(
  '/',
  authenticate,
  requireRole('manager', 'admin'),
  csrfProtect,
  validate(flightCreateSchema),
  flightController.create
);

router.patch(
  '/:id/state',
  authenticate,
  requireRole('manager', 'admin'),
  validateParam,
  csrfProtect,
  validate(flightStateSchema),
  flightController.updateState
);

router.delete(
  '/:id',
  authenticate,
  requireRole('manager', 'admin'),
  validateParam,
  csrfProtect,
  flightController.delete
);

export default router;
