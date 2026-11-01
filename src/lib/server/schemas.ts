import { z } from 'zod';

// Request schemas for the /api endpoints (moved from the Express controllers).

// Optional text field: blank counts as not given.
const optionalText = (max: number, min = 1) =>
  z.string()
    .trim()
    .max(max)
    .refine((v) => v === '' || v.length >= min, { message: `String must contain at least ${min} character(s)` })
    .optional()
    .transform((v) => v || undefined);

// ── auth ──
export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/, 'Must have 1 uppercase, 1 number, and 1 special character'),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  // Not needed to open an account (data minimisation), so optional at sign-up.
  vat_number: optionalText(20),
  identity_number: optionalText(20),
  address: optionalText(255, 5),
  employee_code: z.string().min(1).max(50).optional()
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1)
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

export const profileUpdateSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  email:           z.string().email().optional(),
  phone:           z.string().max(30).optional(),
  address:         z.string().max(200).optional(),
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/, 'Must have 1 uppercase, 1 number, and 1 special character').optional()
}).refine(
  data => !(data.newPassword && !data.currentPassword),
  { message: 'currentPassword is required when setting a new password', path: ['currentPassword'] }
);

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/, 'Must have 1 uppercase, 1 number, and 1 special character')
});


// ── flight ──
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
  total_seats: z.number().int().min(30).max(300),
  airplane: z.string().min(1).max(100),
  num_rows: z.number().int().min(1),
  seats_per_row: z.number().int().min(1).max(12),
  business_rows: z.number().int().min(0)
}).refine(data => data.business_rows < data.num_rows, {
  message: 'business_rows must be less than num_rows',
  path: ['business_rows']
});

export const flightStateSchema = z.object({
  state: z.enum(['staffed', 'completed', 'cancelled'])
});


// ── reservation ──
export const reservationCreateSchema = z.object({
  flight_id: z.number().int().positive(),
  // Economy seats are assigned by the server, so only business/normal bookings send a seat.
  seat_number: z.string().optional(),
  ticket_type: z.enum(['economy', 'normal', 'business'])
});

export const reservationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});


// ── user ──
export const userRoleSchema = z.object({
  role: z.enum(['visitor', 'customer', 'manager', 'admin'])
});

export const userListQuerySchema = z.object({
  role: z.enum(['visitor', 'customer', 'manager', 'admin']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().max(100).optional()
});

export const userImportSchema = z.object({
  users: z.array(z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/, 'Must have 1 uppercase, 1 number, and 1 special character'),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    identity_number: z.string().min(1).max(20),
    role: z.enum(['visitor', 'customer', 'manager', 'admin']).optional(),
    vat_number: z.string().optional(),
    address: z.string().max(255).optional(),
    employee_code: z.string().max(50).optional()
  })).min(1).max(500)
});

export const toggleActiveSchema = z.object({
  is_active: z.boolean()
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  action: z.string().max(50).optional()
});

