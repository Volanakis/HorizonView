export type UserRole = 'visitor' | 'customer' | 'manager' | 'admin';
export type FlightState = 'created' | 'staffed' | 'completed' | 'cancelled';
export type TicketType = 'economy' | 'normal' | 'business';
export type ReservationStatus = 'confirmed' | 'cancelled';

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  vat_number: string | null;
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
  available_seats?: number; // populated in API list/get responses
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
}

export interface ReservationWithDetails extends Reservation {
  flight_number: string;
  departure: string;
  arrival: string;
  scheduled_time: string;
  seat_number: string;
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