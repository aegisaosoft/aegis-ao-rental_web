/*
 * useBookingFilters - Hook for managing booking filter state
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useState, useCallback } from 'react';

const getDefaultDateFrom = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getDefaultDateTo = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

/**
 * Hook for managing booking list filters and pagination
 * @returns {Object} Filter state and setters
 */
const useBookingFilters = () => {
  const [filters, setFilters] = useState(() => ({
    status: '',
    customer: '',
    dateFrom: getDefaultDateFrom(),
    dateTo: getDefaultDateTo(),
    page: 1,
    pageSize: 10,
  }));

  // Individual setters for backward compatibility
  const setBookingStatusFilter = useCallback((value) => {
    setFilters(prev => ({ ...prev, status: value, page: 1 }));
  }, []);

  const setBookingCustomerFilter = useCallback((value) => {
    setFilters(prev => ({ ...prev, customer: value, page: 1 }));
  }, []);

  const setBookingDateFrom = useCallback((value) => {
    setFilters(prev => ({ ...prev, dateFrom: value, page: 1 }));
  }, []);

  const setBookingDateTo = useCallback((value) => {
    setFilters(prev => ({ ...prev, dateTo: value, page: 1 }));
  }, []);

  const setBookingPage = useCallback((value) => {
    setFilters(prev => ({ ...prev, page: value }));
  }, []);

  const setBookingPageSize = useCallback((value) => {
    setFilters(prev => ({ ...prev, pageSize: value, page: 1 }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      status: '',
      customer: '',
      dateFrom: getDefaultDateFrom(),
      dateTo: getDefaultDateTo(),
      page: 1,
      pageSize: 10,
    });
  }, []);

  // Destructured values for backward compatibility
  const {
    status: bookingStatusFilter,
    customer: bookingCustomerFilter,
    dateFrom: bookingDateFrom,
    dateTo: bookingDateTo,
    page: bookingPage,
    pageSize: bookingPageSize,
  } = filters;

  return {
    // State values (backward compatible names)
    bookingStatusFilter,
    bookingCustomerFilter,
    bookingDateFrom,
    bookingDateTo,
    bookingPage,
    bookingPageSize,
    
    // Setters (backward compatible names)
    setBookingStatusFilter,
    setBookingCustomerFilter,
    setBookingDateFrom,
    setBookingDateTo,
    setBookingPage,
    setBookingPageSize,
    
    // Additional utilities
    filters,
    setFilters,
    resetFilters,
  };
};

export default useBookingFilters;
