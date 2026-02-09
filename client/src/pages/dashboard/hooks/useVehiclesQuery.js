/*
 * useVehiclesQuery - Hook for fetching vehicles with category grouping
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useQuery } from 'react-query';
import { translatedApiService as apiService } from '../../../services/translatedApi';

/**
 * Hook for fetching vehicles grouped by category/make/model
 * @param {Object} params - Query parameters
 * @param {string} params.companyId - Company ID
 * @param {boolean} params.enabled - Whether query should run
 * @param {Function} params.onError - Optional error callback
 * @returns {Object} Query result with grouped data
 */
export const useVehiclesGrouped = ({
  companyId,
  enabled = true,
  onError,
}) => {
  return useQuery(
    ['modelsGroupedByCategory', companyId],
    () => apiService.getModelsGroupedByCategory(companyId),
    {
      enabled: enabled && !!companyId,
      staleTime: 2 * 60 * 1000,
      onError: (error) => {
        if (onError) onError(error);
      },
    }
  );
};

/**
 * Hook for fetching flat vehicles list
 * @param {Object} params - Query parameters  
 * @param {string} params.companyId - Company ID
 * @param {boolean} params.enabled - Whether query should run
 * @param {Function} params.onError - Optional error callback
 * @returns {Object} Query result with vehicles array
 */
export const useVehiclesList = ({
  companyId,
  enabled = true,
  onError,
}) => {
  return useQuery(
    ['vehicles', companyId],
    () => apiService.getCompanyVehicles(companyId),
    {
      enabled: enabled && !!companyId,
      staleTime: 2 * 60 * 1000,
      onError: (error) => {
        if (onError) onError(error);
      },
    }
  );
};

/**
 * Combined hook for both grouped and flat vehicles data
 */
const useVehiclesQuery = (params) => {
  const grouped = useVehiclesGrouped(params);
  const list = useVehiclesList(params);
  
  return {
    grouped,
    list,
    isLoading: grouped.isLoading || list.isLoading,
    error: grouped.error || list.error,
  };
};

export default useVehiclesQuery;
