/*
 * Custom hooks for AdminDashboard data fetching
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useQuery, useMutation, useQueryClient } from 'react-query';
import { translatedApiService as apiService } from '../../../services/translatedApi';
import { toast } from 'react-toastify';

/**
 * Hook for fetching company data
 */
export const useCompanyData = (currentCompanyId, isAuthenticated, canAccessDashboard) => {
  return useQuery(
    ['companyDetails', currentCompanyId],
    () => apiService.getCompanyById(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      staleTime: 5 * 60 * 1000,
      retry: 2,
    }
  );
};

/**
 * Hook for fetching vehicles list
 */
export const useVehiclesList = (currentCompanyId, isAuthenticated, canAccessDashboard) => {
  return useQuery(
    ['vehiclesList', currentCompanyId],
    () => apiService.getVehicles(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      staleTime: 2 * 60 * 1000,
    }
  );
};

/**
 * Hook for fetching company bookings
 */
export const useCompanyBookings = (currentCompanyId, isAuthenticated, canAccessDashboard, activeSection) => {
  return useQuery(
    ['companyBookings', currentCompanyId],
    () => apiService.getCompanyBookings(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeSection === 'reservations',
      staleTime: 30 * 1000,
    }
  );
};

/**
 * Hook for fetching company locations
 */
export const useCompanyLocations = (currentCompanyId, isAuthenticated, canAccessDashboard) => {
  return useQuery(
    ['companyLocations', currentCompanyId],
    () => apiService.getCompanyLocations(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      staleTime: 5 * 60 * 1000,
    }
  );
};

/**
 * Hook for fetching company employees
 */
export const useCompanyEmployees = (currentCompanyId, isAuthenticated, canAccessDashboard, activeSection) => {
  return useQuery(
    ['companyEmployees', currentCompanyId],
    () => apiService.getCompanyEmployees(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeSection === 'employees',
      staleTime: 5 * 60 * 1000,
    }
  );
};

/**
 * Hook for fetching additional services
 */
export const useAdditionalServices = (currentCompanyId, isAuthenticated, canAccessDashboard, activeSection) => {
  return useQuery(
    ['additionalServices', currentCompanyId],
    () => apiService.getAdditionalServices(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeSection === 'additionalServices',
      staleTime: 5 * 60 * 1000,
    }
  );
};

/**
 * Hook for fetching company services (pricing)
 */
export const useCompanyServices = (currentCompanyId, isAuthenticated, canAccessDashboard, activeSection) => {
  return useQuery(
    ['companyServices', currentCompanyId],
    () => apiService.getCompanyServices(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeSection === 'additionalServices',
      staleTime: 5 * 60 * 1000,
    }
  );
};

/**
 * Hook for fetching Meta connection status
 */
export const useMetaStatus = (currentCompanyId, isAuthenticated, canAccessDashboard, activeSection) => {
  return useQuery(
    ['metaStatus', currentCompanyId],
    () => apiService.getMetaStatus(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeSection === 'meta',
      staleTime: 60 * 1000,
      retry: 1,
    }
  );
};

/**
 * Hook for fetching violations
 */
export const useViolations = (currentCompanyId, isAuthenticated, canAccessDashboard, activeSection) => {
  return useQuery(
    ['violations', currentCompanyId],
    () => apiService.getViolations(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeSection === 'violations',
      staleTime: 60 * 1000,
    }
  );
};

/**
 * Hook for fetching vehicle models catalog
 */
export const useVehicleModels = (currentCompanyId, isAuthenticated, canAccessDashboard) => {
  return useQuery(
    ['vehicleModels', currentCompanyId],
    () => apiService.getVehicleModels(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      staleTime: 10 * 60 * 1000,
    }
  );
};

// ============== MUTATIONS ==============

/**
 * Hook for company update mutation
 */
export const useUpdateCompany = (currentCompanyId, t) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data) => apiService.updateCompany(currentCompanyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyDetails', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.companySaveError', 'Failed to save company'));
      },
    }
  );
};

/**
 * Hook for vehicle CRUD mutations
 */
