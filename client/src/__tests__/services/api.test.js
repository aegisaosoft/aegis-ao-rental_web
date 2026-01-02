/**
 * Unit tests for API service structure
 * @jest-environment jsdom
 */

import { apiService } from '../../services/api';

describe('API Service Structure', () => {
  describe('apiService object', () => {
    test('exports apiService object', () => {
      expect(apiService).toBeDefined();
      expect(typeof apiService).toBe('object');
    });
  });

  describe('Authentication methods', () => {
    test('has login method', () => {
      expect(typeof apiService.login).toBe('function');
    });

    test('has register method', () => {
      expect(typeof apiService.register).toBe('function');
    });

    test('has logout method', () => {
      expect(typeof apiService.logout).toBe('function');
    });

    test('has getProfile method', () => {
      expect(typeof apiService.getProfile).toBe('function');
    });

    test('has updateProfile method', () => {
      expect(typeof apiService.updateProfile).toBe('function');
    });
  });

  describe('Vehicle methods', () => {
    test('has getVehicles method', () => {
      expect(typeof apiService.getVehicles).toBe('function');
    });

    test('has getVehicle method', () => {
      expect(typeof apiService.getVehicle).toBe('function');
    });
  });

  describe('Booking methods', () => {
    test('has getBookings method', () => {
      expect(typeof apiService.getBookings).toBe('function');
    });

    test('has getBooking method', () => {
      expect(typeof apiService.getBooking).toBe('function');
    });

    test('has createBooking method', () => {
      expect(typeof apiService.createBooking).toBe('function');
    });
  });

  describe('Customer methods', () => {
    test('has getCustomers method', () => {
      expect(typeof apiService.getCustomers).toBe('function');
    });

    test('has getCustomer method', () => {
      expect(typeof apiService.getCustomer).toBe('function');
    });

    test('has getCustomerByEmail method', () => {
      expect(typeof apiService.getCustomerByEmail).toBe('function');
    });

    test('has createCustomer method', () => {
      expect(typeof apiService.createCustomer).toBe('function');
    });
  });

  describe('Company methods', () => {
    test('has getCompanies method', () => {
      expect(typeof apiService.getCompanies).toBe('function');
    });

    test('has getCurrentCompanyConfig method', () => {
      expect(typeof apiService.getCurrentCompanyConfig).toBe('function');
    });
  });

  describe('Model methods', () => {
    test('has getModels method', () => {
      expect(typeof apiService.getModels).toBe('function');
    });
  });

  describe('Location methods', () => {
    test('has getLocations method', () => {
      expect(typeof apiService.getLocations).toBe('function');
    });
  });
});
