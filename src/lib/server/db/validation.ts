import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  name: z.string(),
  vat_number: z.string().nullable(),
  identity_number: z.string(),
  is_active: z.number(),
  address: z.string().nullable(),
  employee_code: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  role: z.enum(['visitor', 'customer', 'manager', 'admin']),
  last_login: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

// Schema for queries that select public columns only (no password, no phone)
export const UserPublicSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  vat_number: z.string().nullable(),
  identity_number: z.string(),
  is_active: z.number(),
  address: z.string().nullable(),
  employee_code: z.string().nullable(),
  email: z.string(),
  role: z.enum(['visitor', 'customer', 'manager', 'admin']),
  last_login: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const FlightSchema = z.object({
  id: z.number(),
  flight_number: z.string(),
  departure: z.string(),
  arrival: z.string(),
  scheduled_time: z.string(),
  state: z.enum(['created', 'staffed', 'completed', 'cancelled']),
  total_seats: z.number(),
  airplane: z.string(),
  num_rows: z.number(),
  seats_per_row: z.number(),
  business_rows: z.number(),
  created_by: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const SeatSchema = z.object({
  id: z.number(),
  flight_id: z.number(),
  seat_number: z.string(),
  class: z.enum(['economy', 'normal', 'business']),
  price: z.number(),
  is_available: z.number()
});

export const ReservationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  flight_id: z.number(),
  seat_id: z.number(),
  ticket_type: z.enum(['economy', 'normal', 'business']),
  price: z.number(),
  status: z.enum(['confirmed', 'completed', 'cancelled']),
  cancelled_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const PasswordResetTokenSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  token_hash: z.string(),
  used: z.number(),
  expires_at: z.string(),
  ip_address: z.string().nullable(),
  created_at: z.string()
});

export const RefreshTokenSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  token_hash: z.string(),
  expires_at: z.string(),
  revoked: z.number(),
  ip_address: z.string().nullable(),
  created_at: z.string()
});

export const AuditLogSchema = z.object({
  id: z.number(),
  user_id: z.number().nullable(),
  action: z.string(),
  entity: z.string().nullable(),
  entity_id: z.number().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.string()
});

export const AuditLogWithActorSchema = AuditLogSchema.extend({
  actor_username: z.string().nullable()
});
export type AuditLogWithActor = z.infer<typeof AuditLogWithActorSchema>;

export type ValidatedUser = z.infer<typeof UserSchema>;
export type ValidatedFlight = z.infer<typeof FlightSchema>;
export type ValidatedSeat = z.infer<typeof SeatSchema>;
export type ValidatedReservation = z.infer<typeof ReservationSchema>;
