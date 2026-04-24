import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { userService } from '../services/user.service.js';
import { UserRole } from '../types/index.js';

export const userRoleSchema = z.object({
  role: z.enum(['visitor', 'customer', 'manager', 'admin'])
});

export const userListQuerySchema = z.object({
  role: z.enum(['visitor', 'customer', 'manager', 'admin']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional()
});

export const userImportSchema = z.object({
  users: z.array(z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Must have 1 uppercase and 1 number'),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    role: z.enum(['visitor', 'customer', 'manager', 'admin']).optional(),
    vat_number: z.string().optional()
  })).min(1).max(500)
});

export const userController = {
  list(req: AuthRequest, res: Response): void {
    const filters = {
      role: req.query.role as UserRole | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    };

    const { users, total } = userService.list(filters);
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  },

  updateRole(req: AuthRequest, res: Response): void {
    const id = Number(req.params.id);
    const { role } = req.body as { role: UserRole };

    // Prevent admins from demoting themselves
    if (req.user!.userId === id) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Cannot change your own role' }
      });
      return;
    }

    const result = userService.updateRole(id, role, req.user!.userId);
    if (!result.success) {
      res.status(result.error === 'User not found' ? 404 : 400).json({
        success: false,
        error: { code: result.error === 'User not found' ? 'NOT_FOUND' : 'BAD_REQUEST', message: result.error }
      });
      return;
    }

    res.json({ success: true, data: { id, role } });
  },

  async import(req: AuthRequest, res: Response): Promise<void> {
    const { users } = req.body as { users: { username: string; name: string; email: string; password: string; role?: UserRole; vat_number?: string }[] };
    const result = await userService.bulkImport(users, req.user!.userId);
    res.status(207).json({ success: true, data: result });
  }
};