export const useVehicleMutations = (currentCompanyId, t) => {
  const queryClient = useQueryClient();

  const createVehicle = useMutation(
    (data) => apiService.createVehicle(currentCompanyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehiclesList', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('vehicles.createError', 'Failed to create vehicle'));
      },
    }
  );

  const updateVehicle = useMutation(
    ({ vehicleId, data }) => apiService.updateVehicle(currentCompanyId, vehicleId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehiclesList', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('vehicles.updateError', 'Failed to update vehicle'));
      },
    }
  );

  const deleteVehicle = useMutation(
    (vehicleId) => apiService.deleteVehicle(currentCompanyId, vehicleId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehiclesList', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('vehicles.deleteError', 'Failed to delete vehicle'));
      },
    }
  );

  return { createVehicle, updateVehicle, deleteVehicle };
};

/**
 * Hook for booking mutations
 */
export const useBookingMutations = (currentCompanyId, t) => {
  const queryClient = useQueryClient();

  const updateBookingStatus = useMutation(
    ({ bookingId, status }) => apiService.updateBookingStatus(currentCompanyId, bookingId, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.bookingUpdateError', 'Failed to update booking'));
      },
    }
  );

  const cancelBooking = useMutation(
    ({ bookingId, reason, refundAmount }) => 
      apiService.cancelBooking(currentCompanyId, bookingId, { reason, refundAmount }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.bookingCancelError', 'Failed to cancel booking'));
      },
    }
  );

  return { updateBookingStatus, cancelBooking };
};

/**
 * Hook for employee mutations
 */
export const useEmployeeMutations = (currentCompanyId, t) => {
  const queryClient = useQueryClient();

  const addEmployee = useMutation(
    (data) => apiService.addEmployee(currentCompanyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyEmployees', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.employeeAddError', 'Failed to add employee'));
      },
    }
  );

  const updateEmployee = useMutation(
    ({ employeeId, data }) => apiService.updateEmployee(currentCompanyId, employeeId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyEmployees', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.employeeUpdateError', 'Failed to update employee'));
      },
    }
  );

  const deleteEmployee = useMutation(
    (employeeId) => apiService.deleteEmployee(currentCompanyId, employeeId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyEmployees', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.employeeDeleteError', 'Failed to delete employee'));
      },
    }
  );

  return { addEmployee, updateEmployee, deleteEmployee };
};

/**
 * Hook for Meta integration mutations
 */
export const useMetaMutations = (currentCompanyId, t) => {
  const queryClient = useQueryClient();

  const connectMeta = useMutation(
    () => {
      const lang = document.documentElement.lang || 'en';
      window.location.href = `/api/meta/oauth/connect/${currentCompanyId}?lang=${lang}`;
    }
  );

  const disconnectMeta = useMutation(
    () => apiService.disconnectMeta(currentCompanyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.disconnectError', 'Failed to disconnect'));
      },
    }
  );

  const selectMetaPage = useMutation(
    (pageId) => apiService.selectMetaPage(currentCompanyId, pageId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.pageSelectError', 'Failed to select page'));
      },
    }
  );

  const refreshInstagram = useMutation(
    () => apiService.refreshInstagram(currentCompanyId),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
        if (result?.instagramUsername) {
        } else {
          toast.error(result.message || t('meta.instagramNotFound', 'Instagram not found'));
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.refreshError', 'Failed to refresh Instagram'));
      },
    }
  );

  return { connectMeta, disconnectMeta, selectMetaPage, refreshInstagram };
};

/**
 * Hook for location mutations
 */
export const useLocationMutations = (currentCompanyId, t) => {
  const queryClient = useQueryClient();

  const createLocation = useMutation(
    (data) => apiService.createCompanyLocation(currentCompanyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.locationCreateError', 'Failed to create location'));
      },
    }
  );

  const updateLocation = useMutation(
    ({ locationId, data }) => apiService.updateCompanyLocation(currentCompanyId, locationId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.locationUpdateError', 'Failed to update location'));
      },
    }
  );

  const deleteLocation = useMutation(
    (locationId) => apiService.deleteCompanyLocation(currentCompanyId, locationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('admin.locationDeleteError', 'Failed to delete location'));
      },
    }
  );

  return { createLocation, updateLocation, deleteLocation };
};
