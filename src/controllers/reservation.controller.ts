import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { reservationService } from '../services/reservation.service.js';
import { TicketType } from '../types/index.js';

export const reservationCreateSchema = z.object({
  flight_id: z.number().int().positive(),
  seat_number: z.string(),
  ticket_type: z.enum(['economy', 'normal', 'business'])
});

export const reservationController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const reservations = reservationService.getByUser(req.user!.userId);

    res.json({
      success: true,
      data: reservations
    });
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    const { flight_id, seat_number, ticket_type } = req.body as {
      flight_id: number;
      seat_number: string;
      ticket_type: TicketType;
    };

    const result = reservationService.create({
      user_id: req.user!.userId,
      flight_id,
      seat_number,
      ticket_type
    });

    if (!result.success) {
      if (result.error === 'Seat is already taken') {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: result.error }
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: result.error }
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: { reservation: result.reservation }
    });
  },

  async cancel(req: AuthRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const result = reservationService.cancel(id, req.user!.userId);

    if (!result.success) {
      if (result.error === 'Unauthorized') {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: result.error }
        });
        return;
      }

      if (result.error === 'Reservation not found') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: result.error }
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: result.error }
      });
      return;
    }

    res.status(204).send();
  }
};