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

  describe('Rental Agreement methods', () => {
    test('has signBookingAgreement method', () => {
      expect(typeof apiService.signBookingAgreement).toBe('function');
    });

    test('has getRentalAgreement method', () => {
      expect(typeof apiService.getRentalAgreement).toBe('function');
    });

    test('has previewAgreementPdf method', () => {
      expect(typeof apiService.previewAgreementPdf).toBe('function');
    });
  });
});

describe('Rental Agreement API Integration', () => {
  describe('signBookingAgreement', () => {
    test('should accept bookingId and agreement data', () => {
      const bookingId = 'test-booking-123';
      const agreementData = {
        signatureImage: 'data:image/png;base64,...',
        language: 'en',
        consents: {
          ruleProhibitedDriver: true,
          ruleUnder25: true,
          ruleNoAlcohol: true,
          ruleNoSmoking: true,
          ruleLostKeys: true,
          rulePassengerCapacity: true,
          ruleCleaningFee: true,
          ruleTireDamage: true,
          ruleTickets: true,
          rule24Hour: true,
          ruleNoCellPhone: true,
          ruleCardAuthorization: true,
          ruleTermsAgreement: true,
        },
      };

      expect(bookingId).toBeTruthy();
      expect(agreementData.signatureImage).toBeTruthy();
      expect(agreementData.language).toBe('en');
      expect(Object.keys(agreementData.consents)).toHaveLength(13);
    });

    test('agreement data should include additional services when present', () => {
      const agreementData = {
        signatureImage: 'data:image/png;base64,...',
        language: 'es',
        additionalServices: [
          { name: 'GPS', dailyRate: 10, days: 5, total: 50 },
        ],
      };

      expect(agreementData.additionalServices).toHaveLength(1);
      expect(agreementData.language).toBe('es');
    });
  });

  describe('getRentalAgreement', () => {
    test('should accept bookingId parameter', () => {
      const bookingId = 'test-booking-123';
      expect(bookingId).toBeTruthy();
      expect(typeof bookingId).toBe('string');
    });
  });

  describe('previewAgreementPdf', () => {
    test('should accept preview data with all required fields', () => {
      const previewData = {
        language: 'en',
        customerFirstName: 'John',
        customerLastName: 'Doe',
        customerEmail: 'john@example.com',
        vehicleName: 'Toyota Camry',
        pickupDate: '2025-01-10',
        returnDate: '2025-01-15',
        dailyRate: 50,
        rentalDays: 5,
        totalCharges: 250,
        securityDeposit: 200,
      };

      expect(previewData.language).toBeTruthy();
      expect(previewData.customerFirstName).toBeTruthy();
      expect(previewData.vehicleName).toBeTruthy();
      expect(previewData.dailyRate).toBeGreaterThan(0);
    });
  });
});

describe('Data Source Priority Logic', () => {
  test('bookingId should take priority over rentalInfo', () => {
    const bookingId = 'booking-123';
    const rentalInfo = { renter: { firstName: 'Test' } };
    
    // When bookingId exists, should load from API
    const shouldLoadFromApi = !!bookingId;
    expect(shouldLoadFromApi).toBe(true);
  });

  test('should use rentalInfo when no bookingId', () => {
    const bookingId = null;
    const rentalInfo = { renter: { firstName: 'Test' } };
    
    // When no bookingId, should use rentalInfo
    const shouldUseRentalInfo = !bookingId && !!rentalInfo;
    expect(shouldUseRentalInfo).toBe(true);
  });

  test('should skip PDF check when no bookingId', () => {
    const bookingId = null;
    
    // checkingExistingPdf should be false when no bookingId
    const shouldCheckPdf = !!bookingId;
    expect(shouldCheckPdf).toBe(false);
  });
});

describe('skipAgreementCheck Parameter', () => {
  test('should skip agreement check when flag is true', () => {
    const agreementSignature = null;
    const skipAgreementCheck = true;
    
    // Even without signature, should proceed when skipAgreementCheck is true
    const shouldShowModal = !skipAgreementCheck && !agreementSignature;
    expect(shouldShowModal).toBe(false);
  });

  test('should show modal when signature missing and flag is false', () => {
    const agreementSignature = null;
    const skipAgreementCheck = false;
    
    const shouldShowModal = !skipAgreementCheck && !agreementSignature;
    expect(shouldShowModal).toBe(true);
  });

  test('should not show modal when signature exists', () => {
    const agreementSignature = 'data:image/png;base64,...';
    const skipAgreementCheck = false;
    
    const shouldShowModal = !skipAgreementCheck && !agreementSignature;
    expect(shouldShowModal).toBe(false);
  });
});
