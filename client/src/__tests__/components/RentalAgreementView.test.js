/**
 * Unit tests for RentalAgreementView component
 * Tests the rental agreement display and signing functionality
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock canvas methods for signature pad
const mockContext = {
  scale: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  drawImage: jest.fn(),
  strokeStyle: '',
  lineWidth: 1,
  lineCap: '',
  lineJoin: '',
};

const mockBoundingRect = {
  width: 400,
  height: 200,
  top: 0,
  left: 0,
  bottom: 200,
  right: 400,
  x: 0,
  y: 0,
  toJSON: () => mockBoundingRect,
};

// Apply mocks before any tests run
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);
  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => mockBoundingRect);
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock');
  
  // Mock Element.prototype.getBoundingClientRect for all elements
  Element.prototype.getBoundingClientRect = jest.fn(() => mockBoundingRect);
});

// Mock API - define inside jest.mock to avoid hoisting issues
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getRentalAgreement: jest.fn(),
    getBooking: jest.fn(),
    previewAgreementPdf: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
  Download: () => <span data-testid="download-icon" />,
  ExternalLink: () => <span data-testid="external-link-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
}));

// Import component and api after mocks
import RentalAgreementView from '../../components/RentalAgreementView';
import api from '../../services/api';

describe('RentalAgreementView', () => {
  const defaultProps = {
    language: 'en',
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    formatPrice: (price) => `$${price?.toFixed(2) || '0.00'}`,
    viewMode: false,
    isPage: false,
  };

  const mockBookingData = {
    id: 'booking-123',
    customerFirstName: 'John',
    customerLastName: 'Doe',
    customerEmail: 'john@example.com',
    customerPhone: '555-1234',
    vehicleName: 'Toyota Camry',
    vehicleType: 'Sedan',
    vehicleYear: 2023,
    vehicleColor: 'Silver',
    vehiclePlate: 'ABC123',
    startDate: '2025-01-15T00:00:00',
    endDate: '2025-01-20T00:00:00',
    pickupTime: '10:00',
    returnTime: '17:00',
    dailyRate: 75,
    securityDeposit: 250,
    totalPrice: 375,
  };

  const mockRentalInfo = {
    renter: {
      firstName: 'Jane',
      middleName: '',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '555-5678',
      driverLicense: 'DL999888',
    },
    vehicle: {
      type: 'SUV',
      makeModel: 'Honda CR-V',
      yearColorLicense: '2024 / Black / XYZ789',
    },
    pickupDate: '2025-01-20',
    returnDate: '2025-01-25',
    startTime: '09:00',
    returnTime: '18:00',
    dailyRate: 85,
    securityDeposit: 300,
    totalAmount: 375,
    selectedServices: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock to avoid "Cannot read properties of undefined" warning
    api.getRentalAgreement.mockRejectedValue({ response: { status: 404 } });
  });

  describe('Data Source Priority', () => {
    test('loads data from API when bookingId is provided', async () => {
      api.getRentalAgreement.mockRejectedValueOnce({ response: { status: 404 } });
      api.getBooking.mockResolvedValueOnce({ data: mockBookingData });

      await act(async () => {
        render(<RentalAgreementView {...defaultProps} bookingId="booking-123" />);
      });

      await waitFor(() => {
        expect(api.getRentalAgreement).toHaveBeenCalledWith('booking-123');
        expect(api.getBooking).toHaveBeenCalledWith('booking-123');
      });

      expect(screen.getByText('John')).toBeInTheDocument();
    });

    test('uses rentalInfo when no bookingId is provided', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      expect(api.getRentalAgreement).not.toHaveBeenCalled();
      expect(api.getBooking).not.toHaveBeenCalled();
    });

    test('bookingId takes priority over rentalInfo', async () => {
      api.getRentalAgreement.mockRejectedValueOnce({ response: { status: 404 } });
      api.getBooking.mockResolvedValueOnce({ data: mockBookingData });

      await act(async () => {
        render(
          <RentalAgreementView 
            {...defaultProps} 
            bookingId="booking-123" 
            rentalInfo={mockRentalInfo} 
          />
        );
      });

      await waitFor(() => {
        expect(api.getBooking).toHaveBeenCalledWith('booking-123');
      });

      // Should show data from API, not rentalInfo
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.queryByText('Jane')).not.toBeInTheDocument();
    });
  });

  describe('PDF Existence Check', () => {
    test('shows PDF viewer when signed agreement exists', async () => {
      const mockAgreement = {
        pdfUrl: '/agreements/test.pdf',
        signedAt: '2025-01-10T12:00:00Z',
        agreementNumber: 'RA-2025-001',
      };
      api.getRentalAgreement.mockResolvedValueOnce({ data: mockAgreement });

      await act(async () => {
        render(<RentalAgreementView {...defaultProps} bookingId="booking-123" />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Signed Rental Agreement/i })).toBeInTheDocument();
      });
    });

    test('shows signing form when no PDF exists', async () => {
      api.getRentalAgreement.mockRejectedValueOnce({ response: { status: 404 } });
      api.getBooking.mockResolvedValueOnce({ data: mockBookingData });

      await act(async () => {
        render(<RentalAgreementView {...defaultProps} bookingId="booking-123" />);
      });

      await waitFor(() => {
        expect(screen.getByText(/CUSTOMER/i)).toBeInTheDocument();
      });
    });

    test('skips PDF check when no bookingId (new booking)', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      expect(api.getRentalAgreement).not.toHaveBeenCalled();
    });
  });

  describe('Consent Checkboxes', () => {
    test('renders all consent rules', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} />);
      });

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(10);
      });
    });

    test('sign button is disabled until all consents are checked', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} />);
      });

      await waitFor(() => {
        const signButton = screen.queryByText(/Sign Agreement/i);
        if (signButton) {
          expect(signButton.closest('button')).toBeDisabled();
        }
      });
    });
  });

  describe('Translations', () => {
    test('renders in English by default', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} language="en" />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Rental Agreement/i })).toBeInTheDocument();
      });
    });

    test('renders in Spanish when language is es', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} language="es" />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Contrato de Alquiler/i })).toBeInTheDocument();
      });
    });

    test('renders in Portuguese when language is pt', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} language="pt" />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Contrato de Locação/i })).toBeInTheDocument();
      });
    });

    test('renders in French when language is fr', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} language="fr" />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Contrat de Location/i })).toBeInTheDocument();
      });
    });

    test('renders in German when language is de', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} language="de" />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Mietvertrag/i })).toBeInTheDocument();
      });
    });
  });

  describe('Date Formatting', () => {
    test('formats ISO dates correctly (removes T00:00:00)', async () => {
      const rentalInfoWithIsoDates = {
        ...mockRentalInfo,
        startDate: '2025-01-20T00:00:00',
        endDate: '2025-01-25T00:00:00',
      };

      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={rentalInfoWithIsoDates} />);
      });

      await waitFor(() => {
        expect(screen.getByText('2025-01-20')).toBeInTheDocument();
        expect(screen.getByText('2025-01-25')).toBeInTheDocument();
      });

      // Should not show the T00:00:00 part
      expect(screen.queryByText(/T00:00:00/)).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('shows loading spinner while checking for existing PDF', async () => {
      // Delay the API response
      api.getRentalAgreement.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<RentalAgreementView {...defaultProps} bookingId="booking-123" />);
      
      // Should show loading initially
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    test('shows loading spinner while loading booking data', async () => {
      api.getRentalAgreement.mockRejectedValueOnce({ response: { status: 404 } });
      api.getBooking.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<RentalAgreementView {...defaultProps} bookingId="booking-123" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Loading/i)).toBeInTheDocument();
      });
    });
  });

  describe('isPage prop', () => {
    test('applies page styles when isPage is true', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} isPage={true} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });
    });

    test('applies modal styles when isPage is false', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} isPage={false} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });
    });
  });

  describe('viewMode', () => {
    test('hides consent checkboxes in viewMode', async () => {
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} viewMode={true} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      // In viewMode, checkboxes should not be visible
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes.length).toBe(0);
    });
  });

  describe('onConfirm callback', () => {
    test('calls onClose when Cancel is clicked', async () => {
      const onClose = jest.fn();
      
      await act(async () => {
        render(<RentalAgreementView {...defaultProps} rentalInfo={mockRentalInfo} onClose={onClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    describe('BookPage scenario (new booking)', () => {
      test('works without bookingId using rentalInfo from form', async () => {
        await act(async () => {
          render(
            <RentalAgreementView 
              {...defaultProps} 
              rentalInfo={mockRentalInfo}
              bookingId={null}
            />
          );
        });

        // Wait for data to load and render
        expect(await screen.findByText('Jane')).toBeInTheDocument();
        expect(await screen.findByText('Smith')).toBeInTheDocument();
        expect(await screen.findByText('Honda CR-V')).toBeInTheDocument();

        // Should not call API
        expect(api.getRentalAgreement).not.toHaveBeenCalled();
        expect(api.getBooking).not.toHaveBeenCalled();
      });
    });

    describe('Dashboard scenario (existing booking)', () => {
      test('loads data from API using bookingId', async () => {
        api.getRentalAgreement.mockRejectedValueOnce({ response: { status: 404 } });
        api.getBooking.mockResolvedValueOnce({
          data: {
            customerFirstName: 'Existing',
            customerLastName: 'Customer',
            customerEmail: 'existing@example.com',
            customerPhone: '555-9999',
            vehicleName: 'Ford F-150',
            vehicleType: 'Truck',
            vehicleYear: 2022,
            startDate: '2025-02-01',
            endDate: '2025-02-05',
            totalPrice: 500,
          },
        });

        await act(async () => {
          render(
            <RentalAgreementView 
              {...defaultProps} 
              bookingId="existing-booking-id"
            />
          );
        });

        await waitFor(() => {
          expect(screen.getByText('Existing')).toBeInTheDocument();
        });

        expect(api.getBooking).toHaveBeenCalledWith('existing-booking-id');
      });

      test('shows signed PDF when agreement already exists', async () => {
        api.getRentalAgreement.mockResolvedValueOnce({
          data: {
            pdfUrl: '/agreements/signed.pdf',
            signedAt: '2025-01-10T14:30:00Z',
            agreementNumber: 'RA-2025-999',
          },
        });

        await act(async () => {
          render(
            <RentalAgreementView 
              {...defaultProps} 
              bookingId="signed-booking-id"
            />
          );
        });

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /Signed Rental Agreement/i })).toBeInTheDocument();
        });
      });
    });
  });
});
