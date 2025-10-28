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
 */
const TRANSLATION_MAP = {
  category_name: 'categories',
  categoryName: 'categories',
  category: 'categories',
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
  
  getVehicleCategories: async () => {
    const response = await apiService.getVehicleCategories();
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
  
  updateVehicle: async (id, data) => {
    const response = await apiService.updateVehicle(id, data);
    return translateResponse(response);
  },
  
  // Reservations
  getReservations: async (params = {}) => {
    const response = await apiService.getReservations(params);
    return translateResponse(response);
  },
  
  getReservation: async (id) => {
    const response = await apiService.getReservation(id);
    return translateResponse(response);
  },
  
  createReservation: async (data) => {
    const response = await apiService.createReservation(data);
    return translateResponse(response);
  },
  
  updateReservation: async (id, data) => {
    const response = await apiService.updateReservation(id, data);
    return translateResponse(response);
  },
  
  cancelReservation: async (id) => {
    const response = await apiService.cancelReservation(id);
    return translateResponse(response);
  },
  
  // Customers
  getCustomers: async (params = {}) => {
    const response = await apiService.getCustomers(params);
    return translateResponse(response);
  },
  
  getCustomer: async (id) => {
    const response = await apiService.getCustomer(id);
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
    return translateResponse(response);
  },

  getReturnLocations: async (companyId = null) => {
    const response = await apiService.getReturnLocations(companyId);
    return translateResponse(response);
  },

  getLocationStates: async (companyId = null) => {
    const response = await apiService.getLocationStates(companyId);
    return translateResponse(response);
  },

  getLocationCities: async (params = {}) => {
    const response = await apiService.getLocationCities(params);
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
  }
};

export default translatedApiService;

