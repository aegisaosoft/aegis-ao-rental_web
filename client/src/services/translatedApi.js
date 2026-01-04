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

import { apiService } from './api';
import i18n from '../i18n/config';

/**
 * Translates a single value based on its type
 */
const translateValue = (key, value) => {
  if (!value) return value;
  
  const valueKey = value.toString().toLowerCase().replace(/\s+/g, '-');
  const translationKey = `${key}.${valueKey}`;
  const translated = i18n.t(translationKey);
  
  // If no translation found, return original
  return translated === translationKey ? value : translated;
};

/**
 * Fields that should be translated
 * Note: Categories are translated manually in the UI, so we don't translate them here
 */
const TRANSLATION_MAP = {
  fuel_type: 'fuelTypes',
  fuelType: 'fuelTypes',
  transmission: 'transmission',
  status: 'status'
};

/**
 * Translates an object's fields
 */
const translateObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const translated = { ...obj };
  
  Object.keys(TRANSLATION_MAP).forEach(field => {
    if (translated[field]) {
      translated[`${field}_original`] = translated[field]; // Keep original
      translated[field] = translateValue(TRANSLATION_MAP[field], translated[field]);
    }
  });
  
  return translated;
};

/**
 * Translates array of objects
 */
const translateArray = (array) => {
  if (!Array.isArray(array)) return array;
  return array.map(item => translateObject(item));
};

/**
 * Translates API response data
 */
const translateResponse = (response) => {
  if (!response) return response;
  
  // Handle axios response structure
  if (response.data) {
    if (Array.isArray(response.data)) {
      response.data = translateArray(response.data);
    } else if (typeof response.data === 'object') {
      // Check if data has items/results array
      if (response.data.items) {
        response.data.items = translateArray(response.data.items);
      } else if (response.data.results) {
        response.data.results = translateArray(response.data.results);
      } else {
        response.data = translateObject(response.data);
      }
    }
  } else if (Array.isArray(response)) {
    return translateArray(response);
  } else if (typeof response === 'object') {
    return translateObject(response);
  }
  
  return response;
};

/**
 * Wrapped API service with automatic translation
 */
