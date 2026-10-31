// Domain types shared by the API (src/lib/server) and the UI.

export type UserRole = 'visitor' | 'customer' | 'manager' | 'admin';
export type FlightState = 'created' | 'staffed' | 'completed' | 'cancelled';
export type TicketType = 'economy' | 'normal' | 'business';
export type ReservationStatus = 'confirmed' | 'completed' | 'cancelled';

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  vat_number: string | null;
  identity_number: string;
  is_active: boolean;
  address: string | null;
  employee_code: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Flight {
  id: number;
  flight_number: string;
  departure: string;
  arrival: string;
  scheduled_time: string;
  state: FlightState;
  total_seats: number;
  airplane: string;
  num_rows: number;
  seats_per_row: number;
  business_rows: number;
  available_seats?: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface Seat {
  id: number;
  flight_id: number;
  seat_number: string;
  class: TicketType;
  price: number;
  is_available: boolean;
}

export interface Reservation {
  id: number;
  user_id: number;
  flight_id: number;
  seat_id: number;
  ticket_type: TicketType;
  price: number;
  status: ReservationStatus;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithDetails extends Reservation {
  flight_number: string;
  departure: string;
  arrival: string;
  scheduled_time: string;
  seat_number: string;
}

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token_hash: string;
  used: boolean;
  expires_at: string;
  ip_address: string | null;
  created_at: string;
}

export interface RefreshToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  revoked: boolean;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity: string | null;
  entity_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: UserRole;
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/** Shape returned by GET /api/flights/:id/seats */
export interface SeatView {
  number: string;
  class: TicketType;
  price: number;
  status: 'available' | 'reserved';
}

/** Shape returned by GET /api/users */
export interface AdminUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: number;
  last_login: string | null;
  created_at: string;
}

export interface UserStats {
  total: number;
  byRole: Record<UserRole, number>;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  action: string;
  entity: string | null;
  entity_id: number | null;
  created_at: string;
  actor_username: string | null;
}

export interface Weather {
  temperature: number;
  description: string;
  wind_speed: number;
  humidity: number;
  feelslike: number;
  city: string;
  country: string;
}

export interface AirportStatus {
  status: 'free' | 'busy' | 'unknown';
  flightCount: number;
  message: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}
