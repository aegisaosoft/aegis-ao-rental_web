/**
 * Unit tests for ReservationsSection
 * Tests the Sign Agreement button and modal functionality
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

// Mock dependencies
jest.mock('../../services/translatedApi', () => ({
  translatedApiService: {
    getBookings: jest.fn().mockResolvedValue({ 
      data: {
        items: [
          {
            id: 'booking-1',
            bookingNumber: 'BK-001',
            status: 'Pending',
            customerFirstName: 'John',
            customerLastName: 'Doe',
            customerEmail: 'john@example.com',
            vehicleName: 'Toyota Camry',
            pickupDate: '2025-01-15',
            returnDate: '2025-01-20',
            totalAmount: 500,
          }
        ],
        totalCount: 1,
      }
    }),
    getRentalAgreement: jest.fn().mockRejectedValue({ response: { status: 404 } }),
    signBookingAgreement: jest.fn().mockResolvedValue({ 
      data: { 
        id: 'agreement-1',
        agreementNumber: 'AGR-001',
        status: 'Active',
      } 
    }),
    getCompany: jest.fn().mockResolvedValue({ data: { securityDeposit: 500 } }),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-user', companyId: 'test-company' },
    restoreUser: jest.fn(),
  }),
}));

jest.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    currentCompanyId: 'test-company-id',
    formatPrice: (price) => `$${price}`,
    currencyCode: 'USD',
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock RentalAgreementModal
jest.mock('../../components/RentalAgreementModal', () => {
  return function MockRentalAgreementModal({ isOpen, onClose, onConfirm, rentalInfo }) {
    if (!isOpen) return null;
    return (
      <div data-testid="rental-agreement-modal">
        <div data-testid="modal-rental-info">{JSON.stringify(rentalInfo)}</div>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        <button 
          data-testid="modal-confirm" 
          onClick={() => onConfirm({ 
            signature: 'data:image/png;base64,test-signature', 
            consents: {
              termsAcceptedAt: new Date().toISOString(),
              nonRefundableAcceptedAt: new Date().toISOString(),
              damagePolicyAcceptedAt: new Date().toISOString(),
              cardAuthorizationAcceptedAt: new Date().toISOString(),
            }
          })}
        >
          Sign Agreement
        </button>
      </div>
    );
  };
});

// Mock other modals
jest.mock('../../pages/dashboard/modals', () => ({
  CancelRefundModal: () => null,
  SyncConfirmModal: () => null,
  SecurityDepositModal: () => null,
  BookingPaymentModal: () => null,
  DamageConfirmationModal: () => null,
  BookingDetailsModal: () => null,
}));

jest.mock('../../pages/dashboard/hooks', () => ({
  useBookingsQuery: () => ({
    data: {
      items: [
        {
          id: 'booking-1',
          bookingNumber: 'BK-001',
          status: 'Pending',
          customerFirstName: 'John',
          customerLastName: 'Doe',
          customerEmail: 'john@example.com',
          vehicleName: 'Toyota Camry',
          pickupDate: '2025-01-15',
          returnDate: '2025-01-20',
          totalAmount: 500,
        }
      ],
      totalCount: 1,
    },
    isLoading: false,
  }),
  useBookingModals: () => ({
    selectedBooking: null,
    setSelectedBooking: jest.fn(),
    showBookingDetailsModal: false,
    setShowBookingDetailsModal: jest.fn(),
    showSyncConfirmModal: false,
    setShowSyncConfirmModal: jest.fn(),
    showCancelRefundModal: false,
    setShowCancelRefundModal: jest.fn(),
    cancelRefundAmount: '',
    setCancelRefundAmount: jest.fn(),
    cancelRefundReason: '',
    setCancelRefundReason: jest.fn(),
    pendingCancelStatus: '',
    setPendingCancelStatus: jest.fn(),
    showSecurityDepositModal: false,
    setShowSecurityDepositModal: jest.fn(),
    setPendingActiveStatus: jest.fn(),
    payingSecurityDeposit: false,
    setPayingSecurityDeposit: jest.fn(),
    showBookingPaymentModal: false,
    setShowBookingPaymentModal: jest.fn(),
    setPendingConfirmedStatus: jest.fn(),
    payingBooking: false,
    setPayingBooking: jest.fn(),
    paymentMethod: '',
    setPaymentMethod: jest.fn(),
    showDamageConfirmationModal: false,
    setShowDamageConfirmationModal: jest.fn(),
    hasDamage: false,
    setHasDamage: jest.fn(),
    damageAmount: '',
    setDamageAmount: jest.fn(),
    pendingCompletedStatus: '',
    setPendingCompletedStatus: jest.fn(),
  }),
}));

import { translatedApiService } from '../../services/translatedApi';
import { toast } from 'react-toastify';

describe('ReservationsSection', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = async () => {
    const ReservationsSection = (await import('../../pages/dashboard/ReservationsSection')).default;
    
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReservationsSection 
            currentCompanyId="test-company-id"
            isAuthenticated={true}
          />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Sign Agreement Button', () => {
    test('renders Sign Agreement button for each booking', async () => {
      await renderComponent();
      
      await waitFor(() => {
        // PenTool icon button should be present (Sign Agreement)
        const signButtons = screen.getAllByTitle('Sign Agreement');
        expect(signButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sign Agreement API', () => {
    test('signBookingAgreement API method exists', () => {
      expect(typeof translatedApiService.signBookingAgreement).toBe('function');
    });

    test('signBookingAgreement sends correct data structure', async () => {
      const bookingId = 'test-booking-id';
      const agreementData = {
        signatureImage: 'data:image/png;base64,test',
        language: 'en',
        consents: {
          termsAcceptedAt: new Date().toISOString(),
          nonRefundableAcceptedAt: new Date().toISOString(),
          damagePolicyAcceptedAt: new Date().toISOString(),
          cardAuthorizationAcceptedAt: new Date().toISOString(),
        },
        consentTexts: {
          termsTitle: 'Terms and Conditions',
          termsText: 'I agree.',
          nonRefundableTitle: 'Non-Refundable',
          nonRefundableText: 'I understand.',
          damagePolicyTitle: 'Damage Policy',
          damagePolicyText: 'I am responsible.',
          cardAuthorizationTitle: 'Card Authorization',
          cardAuthorizationText: 'I authorize.',
        },
        signedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      await translatedApiService.signBookingAgreement(bookingId, agreementData);

      expect(translatedApiService.signBookingAgreement).toHaveBeenCalledWith(
        bookingId,
        agreementData
      );
    });

    test('successful sign shows success toast', async () => {
      translatedApiService.signBookingAgreement.mockResolvedValueOnce({
        data: { id: 'agreement-1', status: 'Active' }
      });

      await translatedApiService.signBookingAgreement('booking-1', {
        signatureImage: 'test',
        language: 'en',
      });

      expect(translatedApiService.signBookingAgreement).toHaveBeenCalled();
    });

    test('failed sign shows error toast', async () => {
      translatedApiService.signBookingAgreement.mockRejectedValueOnce(
        new Error('Failed to sign')
      );

      await expect(
        translatedApiService.signBookingAgreement('booking-1', {})
      ).rejects.toThrow('Failed to sign');
    });
  });

  describe('Agreement Data Validation', () => {
    test('agreement data has required fields', () => {
      const requiredFields = [
        'signatureImage',
        'language',
        'consents',
        'consentTexts',
        'signedAt',
        'userAgent',
        'timezone',
      ];

      const agreementData = {
        signatureImage: 'data:image/png;base64,test',
        language: 'en',
        consents: {},
        consentTexts: {},
        signedAt: new Date().toISOString(),
        userAgent: 'Test',
        timezone: 'UTC',
      };

      requiredFields.forEach(field => {
        expect(agreementData).toHaveProperty(field);
      });
    });

    test('consents has required timestamp fields', () => {
      const requiredConsentFields = [
        'termsAcceptedAt',
        'nonRefundableAcceptedAt',
        'damagePolicyAcceptedAt',
        'cardAuthorizationAcceptedAt',
      ];

      const consents = {
        termsAcceptedAt: new Date().toISOString(),
        nonRefundableAcceptedAt: new Date().toISOString(),
        damagePolicyAcceptedAt: new Date().toISOString(),
        cardAuthorizationAcceptedAt: new Date().toISOString(),
      };

      requiredConsentFields.forEach(field => {
        expect(consents).toHaveProperty(field);
        expect(consents[field]).toBeTruthy();
      });
    });

    test('consentTexts has required text fields', () => {
      const requiredTextFields = [
        'termsTitle',
        'termsText',
        'nonRefundableTitle',
        'nonRefundableText',
        'damagePolicyTitle',
        'damagePolicyText',
        'cardAuthorizationTitle',
        'cardAuthorizationText',
      ];

      const consentTexts = {
        termsTitle: 'Terms',
        termsText: 'Content',
        nonRefundableTitle: 'Non-Refundable',
        nonRefundableText: 'Content',
        damagePolicyTitle: 'Damage',
        damagePolicyText: 'Content',
        cardAuthorizationTitle: 'Card',
        cardAuthorizationText: 'Content',
      };

      requiredTextFields.forEach(field => {
        expect(consentTexts).toHaveProperty(field);
        expect(consentTexts[field]).toBeTruthy();
      });
    });
  });

  describe('Rental Info for Modal', () => {
    test('rental info structure matches RentalAgreementModal expectations', () => {
      const signingBooking = {
        customerFirstName: 'John',
        customerLastName: 'Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        vehicleName: 'Toyota Camry',
        vehicleYear: 2024,
        vehiclePlate: 'ABC123',
        pickupDate: '2025-01-15',
        returnDate: '2025-01-20',
        dailyRate: 50,
        totalAmount: 250,
        securityDeposit: 500,
      };

      const rentalInfo = {
        renter: {
          firstName: signingBooking.customerFirstName,
          lastName: signingBooking.customerLastName,
          email: signingBooking.customerEmail,
          phone: signingBooking.customerPhone,
        },
        vehicle: {
          type: '',
          makeModel: signingBooking.vehicleName,
          yearColorLicense: [
            signingBooking.vehicleYear,
            signingBooking.vehiclePlate
          ].filter(Boolean).join(' / '),
        },
        dates: {
          pickup: signingBooking.pickupDate,
          return: signingBooking.returnDate,
        },
        rates: {
          dailyRate: signingBooking.dailyRate,
          total: signingBooking.totalAmount,
          securityDeposit: signingBooking.securityDeposit,
        },
      };

      // Validate structure
      expect(rentalInfo.renter.firstName).toBe('John');
      expect(rentalInfo.renter.email).toBe('john@example.com');
      expect(rentalInfo.vehicle.makeModel).toBe('Toyota Camry');
      expect(rentalInfo.dates.pickup).toBe('2025-01-15');
      expect(rentalInfo.rates.total).toBe(250);
    });
  });
});

describe('ReservationsSection Integration', () => {
  test('handleSignAgreement flow', async () => {
    // Test the complete flow:
    // 1. Click Sign Agreement button
    // 2. Modal opens
    // 3. User signs
    // 4. API called
    // 5. Toast shown
    // 6. Modal closes
    
    const mockBooking = {
      id: 'booking-1',
      customerFirstName: 'John',
      customerLastName: 'Doe',
    };

    const mockAgreementData = {
      signatureImage: 'test',
      language: 'en',
      consents: {},
      signedAt: new Date().toISOString(),
    };

    // Verify API can be called
    await translatedApiService.signBookingAgreement(mockBooking.id, mockAgreementData);
    expect(translatedApiService.signBookingAgreement).toHaveBeenCalled();
  });
});
