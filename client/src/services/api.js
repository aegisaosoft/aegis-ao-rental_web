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

// API Base URL - use /api prefix for proxy
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

// Request interceptor - sessions are handled via cookies automatically
api.interceptors.request.use(
  (config) => {
    // Sessions are managed server-side via HTTP-only cookies
    // No need to add Authorization headers - the session cookie is sent automatically
    // Disable SSL verification for development (localhost with self-signed cert)
    if (typeof config.baseURL === 'string' && config.baseURL.includes('localhost')) {
      config.httpsAgent = false;
    }
    
    // CRITICAL: If FormData is being sent, remove Content-Type header
    // so Axios can automatically set it with the correct boundary
    // The default 'application/json' header will break multipart/form-data
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      // Axios will automatically set: multipart/form-data; boundary=----WebKitFormBoundary...
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
    
    // Silently handle 404 for customer email lookups - it's expected when customer doesn't exist
    const isCustomerEmailLookup = typeof error.config?.url === 'string' && error.config.url.includes('/customers/email/');
    if (error.response?.status === 404 && isCustomerEmailLookup) {
      // Don't log 404 errors for customer email lookups - they're expected
      // The calling code will handle creating the customer
      return Promise.reject(error);
    }
    
    // Silently handle 401 for profile endpoint when checking auth on app load
    // This is expected when user is not logged in - don't show console errors
    const isProfileCheck = typeof error.config?.url === 'string' && error.config.url.includes('/auth/profile');
    if (error.response?.status === 401 && isProfileCheck) {
      // This is expected when checking if user is logged in on app load
      // The AuthContext will handle it silently
      // Don't log to console or redirect - just reject silently
      return Promise.reject(error);
    }
    
    // Handle 401/403 errors - session expired or invalid
    if (error.response?.status === 401 || error.response?.status === 403) {
      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/register', '/', '/home', '/locations'];
      const isPublicPath = publicPaths.some(path => currentPath === path || currentPath.startsWith(path));
      
      // Don't redirect for CompanyLocations or Locations endpoints - let the component handle it
      // These endpoints may allow anonymous access or the component will handle auth
      const isLocationEndpoint = (typeof error.config?.url === 'string' && error.config.url.includes('/CompanyLocations')) ||
                                  (typeof error.config?.url === 'string' && error.config.url.includes('/Locations/'));

      // Don't redirect for Media license endpoints - they have AllowAnonymous for wizard flow
      // These endpoints are used during customer creation wizard without authentication
      const isMediaLicenseEndpoint = (typeof error.config?.url === 'string' && error.config.url.includes('/Media/customers/')) &&
                                      (typeof error.config?.url === 'string' && error.config.url.includes('/licenses'));

      // Don't redirect for Stripe status endpoints - 401 may mean no Stripe account or insufficient permissions
      // Let the component handle it gracefully
      const isStripeStatusEndpoint = typeof error.config?.url === 'string' && error.config.url.includes('/stripe/status');
      
      // If we're on a protected page (not public) and get 401/403, redirect to login
      // This handles both auth endpoints and other protected endpoints (like /admin, /booking, etc.)
      // But skip redirect for location, media license, and Stripe status endpoints - let the component handle auth
      if (!isPublicPath && !isLocationEndpoint && !isMediaLicenseEndpoint && !isStripeStatusEndpoint) {
        // Preserve companyId and userId (they persist through auth errors)
        const preservedCompanyId = localStorage.getItem('companyId');
        const preservedUserId = localStorage.getItem('userId');
        
        // Session is invalid - redirect to login
        // CompanyId and userId will be restored if they existed
        if (preservedCompanyId) {
          localStorage.setItem('companyId', preservedCompanyId);
        }
        if (preservedUserId) {
          localStorage.setItem('userId', preservedUserId);
        }
        
        // Only redirect if we're not already redirecting (prevent multiple redirects)
        if (typeof window.location.href === 'string' && !window.location.href.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    // Reject the promise so calling code can handle the error
    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Authentication
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),

  // Vehicles
  getVehicles: (params = {}) => api.get('/vehicles', { params }),
  getVehicle: (id) => api.get(`/vehicles/${id}`),
  lookupVehicleByVin: (vin) => api.get(`/vehicles/vin-lookup/${encodeURIComponent(vin)}`),
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
  importVehicles: (formData) => api.post('/vehicles/import', formData, {
    // DO NOT set Content-Type manually - Axios will automatically set it with the correct boundary
    // Manually setting it breaks multipart parsing and causes fieldMapping to be lost
  }),

  // Models
  getModelsGroupedByCategory: (companyId, locationId, pickupDate, returnDate, pickupTime, returnTime) => {
    // Only include parameters if they have valid non-empty values
    // If locationId is not provided, the API will search ALL locations for the company
    const params = {};
    if (companyId && String(companyId).trim() !== '') {
      params.companyId = companyId;
    }
    if (locationId && String(locationId).trim() !== '') {
      params.locationId = locationId;
    }
    if (pickupDate) {
      params.pickupDate = pickupDate;
    }
    if (returnDate) {
      params.returnDate = returnDate;
    }
    if (pickupTime) {
      params.pickupTime = pickupTime;
    }
    if (returnTime) {
      params.returnTime = returnTime;
    }
    return api.get('/Models/grouped-by-category', { params });
  },
  getModels: (params = {}) => api.get('/Models', { params }),
  bulkUpdateModelDailyRate: (data) => api.put('/Models/bulk-update-daily-rate', data),

  // Reservations
  getBookings: (params = {}) => api.get('/booking/bookings', { params }),
  getBooking: (id, params = {}) => api.get(`/booking/bookings/${id}`, { params }),
  getCompanyBookings: (companyId, params = {}) =>
    api.get(`/booking/companies/${companyId}/bookings`, { params }),
  createBooking: (data) => api.post('/booking/bookings', data),
  updateBooking: (id, data) => api.put(`/booking/bookings/${id}`, data),
  cancelBooking: (id) => api.post(`/booking/bookings/${id}/cancel`),
  refundPayment: (bookingId, amount, reason) => {
    return api.post(`/booking/bookings/${bookingId}/refund`, { amount, reason });
  },
  syncPaymentFromStripe: (bookingId) => api.post(`/booking/bookings/${bookingId}/sync-payment`),
  syncPaymentsFromStripeBulk: (bookingIds) => api.post('/booking/bookings/sync-payments-bulk', bookingIds, {
    timeout: 300000, // 5 minutes timeout for bulk sync (can take a while with many bookings)
  }),
  createSecurityDepositPaymentIntent: (bookingId) => api.post(`/booking/bookings/${bookingId}/security-deposit-payment-intent`),
  createSecurityDepositCheckout: (bookingId, language) => api.post(`/booking/bookings/${bookingId}/security-deposit-checkout${language ? `?language=${language}` : ''}`),
  
  // Rental Agreements
  getRentalAgreement: (bookingId) => api.get(`/booking/bookings/${bookingId}/rental-agreement`),
  signBookingAgreement: (bookingId, agreementData) => api.post(`/booking/bookings/${bookingId}/sign-agreement`, agreementData),
  previewAgreementPdf: (data) => api.post('/booking/preview-agreement-pdf', data, { responseType: 'blob' }),

  // Customers
  getCustomers: (params = {}) => api.get('/customers', { params }),
  getCustomersWithBookings: (companyId, params = {}) => 
    api.get(`/customers/with-bookings/${companyId}`, { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  getCustomerWithDetails: (id) => api.get(`/customers/data/${id}`),
  getCustomerTest: (id) => api.get(`/customers/${id}/test`),
  getCustomerByEmail: (email) => api.get(`/customers/email/${encodeURIComponent(email)}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),
  
  // Customer Licenses
  getCustomerLicense: (customerId) => api.get(`/customers/${customerId}/license`),
  upsertCustomerLicense: (customerId, data) => api.post(`/customers/${customerId}/license`, data),

  // Payments
  createPaymentIntent: (data) => api.post('/payments/intent', data),
  confirmPayment: (paymentIntentId) => api.post(`/payments/confirm/${paymentIntentId}`),
  getPaymentMethods: (customerId) => api.get(`/payments/methods/${customerId}`),
  createCheckoutSession: (data) => api.post('/payments/checkout-session', data),

  // Companies
  getCompanies: (params = {}) => api.get('/RentalCompanies', { params }),
  getCompany: (id) => api.get(`/RentalCompanies/${id}`),
  createCompany: (data) => api.post('/RentalCompanies', data),
  updateCompany: (id, data) => api.put(`/RentalCompanies/${id}`, data),
  deleteCompany: (id) => api.delete(`/RentalCompanies/${id}`),
  updateTermsOfUse: (id, data) => api.put(`/RentalCompanies/${id}/terms-of-use`, data),
  clearTermsOfUse: (id) => api.delete(`/RentalCompanies/${id}/terms-of-use`),
  // Get current company config based on domain (public endpoint)
  getCurrentCompanyConfig: () => api.get('/companies/config'),

  // Locations
  getLocations: (params = {}) => api.get('/Locations', { params }),
  getLocation: (id) => api.get(`/Locations/${id}`),
  getLocationsByCompany: (companyId) => api.get(`/Locations/company/${companyId}`),
  // Company Services
  getCompanyServices: (companyId, params = {}) => api.get(`/CompanyServices/company/${companyId}`, { params }),
  addServiceToCompany: (data) => api.post('/CompanyServices', data),
  removeServiceFromCompany: (companyId, serviceId) =>
    api.delete(`/CompanyServices/${companyId}/${serviceId}`),
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
  createCompanyLocation: (data) => api.post('/CompanyLocations', data),
  updateCompanyLocation: (id, data) => api.put(`/CompanyLocations/${id}`, data),
  deleteCompanyLocation: (id) => api.delete(`/CompanyLocations/${id}`),
  getPickupLocations: (companyId = null) => {
    // Don't include companyId param if it's null/undefined - this will return locations where companyId is null
    if (companyId != null && companyId !== undefined) {
      return api.get('/Locations/pickup', { params: { companyId } });
    }
    // No companyId parameter - returns locations where companyId is null
    return api.get('/Locations/pickup');
  },
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
  // Set token in session (for QR code scan)
  setSessionToken: (token, companyId, userId) => api.post('/auth/session-token', { token, companyId, userId }),
  // Get current session token (for QR code generation)
  // Use a shorter timeout for this specific call
  getSessionToken: () => {
    return api.get('/auth/session-token', {
      timeout: 5000 // 5 second timeout instead of 30
    });
  },

  // Admin
  getAdminDashboard: () => api.get('/admin/dashboard'),
  getAdminVehicles: (params = {}) => api.get('/admin/vehicles', { params }),
  getAdminReservations: (params = {}) => api.get('/admin/reservations', { params }),
  getAdminCustomers: (params = {}) => api.get('/admin/customers', { params }),
  getViolations: (params = {}) => api.get('/violations', { params }),
  // External violations finder API - proxied through backend to avoid CORS
  // Returns immediately with requestId, processing runs in background
  findViolations: (companyId, states, dateFrom, dateTo) => {
    const body = {};
    if (states && Array.isArray(states) && states.length > 0) {
      body.states = states;
    }
    if (dateFrom) {
      body.dateFrom = dateFrom;
    }
    if (dateTo) {
      body.dateTo = dateTo;
    }
    
    // Use backend proxy endpoint to avoid CORS issues
    return api.post(`/violations/find/${companyId}`, body);
  },
  // Get violations finding progress - proxied through backend to avoid CORS
  getViolationsProgress: (companyId) => {
    // Use backend proxy endpoint to avoid CORS issues
    // Endpoint: /api/violations/progress/company/{companyId}
    return api.get(`/violations/progress/company/${companyId}`);
  },
  getFindersList: (params = {}) => api.get('/finderslist', { params }),
  saveFindersList: (data) => api.post('/finderslist', { findersList: data.findersList || [] }, { params: { companyId: data.companyId } }),

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

  // Customer License Images
  uploadCustomerLicenseImage: (customerId, side, file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    
    return api.post(`/Media/customers/${customerId}/licenses/${side}`, formData, {
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
  
  // Get list of customer license images (returns actual filenames and URLs)
  getCustomerLicenseImages: (customerId) => {
    return api.get(`/Media/customers/${customerId}/licenses`);
  },
  deleteCustomerLicenseImage: (customerId, side) => {
    return api.delete(`/Media/customers/${customerId}/licenses/${side}`);
  },

  // License Parsing
  parseDriverLicenseBackSide: (file, customerId = null) => {
    const formData = new FormData();
    formData.append('backSideImage', file);
    if (customerId) {
      formData.append('customerId', customerId);
    }

    return api.post('/DriverLicense/parse-back-side', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for parsing operation
    });
  },

  parseDriverLicenseFrontSide: (file, customerId = null) => {
    const formData = new FormData();
    formData.append('frontSideImage', file);
    if (customerId) {
      formData.append('customerId', customerId);
    }

    return api.post('/DriverLicense/parse-front-side', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  parseDriverLicenseBothSides: (frontFile, backFile, customerId = null) => {
    const formData = new FormData();
    formData.append('frontSideImage', frontFile);
    formData.append('backSideImage', backFile);
    if (customerId) {
      formData.append('customerId', customerId);
    }

    return api.post('/DriverLicense/parse-both-sides', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Wizard License Images (temporary storage for new customers without customerId)
  uploadWizardLicenseImage: (wizardId, side, file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    
    // Axios will automatically URL encode path parameters
    // Don't manually encode to avoid double-encoding issues
    console.log('Uploading license image:', {
      wizardId: wizardId,
      side: side,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });
    
    return api.post(`/Media/wizard/${wizardId}/licenses/${side}`, formData, {
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
  // Delete wizard license image
  deleteWizardLicenseImage: (wizardId, side) => {
    return api.delete(`/Media/wizard/${wizardId}/licenses/${side}`);
  },

  // Stripe Connect - using same API functions as admin app
  setupStripeAccount: (companyId) => api.post(`/companies/${companyId}/stripe/setup?source=web`),
  getStripeSettings: () => api.get('/StripeSettings'),
  testStripeConnection: (settingsId) => api.post(`/StripeSettings/${settingsId}/test-connection`),
  getStripeAccountStatus: (companyId, config = {}) => api.get(`/companies/${companyId}/stripe/status?source=web`, config),
  // Combined booking page info (services + locations + stripe check in one request)
  getBookingInfo: (companyId) => api.get(`/booking/info/${companyId}`),
  checkStripeAccount: (companyId) => api.get(`/companies/${companyId}/stripe/check-account`),
  getStripeOnboardingLink: (companyId) => api.get(`/companies/${companyId}/stripe/reauth?json=true&source=web`),
  syncStripeAccountStatus: (companyId) => api.post(`/companies/${companyId}/stripe/sync?source=web`),
  suspendStripeAccount: (companyId, reason) => api.post(`/companies/${companyId}/stripe/suspend`, { reason }),
  reactivateStripeAccount: (companyId) => api.post(`/companies/${companyId}/stripe/reactivate`),
  deleteStripeAccount: (companyId) => api.delete(`/companies/${companyId}/stripe`),
  
  // Stripe Terminal
  createConnectionToken: (companyId) => api.post('/terminal/connection-token', { companyId }),
  createTerminalPaymentIntent: (companyId, amount, currency = 'usd', options = {}) => {
    return api.post('/terminal/create-payment-intent', {
      companyId,
      amount,
      currency,
      captureMethod: options.captureMethod || 'manual',
      description: options.description,
      bookingId: options.bookingId,
      metadata: options.metadata
    });
  },
  capturePaymentIntent: (companyId, paymentIntentId, amountToCapture = null) => {
    return api.post('/terminal/capture-payment-intent', {
      companyId,
      paymentIntentId,
      amountToCapture
    });
  },
  cancelPaymentIntent: (companyId, paymentIntentId) => {
    return api.post('/terminal/cancel-payment-intent', {
      companyId,
      paymentIntentId
    });
  },
  captureTerminalBooking: (paymentIntentId, bookingId) => {
    return api.post('/terminal/capture', {
      paymentIntentId,
      bookingId
    });
  },

  // Booking Services
  addServiceToBooking: (data) => api.post('/BookingServices', data),

  // Meta Integration
  getMetaConnectionStatus: (companyId) => api.get(`/companies/${companyId}/meta/status`),
  getMetaAvailablePages: (companyId) => api.get(`/companies/${companyId}/meta/pages`),
  disconnectMeta: (companyId) => api.post(`/companies/${companyId}/meta/disconnect`),
  selectMetaPage: (companyId, pageId) => api.post(`/companies/${companyId}/meta/select-page`, { pageId }),
  refreshInstagram: (companyId) => api.post(`/companies/${companyId}/meta/refresh-instagram`),
  publishMetaPost: (companyId, data) => api.post(`/companies/${companyId}/meta/publish`, data),
  getInstagramAccount: (companyId) => api.get(`/companies/${companyId}/meta/instagram/account`),
  getInstagramPosts: (companyId, limit = 12) => api.get(`/companies/${companyId}/meta/instagram/posts?limit=${limit}`),
  publishInstagramPhoto: (companyId, data) => api.post(`/companies/${companyId}/meta/instagram/publish`, data),
  getCatalogStatus: (companyId) => api.get(`/companies/${companyId}/meta/catalog/status`),
  createCatalog: (companyId) => api.post(`/companies/${companyId}/meta/catalog/create`),
  syncProductsToCatalog: (companyId) => api.post(`/companies/${companyId}/meta/catalog/sync`),

  // Disputes
  getDisputes: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    return api.get(`/Dispute?${searchParams.toString()}`);
  },
  getDispute: (id) => api.get(`/Dispute/${id}`),
  getDisputeEvidence: (disputeId) => api.get(`/Dispute/${disputeId}/evidence`),
  getDisputeTimeline: (disputeId) => api.get(`/Dispute/${disputeId}/timeline`),
  getDisputeStats: (companyOwnerId) => {
    const params = companyOwnerId ? `?companyOwnerId=${companyOwnerId}` : '';
    return api.get(`/Dispute/stats${params}`);
  },
  submitDisputeEvidence: (disputeId, data) => api.post(`/Dispute/${disputeId}/evidence/submit`, data),
  uploadDisputeDocument: (disputeId, file, evidenceType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidenceType', evidenceType);
    return api.post(`/Dispute/${disputeId}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  acceptDispute: (disputeId) => api.post(`/Dispute/${disputeId}/accept`),
  syncDisputesFromStripe: () => api.post('/Dispute/sync'),
};

// Export the axios instance for direct API calls (e.g., translation service)
export { api };

export default apiService;