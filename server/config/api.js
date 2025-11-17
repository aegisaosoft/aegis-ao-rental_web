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
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables (will be merged if already loaded by VS Code)
const envPaths = [
  path.join(__dirname, '..', '.env'),
  process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '..', '.env.production') 
    : path.join(__dirname, '..', '.env.development')
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (result.error && result.error.code !== 'ENOENT') {
    console.error(`config/api.js: Error loading ${envPath}:`, result.error);
  }
}

// Get API_BASE_URL from environment, with fallback default
// In production (Azure), this should be set in App Service Configuration
// For local development, default to Azure API (or set API_BASE_URL in .env to point to local API)
const API_BASE_URL = process.env.API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net'
    : 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net'); // Default to Azure API for local testing

console.log('[API Config] API_BASE_URL:', API_BASE_URL);
console.log('[API Config] NODE_ENV:', process.env.NODE_ENV);
if (!process.env.API_BASE_URL) {
  console.warn('[API Config] ⚠️ API_BASE_URL environment variable is not set.');
  console.warn('[API Config] Using fallback:', API_BASE_URL);
  console.warn('[API Config] Please set API_BASE_URL in Azure App Service Configuration → Application settings');
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true, // Forward credentials (cookies) to backend
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
    if (error.code === 'ECONNABORTED') {
      console.error('[API Error] Request timeout - API may be down or unreachable:', API_BASE_URL);
      console.error('[API Error] Error details:', error.message);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('[API Error] Cannot connect to API:', API_BASE_URL);
      console.error('[API Error] Error code:', error.code);
    } else {
      console.error('[API Error] API request failed:', error.response?.data || error.message);
      console.error('[API Error] Status:', error.response?.status);
      console.error('[API Error] URL:', error.config?.url);
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

  // Models
  getModelsGroupedByCategory: (companyId, locationId, pickupDate, returnDate) => {
    const params = {};
    if (companyId) params.companyId = companyId;
    if (locationId) params.locationId = locationId;
    if (pickupDate) params.pickupDate = pickupDate;
    if (returnDate) params.returnDate = returnDate;
    return apiClient.get('/api/Models/grouped-by-category', { params });
  },
  getModels: (params = {}) => apiClient.get('/api/Models', { params }),
  bulkUpdateModelDailyRate: (token, data) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.put('/api/Models/bulk-update-daily-rate', data, config);
  },

  // Reservations
  getBookings: (token, params = {}) => {
    const config = { params };
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get('/api/booking/bookings', config);
  },
  getBooking: (token, id) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get(`/api/booking/bookings/${id}`, config);
  },
  getCompanyBookings: (token, companyId, params = {}) => {
    const config = { params };
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get(`/api/booking/companies/${companyId}/bookings`, config);
  },
  createBooking: (token, data) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.post('/api/booking/bookings', data, config);
  },
  updateBooking: (token, id, data) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.put(`/api/booking/bookings/${id}`, data, config);
  },
  cancelBooking: (token, id) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.post(`/api/booking/bookings/${id}/cancel`, {}, config);
  },

  // Customers
  getCustomers: (token, params = {}) => {
    const config = { params };
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get('/api/customers', config);
  },
  getCustomer: (token, id) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get(`/api/customers/${id}`, config);
  },
  createCustomer: (token, data) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.post('/api/customers', data, config);
  },
  updateCustomer: (token, id, data) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.put(`/api/customers/${id}`, data, config);
  },
  getCustomerByEmail: (email) => apiClient.get(`/api/customers/email/${encodeURIComponent(email)}`),

  // Authentication
  login: (credentials) => apiClient.post('/api/auth/login', credentials),
  register: (userData) => apiClient.post('/api/auth/register', userData),
  getProfile: (token, cookies) => {
    const config = {
      headers: {}
    };
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (cookies) {
      config.headers.Cookie = cookies;
    }
    return apiClient.get('/api/auth/profile', config);
  },

  // Payments
  createPaymentIntent: (token, data) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.post('/api/payments/intent', data, config);
  },
  confirmPayment: (token, paymentIntentId) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.post(`/api/payments/confirm/${paymentIntentId}`, null, config);
  },
  getPaymentMethods: (token, customerId) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.get(`/api/payments/methods/${customerId}`, config);
  },
  createCheckoutSession: (token, data) => {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    return apiClient.post('/api/payments/checkout-session', data, config);
  },

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
