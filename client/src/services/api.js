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

// Get API URL from environment variable
// For Azure deployment, set this to your deployed .NET API URL: https://your-api-name.azurewebsites.net/api
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:7163/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
  getVehicleCategories: () => api.get('/vehicles/categories'),
  getVehicleMakes: () => api.get('/vehicles/makes'),
  getVehicleLocations: () => api.get('/vehicles/locations'),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data),

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

  // Payments
  createPaymentIntent: (data) => api.post('/payments/intent', data),
  confirmPayment: (paymentIntentId) => api.post(`/payments/confirm/${paymentIntentId}`),
  getPaymentMethods: (customerId) => api.get(`/payments/methods/${customerId}`),

  // Companies
    getCompanies: (params = {}) => api.get('/RentalCompanies', { params }),

  // Session
  setSessionCompany: (companyId) => api.post('/session/company', { companyId }),
  getSessionCompany: () => api.get('/session/company'),

  // Admin
  getAdminDashboard: () => api.get('/admin/dashboard'),
  getAdminVehicles: (params = {}) => api.get('/admin/vehicles', { params }),
  getAdminReservations: (params = {}) => api.get('/admin/reservations', { params }),
  getAdminCustomers: (params = {}) => api.get('/admin/customers', { params }),
};

export default api;