export const translatedApiService = {
  // Vehicles
  getVehicles: async (params = {}) => {
    const response = await apiService.getVehicles(params);
    return translateResponse(response);
  },
  
  getVehicle: async (id) => {
    const response = await apiService.getVehicle(id);
    return translateResponse(response);
  },
  lookupVehicleByVin: async (vin) => {
    const response = await apiService.lookupVehicleByVin(vin);
    return translateResponse(response);
  },
  createVehicle: async (data) => {
    const response = await apiService.createVehicle(data);
    return translateResponse(response);
  },
  
  updateVehicle: async (id, data) => {
    const response = await apiService.updateVehicle(id, data);
    return translateResponse(response);
  },
  
  deleteVehicle: async (id) => {
    const response = await apiService.deleteVehicle(id);
    return translateResponse(response);
  },
  
  getVehicleCount: async (companyId) => {
    const response = await apiService.getVehicleCount(companyId);
    return translateResponse(response);
  },
  
  getFirstAvailableVehicle: async (params = {}) => {
    const response = await apiService.getFirstAvailableVehicle(params);
    return translateResponse(response);
  },
  
  getVehicleCategories: async (companyId) => {
    const response = await apiService.getVehicleCategories(companyId);
    return translateResponse(response);
  },
  
  getVehicleMakes: async () => {
    const response = await apiService.getVehicleMakes();
    return translateResponse(response);
  },
  
  getVehicleLocations: async () => {
    const response = await apiService.getVehicleLocations();
    return translateResponse(response);
  },
  
  bulkUpdateVehicleDailyRate: async (data) => {
    const response = await apiService.bulkUpdateVehicleDailyRate(data);
    return translateResponse(response);
  },

  importVehicles: async (formData) => {
    const response = await apiService.importVehicles(formData);
    return translateResponse(response);
  },

  // Models
  getModelsGroupedByCategory: async (companyId, locationId, pickupDate, returnDate) => {
    const response = await apiService.getModelsGroupedByCategory(companyId, locationId, pickupDate, returnDate);
    return translateResponse(response);
  },
  
  getModels: async (params = {}) => {
    const response = await apiService.getModels(params);
    return translateResponse(response);
  },
  
  bulkUpdateModelDailyRate: async (data) => {
    const response = await apiService.bulkUpdateModelDailyRate(data);
    return translateResponse(response);
  },

  // Reservations
  getBookings: async (params = {}) => {
    const response = await apiService.getBookings(params);
    return translateResponse(response);
  },
  
  getBooking: async (id, params = {}) => {
    const response = await apiService.getBooking(id, params);
    return translateResponse(response);
  },

  getCompanyBookings: async (companyId, params = {}) => {
    const response = await apiService.getCompanyBookings(companyId, params);
    return translateResponse(response);
  },
  
  createBooking: async (data) => {
    const response = await apiService.createBooking(data);
    return translateResponse(response);
  },
  
  updateBooking: async (id, data) => {
    const response = await apiService.updateBooking(id, data);
    return translateResponse(response);
  },
  
  syncPaymentFromStripe: async (bookingId) => {
    const response = await apiService.syncPaymentFromStripe(bookingId);
    return translateResponse(response);
  },
  
  syncPaymentsFromStripeBulk: async (bookingIds) => {
    // No translation needed for sync results, just pass through
    return apiService.syncPaymentsFromStripeBulk(bookingIds);
  },
  
  refundPayment: async (bookingId, amount, reason) => {
    return apiService.refundPayment(bookingId, amount, reason);
  },
  
  createSecurityDepositPaymentIntent: async (bookingId) => {
    const response = await apiService.createSecurityDepositPaymentIntent(bookingId);
    return translateResponse(response);
  },
  
  createSecurityDepositCheckout: async (bookingId, language) => {
    const response = await apiService.createSecurityDepositCheckout(bookingId, language);
    return translateResponse(response);
  },
  
  // Rental Agreements
  getRentalAgreement: async (bookingId) => {
    const response = await apiService.getRentalAgreement(bookingId);
    return translateResponse(response);
  },
  signBookingAgreement: async (bookingId, agreementData) => {
    const response = await apiService.signBookingAgreement(bookingId, agreementData);
    return translateResponse(response);
  },
  
  cancelBooking: async (id) => {
    const response = await apiService.cancelBooking(id);
    return translateResponse(response);
  },
  
  // Customers
  getCustomers: async (params = {}) => {
    const response = await apiService.getCustomers(params);
    return response;
  },
  getCustomersWithBookings: async (companyId, params = {}) => {
    const response = await apiService.getCustomersWithBookings(companyId, params);
    return translateResponse(response);
  },
  
  getCustomer: async (id) => {
    const response = await apiService.getCustomer(id);
    return translateResponse(response);
  },
  getCustomerByEmail: async (email) => {
    const response = await apiService.getCustomerByEmail(email);
    return translateResponse(response);
  },
  createCustomer: async (data) => {
    const response = await apiService.createCustomer(data);
    return translateResponse(response);
  },
  
  updateCustomer: async (id, data) => {
    const response = await apiService.updateCustomer(id, data);
    return translateResponse(response);
  },
  
  // Customer Licenses
  getCustomerLicense: async (customerId) => {
    const response = await apiService.getCustomerLicense(customerId);
    return translateResponse(response);
  },
  
  upsertCustomerLicense: async (customerId, data) => {
    const response = await apiService.upsertCustomerLicense(customerId, data);
    return translateResponse(response);
  },
  
  // Payments
  createPaymentIntent: async (data) => {
    const response = await apiService.createPaymentIntent(data);
    return translateResponse(response);
  },
  
  confirmPayment: async (paymentIntentId) => {
    const response = await apiService.confirmPayment(paymentIntentId);
    return translateResponse(response);
  },
  
  getPaymentMethods: async (customerId) => {
    const response = await apiService.getPaymentMethods(customerId);
    return translateResponse(response);
  },
  createCheckoutSession: async (data) => {
    const response = await apiService.createCheckoutSession(data);
    return translateResponse(response);
  },

  // Companies
  getCompanies: async (params = {}) => {
    const response = await apiService.getCompanies(params);
    return translateResponse(response);
  },

  getCompany: async (id) => {
    const response = await apiService.getCompany(id);
    return translateResponse(response);
  },

  updateCompany: async (id, data) => {
    const response = await apiService.updateCompany(id, data);
    return translateResponse(response);
  },

  createCompany: async (data) => {
    const response = await apiService.createCompany(data);
    return translateResponse(response);
  },

  // Stripe Connect
  setupStripeAccount: async (companyId) => {
    const response = await apiService.setupStripeAccount(companyId);
    return translateResponse(response);
  },
  
  getStripeSettings: async () => {
    const response = await apiService.getStripeSettings();
    return translateResponse(response);
  },
  
  testStripeConnection: async (settingsId) => {
    const response = await apiService.testStripeConnection(settingsId);
    return translateResponse(response);
  },
  
  getStripeAccountStatus: async (companyId) => {
    const response = await apiService.getStripeAccountStatus(companyId);
    return translateResponse(response);
  },
  checkStripeAccount: async (companyId) => {
    const response = await apiService.checkStripeAccount(companyId);
    return translateResponse(response);
  },
  getStripeOnboardingLink: async (companyId) => {
    const response = await apiService.getStripeOnboardingLink(companyId);
    return translateResponse(response);
  },
  syncStripeAccountStatus: async (companyId) => {
    const response = await apiService.syncStripeAccountStatus(companyId);
    return translateResponse(response);
  },

  deleteCompany: async (id) => {
    const response = await apiService.deleteCompany(id);
    return translateResponse(response);
  },

  // Locations
  getLocations: async (params = {}) => {
    const response = await apiService.getLocations(params);
    return translateResponse(response);
  },

  getLocation: async (id) => {
    const response = await apiService.getLocation(id);
    return translateResponse(response);
  },

  getLocationsByCompany: async (companyId) => {
    const response = await apiService.getLocationsByCompany(companyId);
    return translateResponse(response);
  },

  getPickupLocations: async (companyId = null) => {
    const response = await apiService.getPickupLocations(companyId);
    const translated = translateResponse(response);
    // Return the data directly, not the axios response object
    // Handle both cases: response object with Result property (standardized response), or data directly
    if (Array.isArray(translated)) {
      return translated;
    }
    // Handle standardized response format: { Result: [...], Reason: 0, ... }
    if (translated && typeof translated === 'object' && 'Result' in translated) {
      return Array.isArray(translated.Result) ? translated.Result : [];
    }
    // Handle axios response with data property
    if (translated && typeof translated === 'object' && 'data' in translated) {
      // If data has Result property (standardized response)
      if (translated.data && typeof translated.data === 'object' && 'Result' in translated.data) {
        return Array.isArray(translated.data.Result) ? translated.data.Result : [];
      }
      return Array.isArray(translated.data) ? translated.data : [];
    }
    return [];
  },

  getReturnLocations: async (companyId = null) => {
    const response = await apiService.getReturnLocations(companyId);
    const translated = translateResponse(response);
    // Return the data directly, not the axios response object
    // Handle both cases: response object with Result property (standardized response), or data directly
    if (Array.isArray(translated)) {
      return translated;
    }
    // Handle standardized response format: { Result: [...], Reason: 0, ... }
    if (translated && typeof translated === 'object' && 'Result' in translated) {
      return Array.isArray(translated.Result) ? translated.Result : [];
    }
    // Handle axios response with data property
    if (translated && typeof translated === 'object' && 'data' in translated) {
      // If data has Result property (standardized response)
      if (translated.data && typeof translated.data === 'object' && 'Result' in translated.data) {
        return Array.isArray(translated.data.Result) ? translated.data.Result : [];
      }
      return Array.isArray(translated.data) ? translated.data : [];
    }
    return [];
  },

  getLocationStates: async (companyId = null) => {
    const response = await apiService.getLocationStates(companyId);
    const translated = translateResponse(response);
    // Return the data directly, not the axios response object
    // Handle both cases: response object with data property, or data directly
    if (Array.isArray(translated)) {
      return translated;
    }
    if (translated && typeof translated === 'object' && 'data' in translated) {
      return Array.isArray(translated.data) ? translated.data : [];
    }
    return [];
  },

  getLocationCities: async (params = {}) => {
    const response = await apiService.getLocationCities(params);
    const translated = translateResponse(response);
    // Return the data directly, not the axios response object
    // Handle both cases: response object with data property, or data directly
    if (Array.isArray(translated)) {
      return translated;
    }
    if (translated && typeof translated === 'object' && 'data' in translated) {
      return Array.isArray(translated.data) ? translated.data : [];
    }
    return [];
  },
  
  // Company Locations
  getCompanyLocations: async (params = {}) => {
    const response = await apiService.getCompanyLocations(params);
    const translated = translateResponse(response);
    // Return the data directly, not the axios response object
    // Handle both cases: response object with data property, or data directly
    if (Array.isArray(translated)) {
      return translated;
    }
    if (translated && typeof translated === 'object' && 'data' in translated) {
      return Array.isArray(translated.data) ? translated.data : [];
    }
    return [];
  },
  
  getCompanyLocation: async (id) => {
    const response = await apiService.getCompanyLocation(id);
    return translateResponse(response);
  },
  
  createCompanyLocation: async (data) => {
    const response = await apiService.createCompanyLocation(data);
    return translateResponse(response);
  },
  
  updateCompanyLocation: async (id, data) => {
    const response = await apiService.updateCompanyLocation(id, data);
    return translateResponse(response);
  },
  
  deleteCompanyLocation: async (id) => {
    const response = await apiService.deleteCompanyLocation(id);
    return translateResponse(response);
  },
  
  // Company Services
  getCompanyServices: async (companyId, params = {}) => {
    const response = await apiService.getCompanyServices(companyId, params);
    return translateResponse(response);
  },
  
  addServiceToCompany: async (data) => {
    const response = await apiService.addServiceToCompany(data);
    return translateResponse(response);
  },
  
  removeServiceFromCompany: async (companyId, serviceId) => {
    const response = await apiService.removeServiceFromCompany(companyId, serviceId);
    return translateResponse(response);
  },
  
  updateCompanyService: async (companyId, serviceId, data) => {
    const response = await apiService.updateCompanyService(companyId, serviceId, data);
    return translateResponse(response);
  },
  
  // Additional Services
  getAdditionalServices: async (params = {}) => {
    const response = await apiService.getAdditionalServices(params);
    return translateResponse(response);
  },
  
  getAdditionalService: async (id) => {
    const response = await apiService.getAdditionalService(id);
    return translateResponse(response);
  },
  
  createAdditionalService: async (data) => {
    const response = await apiService.createAdditionalService(data);
    return translateResponse(response);
  },
  
  updateAdditionalService: async (id, data) => {
    const response = await apiService.updateAdditionalService(id, data);
    return translateResponse(response);
  },
  
  deleteAdditionalService: async (id) => {
    const response = await apiService.deleteAdditionalService(id);
    return translateResponse(response);
  },

  createLocation: async (data) => {
    const response = await apiService.createLocation(data);
    return translateResponse(response);
  },

  updateLocation: async (id, data) => {
    const response = await apiService.updateLocation(id, data);
    return translateResponse(response);
  },

  deleteLocation: async (id) => {
    const response = await apiService.deleteLocation(id);
    return translateResponse(response);
  },

  activateLocation: async (id) => {
    const response = await apiService.activateLocation(id);
    return translateResponse(response);
  },

  deactivateLocation: async (id) => {
    const response = await apiService.deactivateLocation(id);
    return translateResponse(response);
  },
  
  // Session
  setSessionCompany: async (companyId) => {
    const response = await apiService.setSessionCompany(companyId);
    return translateResponse(response);
  },
  
  getSessionCompany: async () => {
    const response = await apiService.getSessionCompany();
    return translateResponse(response);
  },
  
  // Set token in session (for QR code scan)
  setSessionToken: async (token, companyId, userId) => {
    return await apiService.setSessionToken(token, companyId, userId);
  },
  
  // Get current session token (for QR code generation)
  getSessionToken: async () => {
    return await apiService.getSessionToken();
  },
  
  // Admin
  getAdminDashboard: async () => {
    const response = await apiService.getAdminDashboard();
    return translateResponse(response);
  },
  
  getAdminVehicles: async (params = {}) => {
    const response = await apiService.getAdminVehicles(params);
    return translateResponse(response);
  },
  
  getAdminReservations: async (params = {}) => {
    const response = await apiService.getAdminReservations(params);
    return translateResponse(response);
  },
  
  getAdminCustomers: async (params = {}) => {
    const response = await apiService.getAdminCustomers(params);
    return translateResponse(response);
  },
  
  getViolations: async (params = {}) => {
    const response = await apiService.getViolations(params);
    return translateResponse(response);
  },
  
  findViolations: async (companyId, states, dateFrom, dateTo) => {
    const response = await apiService.findViolations(companyId, states, dateFrom, dateTo);
    return translateResponse(response);
  },
  
  getViolationsProgress: async (companyId) => {
    const response = await apiService.getViolationsProgress(companyId);
    return translateResponse(response);
  },
  
  getFindersList: async (params = {}) => {
    const response = await apiService.getFindersList(params);
    return translateResponse(response);
  },
  saveFindersList: async (data) => {
    const response = await apiService.saveFindersList(data);
    return translateResponse(response);
  },
  
  // Authentication
  login: async (credentials) => {
    return await apiService.login(credentials);
  },
  
  register: async (userData) => {
    return await apiService.register(userData);
  },
  
  getProfile: async () => {
    return await apiService.getProfile();
  },
  
  updateProfile: async (data) => {
    return await apiService.updateProfile(data);
  },

  // Terms of Use
  updateTermsOfUse: async (companyId, termsOfUse) => {
    const response = await apiService.updateTermsOfUse(companyId, termsOfUse);
    return translateResponse(response);
  },

  // Media uploads (no translation needed for binary data)
  uploadCompanyVideo: async (companyId, file, onProgress) => {
    return await apiService.uploadCompanyVideo(companyId, file, onProgress);
  },
  
  deleteCompanyVideo: async (companyId) => {
    return await apiService.deleteCompanyVideo(companyId);
  },
  
  uploadCompanyBanner: async (companyId, file, onProgress) => {
    return await apiService.uploadCompanyBanner(companyId, file, onProgress);
  },
  
  deleteCompanyBanner: async (companyId) => {
    return await apiService.deleteCompanyBanner(companyId);
  },
  
  uploadCompanyLogo: async (companyId, file, onProgress) => {
    return await apiService.uploadCompanyLogo(companyId, file, onProgress);
  },
  
  deleteCompanyLogo: async (companyId) => {
    return await apiService.deleteCompanyLogo(companyId);
  },
  
  // Customer License Images (no translation needed for binary data)
  uploadCustomerLicenseImage: async (customerId, side, file, onProgress) => {
    return await apiService.uploadCustomerLicenseImage(customerId, side, file, onProgress);
  },
  
  // Get list of customer license images (returns actual filenames and URLs)
  getCustomerLicenseImages: async (customerId) => {
    return await apiService.getCustomerLicenseImages(customerId);
  },
  
  // Delete customer license image
  deleteCustomerLicenseImage: async (customerId, side) => {
    return await apiService.deleteCustomerLicenseImage(customerId, side);
  },
  
  // Wizard License Images (temporary storage for new customers without customerId)
  uploadWizardLicenseImage: async (wizardId, side, file, onProgress) => {
    return await apiService.uploadWizardLicenseImage(wizardId, side, file, onProgress);
  },
  
  deleteWizardLicenseImage: async (wizardId, side) => {
    return await apiService.deleteWizardLicenseImage(wizardId, side);
  },
  
  // Meta Integration (no translation needed for these)
  getMetaConnectionStatus: async (companyId) => {
    const response = await apiService.getMetaConnectionStatus(companyId);
    return response.data || response;
  },
  
  getMetaAvailablePages: async (companyId) => {
    const response = await apiService.getMetaAvailablePages(companyId);
    return response.data || response;
  },
  
  disconnectMeta: async (companyId) => {
    const response = await apiService.disconnectMeta(companyId);
    return response.data || response;
  },
  
  selectMetaPage: async (companyId, pageId) => {
    const response = await apiService.selectMetaPage(companyId, pageId);
    return response.data || response;
  },
  
  refreshInstagram: async (companyId) => {
    const response = await apiService.refreshInstagram(companyId);
    return response.data || response;
  },
  
  publishMetaPost: async (companyId, data) => {
    const response = await apiService.publishMetaPost(companyId, data);
    return response.data || response;
  },
  
  getInstagramAccount: async (companyId) => {
    const response = await apiService.getInstagramAccount(companyId);
    return response.data || response;
  },
  
  getInstagramPosts: async (companyId, limit = 12) => {
    const response = await apiService.getInstagramPosts(companyId, limit);
    return response.data || response;
  },
  
  publishInstagramPhoto: async (companyId, data) => {
    const response = await apiService.publishInstagramPhoto(companyId, data);
    return response.data || response;
  },
  
  getCatalogStatus: async (companyId) => {
    const response = await apiService.getCatalogStatus(companyId);
    return response.data || response;
  },
  
  createCatalog: async (companyId) => {
    const response = await apiService.createCatalog(companyId);
    return response.data || response;
  },
  
  syncProductsToCatalog: async (companyId) => {
    const response = await apiService.syncProductsToCatalog(companyId);
    return response.data || response;
  },
  
  // Service assignment helpers
  assignServiceToCompany: async (companyId, serviceId, data = {}) => {
    const response = await apiService.addServiceToCompany({
      companyId,
      additionalServiceId: serviceId,
      ...data
    });
    return response.data || response;
  },
  
  unassignServiceFromCompany: async (companyId, serviceId) => {
    const response = await apiService.removeServiceFromCompany(companyId, serviceId);
    return response.data || response;
  },
  
};

export default translatedApiService;

