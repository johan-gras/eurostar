'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBookings,
  fetchBooking,
  createBooking,
  deleteBooking,
  fetchClaims,
  fetchClaim,
  markClaimSubmitted,
  fetchPreferences,
  updatePreferences,
  type CreateBookingRequest,
  type ClaimStatus,
  type UpdatePreferencesRequest,
} from './api';

// Query keys
export const queryKeys = {
  bookings: ['bookings'] as const,
  booking: (id: string) => ['bookings', id] as const,
  claims: ['claims'] as const,
  claim: (id: string) => ['claims', id] as const,
  preferences: ['preferences'] as const,
};

// Booking hooks
export function useBookings(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...queryKeys.bookings, params],
    queryFn: () => fetchBookings(params),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.booking(id),
    queryFn: () => fetchBooking(id),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingRequest) => createBooking(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
    },
  });
}

// Claim hooks
export function useClaims(params?: { page?: number; limit?: number; status?: ClaimStatus }) {
  return useQuery({
    queryKey: [...queryKeys.claims, params],
    queryFn: () => fetchClaims(params),
  });
}

export function useClaim(id: string) {
  return useQuery({
    queryKey: queryKeys.claim(id),
    queryFn: () => fetchClaim(id),
    enabled: !!id,
  });
}

export function useMarkClaimSubmitted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markClaimSubmitted(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims });
      void queryClient.invalidateQueries({ queryKey: queryKeys.claim(id) });
    },
  });
}

// Preferences hooks
export function usePreferences() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => fetchPreferences(),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePreferencesRequest) => updatePreferences(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.preferences });
    },
  });
}
