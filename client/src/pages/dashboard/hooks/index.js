/*
 * Dashboard Custom Hooks
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

export {
  // Data fetching hooks
  useCompanyData,
  useVehiclesList,
  useCompanyBookings,
  useCompanyLocations,
  useCompanyEmployees,
  useAdditionalServices,
  useCompanyServices,
  useMetaStatus,
  useViolations,
  useVehicleModels,
  // Mutation hooks
  useUpdateCompany,
  useVehicleMutations,
  useBookingMutations,
  useEmployeeMutations,
  useMetaMutations,
  useLocationMutations,
} from './useAdminData';

export {
  useAdminDashboardState,
  initialState,
  ACTION_TYPES,
  adminDashboardReducer,
} from './useAdminDashboardState';

// Filter hooks for gradual migration
export { default as useBookingFilters } from './useBookingFilters';
export { default as useVehicleFilters } from './useVehicleFilters';

// Query hooks with full filter/pagination support
export { default as useBookingsQuery } from './useBookingsQuery';
export { default as useViolationsQuery } from './useViolationsQuery';
export { default as useVehiclesQuery, useVehiclesGrouped, useVehiclesList as useVehiclesListQuery } from './useVehiclesQuery';

// Modal state hooks
export { default as useBookingModals } from './useBookingModals';

// Integration hooks
export { default as useMetaIntegration } from './useMetaIntegration';
