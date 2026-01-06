import { apiClient } from './api-client';

// Response types matching the API
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Booking types
export interface BookingResponse {
  id: string;
  pnr: string;
  tcn: string;
  trainNumber: string;
  journeyDate: string;
  passengerName: string;
  origin: string;
  destination: string;
  coach: string | null;
  seat: string | null;
  finalDelayMinutes: number | null;
  trainId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EligibilityStatus {
  eligible: boolean;
  reason: string;
  failedChecks: string[];
  compensation: CompensationResult | null;
  deadline: string | null;
  daysUntilDeadline: number | null;
  claimWindowOpen: boolean;
}

export interface CompensationResult {
  eligible: boolean;
  cashAmount: number;
  voucherAmount: number;
  tier: {
    name: string;
    minDelayMinutes: number;
    maxDelayMinutes: number | null;
    cashPercentage: number;
    voucherPercentage: number;
  } | null;
  currency: 'EUR' | 'GBP';
  ticketPrice: number;
  delayMinutes: number;
}

export interface BookingDetailResponse extends BookingResponse {
  eligibility: EligibilityStatus | null;
  claim: ClaimResponse | null;
}

// Claim types
export type ClaimStatus = 'pending' | 'eligible' | 'submitted' | 'approved' | 'rejected' | 'expired';

export interface ClaimResponse {
  id: string;
  bookingId: string;
  delayMinutes: number;
  eligibleCashAmount: number;
  eligibleVoucherAmount: number;
  status: ClaimStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimFormData {
  pnr: string;
  tcn: string;
  firstName: string;
  lastName: string;
  email: string;
  trainNumber: string;
  journeyDate: string;
  origin: string;
  destination: string;
  delayMinutes: number;
  eligibleCashAmount: number;
  eligibleVoucherAmount: number;
}

export interface ClaimDetailResponse extends ClaimResponse {
  formData: ClaimFormData;
  claimPortalUrl: string;
  booking: BookingResponse;
}

// Request types
export interface CreateBookingFromEmailRequest {
  emailBody: string;
}

export interface CreateBookingManualRequest {
  pnr: string;
  tcn: string;
  trainNumber: string;
  journeyDate: string;
  passengerName: string;
  origin: string;
  destination: string;
  coach?: string;
  seat?: string;
}

export type CreateBookingRequest = CreateBookingFromEmailRequest | CreateBookingManualRequest;

// API functions
export async function fetchBookings(params?: { page?: number; limit?: number }): Promise<SuccessResponse<BookingResponse[]>> {
  const response = await apiClient.get<BookingResponse[]>('/bookings', params);
  const result: SuccessResponse<BookingResponse[]> = { data: response.data };
  if (response.meta) {
    result.meta = response.meta;
  }
  return result;
}

export async function fetchBooking(id: string): Promise<BookingDetailResponse> {
  const response = await apiClient.get<BookingDetailResponse>(`/bookings/${id}`);
  return response.data;
}

export async function createBooking(data: CreateBookingRequest): Promise<BookingResponse> {
  const response = await apiClient.post<BookingResponse>('/bookings', data);
  return response.data;
}

export async function deleteBooking(id: string): Promise<void> {
  await apiClient.delete(`/bookings/${id}`);
}

export async function fetchClaims(params?: { page?: number; limit?: number; status?: ClaimStatus }): Promise<SuccessResponse<ClaimResponse[]>> {
  const response = await apiClient.get<ClaimResponse[]>('/claims', params);
  const result: SuccessResponse<ClaimResponse[]> = { data: response.data };
  if (response.meta) {
    result.meta = response.meta;
  }
  return result;
}

export async function fetchClaim(id: string): Promise<ClaimDetailResponse> {
  const response = await apiClient.get<ClaimDetailResponse>(`/claims/${id}`);
  return response.data;
}

export async function markClaimSubmitted(id: string): Promise<ClaimResponse> {
  const response = await apiClient.patch<ClaimResponse>(`/claims/${id}/submitted`);
  return response.data;
}

// Station name mapping
export const STATION_NAMES: Record<string, string> = {
  GBSPX: 'London St Pancras',
  GBEBS: 'Ebbsfleet International',
  GBASH: 'Ashford International',
  FRPLY: 'Paris Gare du Nord',
  FRLIL: 'Lille Europe',
  FRCFK: 'Calais Fréthun',
  BEBMI: 'Brussels Midi',
  NLAMA: 'Amsterdam Centraal',
  NLRTD: 'Rotterdam Centraal',
  DECGN: 'Köln Hauptbahnhof',
};

export function getStationName(code: string): string {
  return STATION_NAMES[code] || code;
}

// User preferences types
export type SeatPosition = 'window' | 'aisle' | 'middle';
export type SeatDirection = 'forward' | 'backward' | 'any';
export type CoachType = 'quiet' | 'standard' | 'any';
export type Terminal = 'st_pancras' | 'paris_nord' | 'brussels_midi' | 'amsterdam_centraal';
export type CompensationType = 'cash' | 'voucher';

export interface SeatPreferences {
  position?: SeatPosition;
  direction?: SeatDirection;
  coach?: CoachType;
  table?: boolean;
  powerSocket?: boolean;
}

export interface UserPreferencesResponse {
  id: string | null;
  userId: string;
  seatPreferences: SeatPreferences | null;
  queueNotifications: boolean;
  defaultTerminal: Terminal | null;
  preferredCompensationType: CompensationType | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencesRequest {
  seatPreferences?: SeatPreferences | null;
  queueNotifications?: boolean;
  defaultTerminal?: Terminal | null;
  preferredCompensationType?: CompensationType | null;
}

// Preferences API functions
export async function fetchPreferences(): Promise<UserPreferencesResponse> {
  const response = await apiClient.get<UserPreferencesResponse>('/user/preferences');
  return response.data;
}

export async function updatePreferences(data: UpdatePreferencesRequest): Promise<UserPreferencesResponse> {
  const response = await apiClient.patch<UserPreferencesResponse>('/user/preferences', data);
  return response.data;
}

// Terminal name mapping
export const TERMINAL_NAMES: Record<Terminal, string> = {
  st_pancras: 'London St Pancras',
  paris_nord: 'Paris Gare du Nord',
  brussels_midi: 'Brussels Midi',
  amsterdam_centraal: 'Amsterdam Centraal',
};
