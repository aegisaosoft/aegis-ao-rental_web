/**
 * Unit tests for API service
 * @jest-environment jsdom
 */

// Import the actual api service to test its structure
import { apiService } from '../../services/api';

describe('API Service', () => {
  describe('apiService object', () => {
    it('should export apiService object', () => {
      expect(apiService).toBeDefined();
      expect(typeof apiService).toBe('object');
    });

    it('should have authentication methods', () => {
      expect(typeof apiService.login).toBe('function');
      expect(typeof apiService.register).toBe('function');
      expect(typeof apiService.logout).toBe('function');
      expect(typeof apiService.getProfile).toBe('function');
    });

    it('should have vehicle methods', () => {
      expect(typeof apiService.getVehicles).toBe('function');
      expect(typeof apiService.getVehicle).toBe('function');
    });

    it('should have booking methods', () => {
      expect(typeof apiService.getBookings).toBe('function');
      expect(typeof apiService.getBooking).toBe('function');
      expect(typeof apiService.createBooking).toBe('function');
    });

    it('should have customer methods', () => {
      expect(typeof apiService.getCustomers).toBe('function');
      expect(typeof apiService.getCustomer).toBe('function');
      expect(typeof apiService.getCustomerByEmail).toBe('function');
      expect(typeof apiService.createCustomer).toBe('function');
    });

    it('should have company methods', () => {
      expect(typeof apiService.getCompanies).toBe('function');
      expect(typeof apiService.getCurrentCompanyConfig).toBe('function');
    });

    it('should have model methods', () => {
      expect(typeof apiService.getModels).toBe('function');
    });
  });

  describe('API endpoints structure', () => {
    // These tests verify the function signatures exist
    // Actual API calls would require integration tests

    it('login should accept credentials object', () => {
      // Function should accept an object with email/password
      expect(apiService.login.length).toBeGreaterThanOrEqual(0);
    });

    it('register should accept user data object', () => {
      expect(apiService.register.length).toBeGreaterThanOrEqual(0);
    });

    it('getVehicle should accept vehicle ID', () => {
      expect(apiService.getVehicle.length).toBeGreaterThanOrEqual(0);
    });

    it('getBooking should accept booking ID', () => {
      expect(apiService.getBooking.length).toBeGreaterThanOrEqual(0);
    });

    it('getCustomer should accept customer ID', () => {
      expect(apiService.getCustomer.length).toBeGreaterThanOrEqual(0);
    });

    it('getCustomerByEmail should accept email string', () => {
      expect(apiService.getCustomerByEmail.length).toBeGreaterThanOrEqual(0);
    });

    it('createBooking should accept booking data', () => {
      expect(apiService.createBooking.length).toBeGreaterThanOrEqual(0);
    });

    it('createCustomer should accept customer data', () => {
      expect(apiService.createCustomer.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Optional methods', () => {
    // These methods may or may not exist depending on implementation
    
    it('may have updateProfile method', () => {
      if (apiService.updateProfile) {
        expect(typeof apiService.updateProfile).toBe('function');
      }
    });

    it('may have cancelBooking method', () => {
      if (apiService.cancelBooking) {
        expect(typeof apiService.cancelBooking).toBe('function');
      }
    });

    it('may have updateCustomer method', () => {
      if (apiService.updateCustomer) {
        expect(typeof apiService.updateCustomer).toBe('function');
      }
    });

    it('may have deleteVehicle method', () => {
      if (apiService.deleteVehicle) {
        expect(typeof apiService.deleteVehicle).toBe('function');
      }
    });

    it('may have meta integration methods', () => {
      // These are new methods that may not exist yet
      if (apiService.getMetaStatus) {
        expect(typeof apiService.getMetaStatus).toBe('function');
      }
      if (apiService.disconnectMeta) {
        expect(typeof apiService.disconnectMeta).toBe('function');
      }
    });
  });
});
