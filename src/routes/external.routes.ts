import { Router } from 'express';
import { externalController } from '../controllers/external.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Airport congestion check — managers/admins only
router.get(
  '/airport-status',
  authenticate,
  requireRole('manager', 'admin'),
  externalController.airportStatus
);

// Weather — public
router.get('/weather', externalController.weather);

// Exchange rates — public
router.get('/exchange-rates', externalController.exchangeRates);

// Language detection — public
router.get('/detect-language', externalController.detectLanguage);

export default router;
