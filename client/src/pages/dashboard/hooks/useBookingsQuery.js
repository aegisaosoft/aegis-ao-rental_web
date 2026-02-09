/*
 * useBookingsQuery - Hook for fetching bookings with filters and pagination
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useQuery } from 'react-query';
import { translatedApiService as apiService } from '../../../services/translatedApi';

/**
 * Hook for fetching company bookings with filtering and pagination
 * @param {Object} params - Query parameters
 * @param {string} params.companyId - Company ID
 * @param {boolean} params.enabled - Whether query should run
 * @param {Object} params.filters - Filter values from useBookingFilters
 * @param {Function} params.onError - Optional error callback
 * @returns {Object} Query result
 */
const useBookingsQuery = ({
  companyId,
  enabled = true,
  filters = {},
  onError,
}) => {
  const {
    bookingStatusFilter = '',
    bookingCustomerFilter = '',
    bookingDateFrom = '',
    bookingDateTo = '',
    bookingPage = 1,
    bookingPageSize = 10,
  } = filters;

  return useQuery(
    [
      'companyBookings',
      companyId,
      bookingStatusFilter,
      bookingCustomerFilter,
      bookingDateFrom,
      bookingDateTo,
      bookingPage,
      bookingPageSize,
    ],
    () =>
      apiService.getCompanyBookings(companyId, {
        status: bookingStatusFilter || undefined,
        customer: bookingCustomerFilter || undefined,
        pickupStart: bookingDateFrom || undefined,
        pickupEnd: bookingDateTo || undefined,
        page: bookingPage,
        pageSize: bookingPageSize,
      }),
    {
      enabled: enabled && !!companyId,
      keepPreviousData: true,
      staleTime: 30 * 1000,
      onError: (error) => {
        if (onError) onError(error);
      },
    }
  );
};

export default useBookingsQuery;
