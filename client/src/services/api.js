/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import axios from 'axios';

// API Base URL - use /api prefix for Node.js proxy
const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout (increased for cold starts and slow operations)
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests for session management
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Disable SSL verification for development (localhost with self-signed cert)
    if (config.baseURL?.includes('localhost')) {
      config.httpsAgent = false;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling standardized API responses
api.interceptors.response.use(
  (response) => {
    // Check if response is wrapped in standardized format
    if (response.data && typeof response.data === 'object' && 'result' in response.data) {
      // Unwrap the standardized response for backward compatibility
      // Keep original response.data.result accessible while allowing direct access
      if (!response.data.original) {
        response.data.original = response.data;
      }
      // Extract the actual data
      response.data = response.data.result;
    }
    return response;
  },
  (error) => {
    // For error responses, check if they're wrapped in standardized format
    if (error.response?.data && typeof error.response.data === 'object' && 'result' in error.response.data) {
      // Extract the error message and reason
      const wrappedData = error.response.data;
      error.response.data = {
        message: wrappedData.message,
        reason: wrappedData.reason
      };
    }
    
    if (error.response?.status === 401) {
      // Only redirect to login if not already on login/register pages
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Authentication
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),

  // Vehicles
  getVehicles: (params = {}) => api.get('/vehicles', { params }),
  getVehicle: (id) => api.get(`/vehicles/${id}`),
  createVehicle: (data) => api.post('/vehicles', data),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data),
  deleteVehicle: (id) => api.delete(`/vehicles/${id}`),
  getVehicleCount: (companyId) => {
    const params = companyId ? { companyId } : {};
    return api.get('/vehicles/count', { params });
  },
  getFirstAvailableVehicle: (params = {}) => {
    // Get first available vehicle with filters
    const optimizedParams = {
      ...params,
      status: params.status || 'Available',
      page: 1,
      pageSize: 1
    };
    return api.get('/vehicles', { params: optimizedParams });
  },
  getVehicleCategories: (companyId) => {
    const params = companyId ? { companyId } : {};
    return api.get('/vehicles/categories', { params });
  },
  getVehicleMakes: () => api.get('/vehicles/makes'),
  getVehicleLocations: () => api.get('/vehicles/locations'),
  bulkUpdateVehicleDailyRate: (data) => api.put('/vehicles/bulk-update-daily-rate', data),

  // Models
  getModelsGroupedByCategory: (companyId) => {
    // Only include companyId in params if it's a valid non-empty value
    // This allows showing all models when companyId is null, undefined, or empty string
    const params = (companyId && String(companyId).trim() !== '') ? { companyId } : {};
    return api.get('/Models/grouped-by-category', { params });
  },
  getModels: (params = {}) => api.get('/Models', { params }),
  bulkUpdateModelDailyRate: (data) => api.put('/Models/bulk-update-daily-rate', data),

  // Reservations
  getReservations: (params = {}) => api.get('/reservations', { params }),
  getReservation: (id) => api.get(`/reservations/${id}`),
  createReservation: (data) => api.post('/reservations', data),
  updateReservation: (id, data) => api.put(`/reservations/${id}`, data),
  cancelReservation: (id) => api.delete(`/reservations/${id}`),

  // Customers
  getCustomers: (params = {}) => api.get('/customers', { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  
  // Customer Licenses
  getCustomerLicense: (customerId) => api.get(`/customers/${customerId}/license`),
  upsertCustomerLicense: (customerId, data) => api.post(`/customers/${customerId}/license`, data),

  // Payments
  createPaymentIntent: (data) => api.post('/payments/intent', data),
  confirmPayment: (paymentIntentId) => api.post(`/payments/confirm/${paymentIntentId}`),
  getPaymentMethods: (customerId) => api.get(`/payments/methods/${customerId}`),

  // Companies
  getCompanies: (params = {}) => api.get('/RentalCompanies', { params }),
  getCompany: (id) => api.get(`/RentalCompanies/${id}`),
  createCompany: (data) => api.post('/RentalCompanies', data),
  updateCompany: (id, data) => api.put(`/RentalCompanies/${id}`, data),
  deleteCompany: (id) => api.delete(`/RentalCompanies/${id}`),

  // Locations
  getLocations: (params = {}) => api.get('/Locations', { params }),
  getLocation: (id) => api.get(`/Locations/${id}`),
  getLocationsByCompany: (companyId) => api.get(`/Locations/company/${companyId}`),
  // Company Services
  getCompanyServices: (companyId, params = {}) => api.get(`/CompanyServices/company/${companyId}`, { params }),
  addServiceToCompany: (data) => api.post('/CompanyServices', data),
  removeServiceFromCompany: (companyId, serviceId) => api.delete(`/CompanyServices/${companyId}/${serviceId}`),
  updateCompanyService: (companyId, serviceId, data) => api.put(`/CompanyServices/${companyId}/${serviceId}`, data),
  // Additional Services
  getAdditionalServices: (params = {}) => api.get('/AdditionalServices', { params }),
  getAdditionalService: (id) => api.get(`/AdditionalServices/${id}`),
  createAdditionalService: (data) => api.post('/AdditionalServices', data),
  updateAdditionalService: (id, data) => api.put(`/AdditionalServices/${id}`, data),
  deleteAdditionalService: (id) => api.delete(`/AdditionalServices/${id}`),
  // Company Locations
  getCompanyLocations: (params = {}) => api.get('/CompanyLocations', { params }),
  getCompanyLocation: (id) => api.get(`/CompanyLocations/${id}`),
  getPickupLocations: (companyId = null) => api.get('/Locations/pickup', { params: { companyId } }),
  getReturnLocations: (companyId = null) => api.get('/Locations/return', { params: { companyId } }),
  getLocationStates: (companyId = null) => api.get('/Locations/states', { params: { companyId } }),
  getLocationCities: (params = {}) => api.get('/Locations/cities', { params }),
  createLocation: (data) => api.post('/Locations', data),
  updateLocation: (id, data) => api.put(`/Locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/Locations/${id}`),
  activateLocation: (id) => api.patch(`/Locations/${id}/activate`),
  deactivateLocation: (id) => api.patch(`/Locations/${id}/deactivate`),

  // Session
  setSessionCompany: (companyId) => api.post('/session/company', { companyId }),
  getSessionCompany: () => api.get('/session/company'),

  // Admin
  getAdminDashboard: () => api.get('/admin/dashboard'),
  getAdminVehicles: (params = {}) => api.get('/admin/vehicles', { params }),
  getAdminReservations: (params = {}) => api.get('/admin/reservations', { params }),
  getAdminCustomers: (params = {}) => api.get('/admin/customers', { params }),

  // Media uploads
  uploadCompanyVideo: (companyId, file, onProgress) => {
    const formData = new FormData();
    formData.append('video', file);
    
    return api.post(`/Media/companies/${companyId}/video`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },
  deleteCompanyVideo: (companyId) => api.delete(`/Media/companies/${companyId}/video`),
  
  uploadCompanyBanner: (companyId, file, onProgress) => {
    const formData = new FormData();
    formData.append('banner', file);
    
    return api.post(`/Media/companies/${companyId}/banner`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },
  deleteCompanyBanner: (companyId) => api.delete(`/Media/companies/${companyId}/banner`),
  
  uploadCompanyLogo: (companyId, file, onProgress) => {
    const formData = new FormData();
    formData.append('logo', file);
    
    return api.post(`/Media/companies/${companyId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },
  deleteCompanyLogo: (companyId) => api.delete(`/Media/companies/${companyId}/logo`),
};

export default api;
