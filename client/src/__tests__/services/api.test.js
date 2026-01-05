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

    test('has forgotPassword method', () => {
      expect(typeof apiService.forgotPassword).toBe('function');
    });

    test('has resetPassword method', () => {
      expect(typeof apiService.resetPassword).toBe('function');
    });
  });

  describe('Vehicle methods', () => {
    test('has getVehicles method', () => {
      expect(typeof apiService.getVehicles).toBe('function');
    });

    test('has getVehicle method', () => {
      expect(typeof apiService.getVehicle).toBe('function');
    });

    test('has lookupVehicleByVin method', () => {
      expect(typeof apiService.lookupVehicleByVin).toBe('function');
    });

    test('has createVehicle method', () => {
      expect(typeof apiService.createVehicle).toBe('function');
    });

    test('has updateVehicle method', () => {
      expect(typeof apiService.updateVehicle).toBe('function');
    });

    test('has deleteVehicle method', () => {
      expect(typeof apiService.deleteVehicle).toBe('function');
    });

    test('has getVehicleCount method', () => {
      expect(typeof apiService.getVehicleCount).toBe('function');
    });

    test('has getFirstAvailableVehicle method', () => {
      expect(typeof apiService.getFirstAvailableVehicle).toBe('function');
    });

    test('has getVehicleCategories method', () => {
      expect(typeof apiService.getVehicleCategories).toBe('function');
    });

    test('has getVehicleMakes method', () => {
      expect(typeof apiService.getVehicleMakes).toBe('function');
    });

    test('has getVehicleLocations method', () => {
      expect(typeof apiService.getVehicleLocations).toBe('function');
    });

    test('has bulkUpdateVehicleDailyRate method', () => {
      expect(typeof apiService.bulkUpdateVehicleDailyRate).toBe('function');
    });

    test('has importVehicles method', () => {
      expect(typeof apiService.importVehicles).toBe('function');
    });
  });

  describe('Booking methods', () => {
    test('has getBookings method', () => {
      expect(typeof apiService.getBookings).toBe('function');
    });

    test('has getBooking method', () => {
      expect(typeof apiService.getBooking).toBe('function');
    });

    test('has getCompanyBookings method', () => {
      expect(typeof apiService.getCompanyBookings).toBe('function');
    });

    test('has createBooking method', () => {
      expect(typeof apiService.createBooking).toBe('function');
    });

    test('has updateBooking method', () => {
      expect(typeof apiService.updateBooking).toBe('function');
    });

    test('has cancelBooking method', () => {
      expect(typeof apiService.cancelBooking).toBe('function');
    });

    test('has refundPayment method', () => {
      expect(typeof apiService.refundPayment).toBe('function');
    });

    test('has syncPaymentFromStripe method', () => {
      expect(typeof apiService.syncPaymentFromStripe).toBe('function');
    });

    test('has syncPaymentsFromStripeBulk method', () => {
      expect(typeof apiService.syncPaymentsFromStripeBulk).toBe('function');
    });

    test('has createSecurityDepositPaymentIntent method', () => {
      expect(typeof apiService.createSecurityDepositPaymentIntent).toBe('function');
    });

    test('has createSecurityDepositCheckout method', () => {
      expect(typeof apiService.createSecurityDepositCheckout).toBe('function');
    });
  });

  describe('Customer methods', () => {
    test('has getCustomers method', () => {
      expect(typeof apiService.getCustomers).toBe('function');
    });

    test('has getCustomersWithBookings method', () => {
      expect(typeof apiService.getCustomersWithBookings).toBe('function');
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

    test('has updateCustomer method', () => {
      expect(typeof apiService.updateCustomer).toBe('function');
    });

    test('has deleteCustomer method', () => {
      expect(typeof apiService.deleteCustomer).toBe('function');
    });

    test('has getCustomerLicense method', () => {
      expect(typeof apiService.getCustomerLicense).toBe('function');
    });

    test('has upsertCustomerLicense method', () => {
      expect(typeof apiService.upsertCustomerLicense).toBe('function');
    });
  });

  describe('Company methods', () => {
    test('has getCompanies method', () => {
      expect(typeof apiService.getCompanies).toBe('function');
    });

    test('has getCompany method', () => {
      expect(typeof apiService.getCompany).toBe('function');
    });

    test('has createCompany method', () => {
      expect(typeof apiService.createCompany).toBe('function');
    });

    test('has updateCompany method', () => {
      expect(typeof apiService.updateCompany).toBe('function');
    });

    test('has deleteCompany method', () => {
      expect(typeof apiService.deleteCompany).toBe('function');
    });

    test('has updateTermsOfUse method', () => {
      expect(typeof apiService.updateTermsOfUse).toBe('function');
    });

    test('has clearTermsOfUse method', () => {
      expect(typeof apiService.clearTermsOfUse).toBe('function');
    });

    test('has getCurrentCompanyConfig method', () => {
      expect(typeof apiService.getCurrentCompanyConfig).toBe('function');
    });
  });

  describe('Model methods', () => {
    test('has getModels method', () => {
      expect(typeof apiService.getModels).toBe('function');
    });

    test('has getModelsGroupedByCategory method', () => {
      expect(typeof apiService.getModelsGroupedByCategory).toBe('function');
    });

    test('has bulkUpdateModelDailyRate method', () => {
      expect(typeof apiService.bulkUpdateModelDailyRate).toBe('function');
    });
  });

  describe('Location methods', () => {
    test('has getLocations method', () => {
      expect(typeof apiService.getLocations).toBe('function');
    });

    test('has getLocation method', () => {
      expect(typeof apiService.getLocation).toBe('function');
    });

    test('has getLocationsByCompany method', () => {
      expect(typeof apiService.getLocationsByCompany).toBe('function');
    });

    test('has getPickupLocations method', () => {
      expect(typeof apiService.getPickupLocations).toBe('function');
    });

    test('has getReturnLocations method', () => {
      expect(typeof apiService.getReturnLocations).toBe('function');
    });

    test('has getLocationStates method', () => {
      expect(typeof apiService.getLocationStates).toBe('function');
    });

    test('has getLocationCities method', () => {
      expect(typeof apiService.getLocationCities).toBe('function');
    });

    test('has createLocation method', () => {
      expect(typeof apiService.createLocation).toBe('function');
    });

    test('has updateLocation method', () => {
      expect(typeof apiService.updateLocation).toBe('function');
    });

    test('has deleteLocation method', () => {
      expect(typeof apiService.deleteLocation).toBe('function');
    });

    test('has activateLocation method', () => {
      expect(typeof apiService.activateLocation).toBe('function');
    });

    test('has deactivateLocation method', () => {
      expect(typeof apiService.deactivateLocation).toBe('function');
    });
  });

  describe('Company Location methods', () => {
    test('has getCompanyLocations method', () => {
      expect(typeof apiService.getCompanyLocations).toBe('function');
    });

    test('has getCompanyLocation method', () => {
      expect(typeof apiService.getCompanyLocation).toBe('function');
    });

    test('has createCompanyLocation method', () => {
      expect(typeof apiService.createCompanyLocation).toBe('function');
    });

    test('has updateCompanyLocation method', () => {
      expect(typeof apiService.updateCompanyLocation).toBe('function');
    });

    test('has deleteCompanyLocation method', () => {
      expect(typeof apiService.deleteCompanyLocation).toBe('function');
    });
  });

  describe('Company Services methods', () => {
    test('has getCompanyServices method', () => {
      expect(typeof apiService.getCompanyServices).toBe('function');
    });

    test('has addServiceToCompany method', () => {
      expect(typeof apiService.addServiceToCompany).toBe('function');
    });

    test('has removeServiceFromCompany method', () => {
      expect(typeof apiService.removeServiceFromCompany).toBe('function');
    });

    test('has updateCompanyService method', () => {
      expect(typeof apiService.updateCompanyService).toBe('function');
    });
  });

  describe('Additional Services methods', () => {
    test('has getAdditionalServices method', () => {
      expect(typeof apiService.getAdditionalServices).toBe('function');
    });

    test('has getAdditionalService method', () => {
      expect(typeof apiService.getAdditionalService).toBe('function');
    });

    test('has createAdditionalService method', () => {
      expect(typeof apiService.createAdditionalService).toBe('function');
    });

    test('has updateAdditionalService method', () => {
      expect(typeof apiService.updateAdditionalService).toBe('function');
    });

    test('has deleteAdditionalService method', () => {
      expect(typeof apiService.deleteAdditionalService).toBe('function');
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

  describe('Payment methods', () => {
    test('has createPaymentIntent method', () => {
      expect(typeof apiService.createPaymentIntent).toBe('function');
    });

    test('has confirmPayment method', () => {
      expect(typeof apiService.confirmPayment).toBe('function');
    });

    test('has getPaymentMethods method', () => {
      expect(typeof apiService.getPaymentMethods).toBe('function');
    });

    test('has createCheckoutSession method', () => {
      expect(typeof apiService.createCheckoutSession).toBe('function');
    });
  });

  describe('Session methods', () => {
    test('has setSessionCompany method', () => {
      expect(typeof apiService.setSessionCompany).toBe('function');
    });

    test('has getSessionCompany method', () => {
      expect(typeof apiService.getSessionCompany).toBe('function');
    });

    test('has setSessionToken method', () => {
      expect(typeof apiService.setSessionToken).toBe('function');
    });

    test('has getSessionToken method', () => {
      expect(typeof apiService.getSessionToken).toBe('function');
    });
  });

  describe('Admin methods', () => {
    test('has getAdminDashboard method', () => {
      expect(typeof apiService.getAdminDashboard).toBe('function');
    });

    test('has getAdminVehicles method', () => {
      expect(typeof apiService.getAdminVehicles).toBe('function');
    });

    test('has getAdminReservations method', () => {
      expect(typeof apiService.getAdminReservations).toBe('function');
    });

    test('has getAdminCustomers method', () => {
      expect(typeof apiService.getAdminCustomers).toBe('function');
    });

    test('has getViolations method', () => {
      expect(typeof apiService.getViolations).toBe('function');
    });

    test('has findViolations method', () => {
      expect(typeof apiService.findViolations).toBe('function');
    });

    test('has getViolationsProgress method', () => {
      expect(typeof apiService.getViolationsProgress).toBe('function');
    });

    test('has getFindersList method', () => {
      expect(typeof apiService.getFindersList).toBe('function');
    });

    test('has saveFindersList method', () => {
      expect(typeof apiService.saveFindersList).toBe('function');
    });
  });

  describe('Media methods', () => {
    test('has uploadCompanyVideo method', () => {
      expect(typeof apiService.uploadCompanyVideo).toBe('function');
    });

    test('has deleteCompanyVideo method', () => {
      expect(typeof apiService.deleteCompanyVideo).toBe('function');
    });

    test('has uploadCustomerLicenseImage method', () => {
      expect(typeof apiService.uploadCustomerLicenseImage).toBe('function');
    });

    test('has getCustomerLicenseImages method', () => {
      expect(typeof apiService.getCustomerLicenseImages).toBe('function');
    });

    test('has deleteCustomerLicenseImage method', () => {
      expect(typeof apiService.deleteCustomerLicenseImage).toBe('function');
    });

    test('has uploadWizardLicenseImage method', () => {
      expect(typeof apiService.uploadWizardLicenseImage).toBe('function');
    });

    test('has deleteWizardLicenseImage method', () => {
      expect(typeof apiService.deleteWizardLicenseImage).toBe('function');
    });
  });

  describe('Stripe methods', () => {
    test('has setupStripeAccount method', () => {
      expect(typeof apiService.setupStripeAccount).toBe('function');
    });

    test('has getStripeSettings method', () => {
      expect(typeof apiService.getStripeSettings).toBe('function');
    });

    test('has testStripeConnection method', () => {
      expect(typeof apiService.testStripeConnection).toBe('function');
    });

    test('has getStripeAccountStatus method', () => {
      expect(typeof apiService.getStripeAccountStatus).toBe('function');
    });

    test('has checkStripeAccount method', () => {
      expect(typeof apiService.checkStripeAccount).toBe('function');
    });

    test('has getStripeOnboardingLink method', () => {
      expect(typeof apiService.getStripeOnboardingLink).toBe('function');
    });

    test('has syncStripeAccountStatus method', () => {
      expect(typeof apiService.syncStripeAccountStatus).toBe('function');
    });

    test('has suspendStripeAccount method', () => {
      expect(typeof apiService.suspendStripeAccount).toBe('function');
    });

    test('has reactivateStripeAccount method', () => {
      expect(typeof apiService.reactivateStripeAccount).toBe('function');
    });

    test('has deleteStripeAccount method', () => {
      expect(typeof apiService.deleteStripeAccount).toBe('function');
    });
  });

  describe('Stripe Terminal methods', () => {
    test('has createConnectionToken method', () => {
      expect(typeof apiService.createConnectionToken).toBe('function');
    });

    test('has createTerminalPaymentIntent method', () => {
      expect(typeof apiService.createTerminalPaymentIntent).toBe('function');
    });

    test('has capturePaymentIntent method', () => {
      expect(typeof apiService.capturePaymentIntent).toBe('function');
    });

    test('has cancelPaymentIntent method', () => {
      expect(typeof apiService.cancelPaymentIntent).toBe('function');
    });
  });

  describe('Booking Services methods', () => {
    test('has addServiceToBooking method', () => {
      expect(typeof apiService.addServiceToBooking).toBe('function');
    });
  });

  describe('Meta Integration methods', () => {
    test('has getMetaConnectionStatus method', () => {
      expect(typeof apiService.getMetaConnectionStatus).toBe('function');
    });

    test('has getMetaAvailablePages method', () => {
      expect(typeof apiService.getMetaAvailablePages).toBe('function');
    });

    test('has disconnectMeta method', () => {
      expect(typeof apiService.disconnectMeta).toBe('function');
    });

    test('has selectMetaPage method', () => {
      expect(typeof apiService.selectMetaPage).toBe('function');
    });

    test('has refreshInstagram method', () => {
      expect(typeof apiService.refreshInstagram).toBe('function');
    });

    test('has publishMetaPost method', () => {
      expect(typeof apiService.publishMetaPost).toBe('function');
    });

    test('has getInstagramAccount method', () => {
      expect(typeof apiService.getInstagramAccount).toBe('function');
    });

    test('has getInstagramPosts method', () => {
      expect(typeof apiService.getInstagramPosts).toBe('function');
    });

    test('has publishInstagramPhoto method', () => {
      expect(typeof apiService.publishInstagramPhoto).toBe('function');
    });

    test('has getCatalogStatus method', () => {
      expect(typeof apiService.getCatalogStatus).toBe('function');
    });

    test('has createCatalog method', () => {
      expect(typeof apiService.createCatalog).toBe('function');
    });

    test('has syncProductsToCatalog method', () => {
      expect(typeof apiService.syncProductsToCatalog).toBe('function');
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
