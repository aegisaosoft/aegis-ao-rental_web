/*
 * useVehicleFilters - Hook for managing vehicle filter state
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing vehicle list filters and pagination
 * @returns {Object} Filter state and setters
 */
const useVehicleFilters = () => {
  const [filters, setFilters] = useState({
    searchTerm: '',
    make: '',
    model: '',
    year: '',
    licensePlate: '',
    location: '',
    page: 0,
    pageSize: 10,
  });

  // Individual setters for backward compatibility
  const setVehicleSearchTerm = useCallback((value) => {
    setFilters(prev => ({ ...prev, searchTerm: value, page: 0 }));
  }, []);

  const setVehicleMakeFilter = useCallback((value) => {
    setFilters(prev => ({ ...prev, make: value, page: 0 }));
  }, []);

  const setVehicleModelFilter = useCallback((value) => {
    setFilters(prev => ({ ...prev, model: value, page: 0 }));
  }, []);

  const setVehicleYearFilter = useCallback((value) => {
    setFilters(prev => ({ ...prev, year: value, page: 0 }));
  }, []);

  const setVehicleLicensePlateFilter = useCallback((value) => {
    setFilters(prev => ({ ...prev, licensePlate: value, page: 0 }));
  }, []);

  const setVehicleLocationFilter = useCallback((value) => {
    setFilters(prev => ({ ...prev, location: value, page: 0 }));
  }, []);

  const setVehiclePage = useCallback((value) => {
    setFilters(prev => ({ ...prev, page: value }));
  }, []);

  const setVehiclePageSize = useCallback((value) => {
    setFilters(prev => ({ ...prev, pageSize: value, page: 0 }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      make: '',
      model: '',
      year: '',
      licensePlate: '',
      location: '',
      page: 0,
      pageSize: 10,
    });
  }, []);

  // Destructured values for backward compatibility
  const {
    searchTerm: vehicleSearchTerm,
    make: vehicleMakeFilter,
    model: vehicleModelFilter,
    year: vehicleYearFilter,
    licensePlate: vehicleLicensePlateFilter,
    location: vehicleLocationFilter,
    page: vehiclePage,
    pageSize: vehiclePageSize,
  } = filters;

  return {
    // State values (backward compatible names)
    vehicleSearchTerm,
    vehicleMakeFilter,
    vehicleModelFilter,
    vehicleYearFilter,
    vehicleLicensePlateFilter,
    vehicleLocationFilter,
    vehiclePage,
    vehiclePageSize,
    
    // Setters (backward compatible names)
    setVehicleSearchTerm,
    setVehicleMakeFilter,
    setVehicleModelFilter,
    setVehicleYearFilter,
    setVehicleLicensePlateFilter,
    setVehicleLocationFilter,
    setVehiclePage,
    setVehiclePageSize,
    
    // Additional utilities
    filters,
    setFilters,
    resetFilters,
  };
};

export default useVehicleFilters;
