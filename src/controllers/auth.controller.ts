import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, generateTokens, verifyToken } from '../middleware/auth.js';
import { authService } from '../services/auth.service.js';

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Must have 1 uppercase and 1 number'),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  vat_number: z.string().optional()
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

export const profileUpdateSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  email:           z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Must have 1 uppercase and 1 number').optional()
}).refine(
  data => !(data.newPassword && !data.currentPassword),
  { message: 'currentPassword is required when setting a new password', path: ['currentPassword'] }
);

const COOKIE_CLEAR_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  expires: new Date(0)
};

export const authController = {
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
          }
        }
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'Username or email already exists' }
        });
        return;
      }
      throw error;
    }
  },

  async login(req: AuthRequest, res: Response): Promise<void> {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const user = await authService.login(username, password, ipAddress);

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
      });
      return;
    }

    const payload = { userId: user.id, username: user.username, role: user.role };
    const { accessToken, refreshToken } = generateTokens(payload);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);

    try {
      authService.saveRefreshToken(user.id, refreshToken, refreshExpiry, ipAddress);
    } catch {
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to persist session' } });
      return;
    }

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      }
    });
  },

  logout(req: AuthRequest, res: Response): void {
    if (req.user) {
      authService.revokeAllUserTokens(req.user.userId);
    }

    res.cookie('access_token', '', COOKIE_CLEAR_OPTS);
    res.cookie('refresh_token', '', COOKIE_CLEAR_OPTS);

    res.status(204).send();
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token;

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No refresh token' }
      });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.cookie('access_token', '', COOKIE_CLEAR_OPTS);
      res.cookie('refresh_token', '', COOKIE_CLEAR_OPTS);
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' }
      });
      return;
    }

    const { valid } = authService.validateRefreshToken(token, payload.userId);
    if (!valid) {
      // Possible token reuse — revoke all tokens for safety
      authService.revokeAllUserTokens(payload.userId);
      res.cookie('access_token', '', COOKIE_CLEAR_OPTS);
      res.cookie('refresh_token', '', COOKIE_CLEAR_OPTS);
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Refresh token invalid or already used' }
      });
      return;
    }

    const newPayload = { userId: payload.userId, username: payload.username, role: payload.role };
    const { accessToken, refreshToken } = generateTokens(newPayload);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);
    const ipAddress = req.ip || req.socket.remoteAddress;
    try {
      authService.saveRefreshToken(payload.userId, refreshToken, refreshExpiry, ipAddress);
    } catch {
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to persist session' } });
      return;
    }

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const
    };

    res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ success: true });
  },

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const result = await authService.updateProfile(req.user!.userId, req.body);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
      return;
    }
    const user = await authService.getUserById(req.user!.userId);
    res.json({ success: true, data: user });
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' }
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  }
};