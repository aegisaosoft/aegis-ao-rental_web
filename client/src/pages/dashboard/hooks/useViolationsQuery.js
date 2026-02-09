/*
 * useViolationsQuery - Hook for fetching violations with filters and pagination
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useQuery } from 'react-query';
import { translatedApiService as apiService } from '../../../services/translatedApi';

/**
 * Hook for fetching violations with filtering and pagination
 * @param {Object} params - Query parameters
 * @param {string} params.companyId - Company ID
 * @param {boolean} params.enabled - Whether query should run
 * @param {Object} params.filters - Filter values
 * @param {Function} params.onError - Optional error callback
 * @returns {Object} Query result
 */
const useViolationsQuery = ({
  companyId,
  enabled = true,
  filters = {},
  onError,
}) => {
  const {
    violationsDateFrom = '',
    violationsDateTo = '',
    violationsPage = 0,
    violationsPageSize = 10,
    searchTrigger = 0,
  } = filters;

  return useQuery(
    [
      'violations',
      companyId,
      violationsDateFrom,
      violationsDateTo,
      violationsPage,
      violationsPageSize,
      searchTrigger,
    ],
    () =>
      apiService.getViolations({
        companyId,
        dateFrom: violationsDateFrom || undefined,
        dateTo: violationsDateTo || undefined,
        page: violationsPage + 1, // Backend uses 1-based pagination
        pageSize: violationsPageSize,
      }),
    {
      enabled: enabled && !!companyId,
      keepPreviousData: true,
      staleTime: 60 * 1000,
      onError: (error) => {
        if (onError) onError(error);
      },
    }
  );
};

export default useViolationsQuery;
