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

const axios = require('axios');
const https = require('https');

const API_BASE_URL = process.env.API_BASE_URL || 'https://localhost:7163';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Allow self-signed certificates in development
  })
});

// Request interceptor to add API key if needed
apiClient.interceptors.request.use(
  (config) => {
    if (process.env.API_KEY) {
      config.headers['Authorization'] = `Bearer ${process.env.API_KEY}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    // For development, we'll use mock data when external API fails
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock data due to API error');
    }
    return Promise.reject(error);
  }
);

// API service methods
const apiService = {
  // Vehicles
  getVehicles: (token, params = {}) => {
    const config = { params };
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get('/api/vehicles', config);
  },
  getVehicle: (token, id) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get(`/api/vehicles/${id}`, config);
  },
  getVehicleCategories: () => apiClient.get('/api/vehicles/categories'),
  getVehicleMakes: () => apiClient.get('/api/vehicles/makes'),
  getVehicleLocations: () => apiClient.get('/api/vehicles/locations'),
  updateVehicle: (token, id, data) => {
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };
    return apiClient.put(`/api/vehicles/${id}`, data, config);
  },

  // Reservations
  getReservations: (params = {}) => apiClient.get('/api/reservations', { params }),
  getReservation: (id) => apiClient.get(`/api/reservations/${id}`),
  createReservation: (data) => apiClient.post('/api/reservations', data),
  updateReservation: (id, data) => apiClient.put(`/api/reservations/${id}`, data),
  cancelReservation: (id) => apiClient.delete(`/api/reservations/${id}`),

  // Customers
  getCustomers: (params = {}) => apiClient.get('/api/customers', { params }),
  getCustomer: (id) => apiClient.get(`/api/customers/${id}`),
  createCustomer: (data) => apiClient.post('/api/customers', data),
  updateCustomer: (id, data) => apiClient.put(`/api/customers/${id}`, data),

  // Authentication
  login: (credentials) => apiClient.post('/api/auth/login', credentials),
  register: (userData) => apiClient.post('/api/auth/register', userData),
  getProfile: (token) => apiClient.get('/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // Payments
  createPaymentIntent: (data) => apiClient.post('/api/payments/intent', data),
  confirmPayment: (paymentIntentId) => apiClient.post(`/api/payments/confirm/${paymentIntentId}`),
  getPaymentMethods: (customerId) => apiClient.get(`/api/payments/methods/${customerId}`),

  // Companies
  getRentalCompanies: (params = {}) => apiClient.get('/api/RentalCompanies', { params }),
  getRentalCompany: (token, id) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get(`/api/RentalCompanies/${id}`, config);
  },

  // Reviews
  getReviews: (params = {}) => apiClient.get('/api/reviews', { params }),
  createReview: (data) => apiClient.post('/api/reviews', data),

  // Admin endpoints
  adminGetVehicles: (token, params = {}) => apiClient.get('/api/admin/vehicles', {
    params,
    headers: { Authorization: `Bearer ${token}` }
  }),
  adminCreateVehicle: (token, data) => apiClient.post('/api/admin/vehicles', data, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  adminUpdateVehicle: (token, id, data) => apiClient.put(`/api/admin/vehicles/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  adminDeleteVehicle: (token, id) => apiClient.delete(`/api/admin/vehicles/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  adminGetReservations: (token, params = {}) => apiClient.get('/api/admin/reservations', {
    params,
    headers: { Authorization: `Bearer ${token}` }
  }),
  adminGetCustomers: (token, params = {}) => apiClient.get('/api/admin/customers', {
    params,
    headers: { Authorization: `Bearer ${token}` }
  })
};

module.exports = apiService;
