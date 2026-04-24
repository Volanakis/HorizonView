import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, profileUpdateSchema } from '../controllers/auth.controller.js';
import { loginLimiter, registerLimiter, refreshLimiter } from '../middleware/rate-limit.js';
import { csrfProtect } from '../middleware/csrf.js';
import { validateRegistrationExternal } from '../middleware/validate-external.js';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), validateRegistrationExternal, authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', authenticate, csrfProtect, authController.logout);
router.post('/refresh', refreshLimiter, csrfProtect, authController.refresh);
router.get('/me', authenticate, authController.me);
router.patch('/profile', authenticate, csrfProtect, validate(profileUpdateSchema), authController.updateProfile);

export default router;
