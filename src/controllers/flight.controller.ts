import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { flightService } from '../services/flight.service.js';
import { FlightState } from '../types/index.js';

export const flightSearchSchema = z.object({
  from: z.string().length(3).optional(),
  to: z.string().length(3).optional(),
  date: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional()
});

export const flightCreateSchema = z.object({
  flight_number: z.string().min(1).max(10),
  departure: z.string().length(3),
  arrival: z.string().length(3),
  scheduled_time: z.string().datetime(),
  total_seats: z.number().int().min(30).max(300)
});

export const flightStateSchema = z.object({
  state: z.enum(['staffed', 'completed', 'cancelled'])
});

export const flightController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const isStaff = req.user?.role === 'manager' || req.user?.role === 'admin';

    const filters = {
      from:   req.query.from  as string | undefined,
      to:     req.query.to    as string | undefined,
      date:   req.query.date  as string | undefined,
      page:   req.query.page  ? Number(req.query.page)  : undefined,
      limit:  req.query.limit ? Number(req.query.limit) : undefined,
      // Customers and guests only see bookable flights; managers/admins see all
      states: isStaff ? undefined : (['created'] as FlightState[])
    };

    const { flights, total } = flightService.getAll(filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    res.json({
      success: true,
      data: flights,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  },

  async get(req: AuthRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const flight = flightService.getById(id);

    if (!flight) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Flight not found' }
      });
      return;
    }

    res.json({
      success: true,
      data: flight
    });
  },

  async getSeats(req: AuthRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const flight = flightService.getById(id);

    if (!flight) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Flight not found' }
      });
      return;
    }

    const seats = flightService.getSeats(id);

    res.json({
      success: true,
      data: {
        flight_id: id,
        seats: seats.map(s => ({
          number: s.seat_number,
          class: s.class,
          price: s.price,
          status: s.is_available ? 'available' : 'reserved'
        }))
      }
    });
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    const { flight_number, departure, arrival, scheduled_time, total_seats } = req.body as {
      flight_number: string;
      departure: string;
      arrival: string;
      scheduled_time: string;
      total_seats: number;
    };
    const flight = flightService.create({
      flight_number,
      departure,
      arrival,
      scheduled_time,
      total_seats,
      created_by: req.user!.userId
    });

    res.status(201).json({
      success: true,
      data: flight
    });
  },

  async updateState(req: AuthRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const { state } = req.body as { state: FlightState };

    const result = flightService.updateState(id, state, req.user!.userId);

    if (!result.success) {
      res.status(422).json({
        success: false,
        error: { code: 'INVALID_STATE', message: result.error }
      });
      return;
    }

    res.json({
      success: true,
      data: { id, state }
    });
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const result = flightService.delete(id, req.user!.userId);

    if (!result.success) {
      const isNotFound = result.error === 'Flight not found';
      res.status(isNotFound ? 404 : 422).json({
        success: false,
        error: { code: isNotFound ? 'NOT_FOUND' : 'DELETE_FAILED', message: result.error }
      });
      return;
    }

    res.status(204).send();
  }
};