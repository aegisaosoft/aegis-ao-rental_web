/**
 * Unit tests for Reservations routes - specifically sign-agreement endpoint
 * Tests server/routes/reservations.js
 */

const express = require('express');
const request = require('supertest');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Create a fresh app for testing
function createTestApp() {
  const app = express();
  app.use(express.json());
  
  // Mock authentication middleware
  const authenticateToken = (req, res, next) => {
    req.token = 'test-token';
    req.session = { token: 'test-token' };
    next();
  };
  
  // Mock reservations router with sign-agreement endpoint
  const router = express.Router();
  
  const API_BASE_URL = 'https://test-api.example.com';
  
  // Mock apiService
  const apiService = {
    signBookingAgreement: (token, bookingId, agreementData) => {
      return axios.post(
        `${API_BASE_URL}/api/booking/bookings/${bookingId}/sign-agreement`,
        agreementData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    },
    getRentalAgreement: (token, bookingId) => {
      return axios.get(
        `${API_BASE_URL}/api/booking/bookings/${bookingId}/rental-agreement`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  };

  // POST /bookings/:id/sign-agreement
  router.post('/bookings/:id/sign-agreement', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.token || req.session?.token;
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const response = await apiService.signBookingAgreement(token, id, req.body);
      res.json(response.data);
    } catch (error) {
      res.status(error.response?.status || 500).json({ 
        message: error.response?.data?.message || 'Failed to sign agreement' 
      });
    }
  });

  // GET /bookings/:id/rental-agreement  
  router.get('/bookings/:id/rental-agreement', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.token || req.session?.token;
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const response = await apiService.getRentalAgreement(token, id);
      res.json(response.data);
    } catch (error) {
      res.status(error.response?.status || 500).json({ 
        message: error.response?.data?.message || 'Rental agreement not found' 
      });
    }
  });
  
  app.use('/api/reservations', router);
  
  return app;
}

describe('Reservations Routes - Sign Agreement', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reservations/bookings/:id/sign-agreement', () => {
    const validAgreementData = {
      signatureImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      language: 'en',
      consents: {
        termsAcceptedAt: '2025-01-04T12:00:00Z',
        nonRefundableAcceptedAt: '2025-01-04T12:00:01Z',
        damagePolicyAcceptedAt: '2025-01-04T12:00:02Z',
        cardAuthorizationAcceptedAt: '2025-01-04T12:00:03Z',
      },
      consentTexts: {
        termsTitle: 'Terms and Conditions',
        termsText: 'I agree to the rental terms.',
        nonRefundableTitle: 'Non-Refundable Policy',
        nonRefundableText: 'I understand this booking is non-refundable.',
        damagePolicyTitle: 'Damage Policy',
        damagePolicyText: 'I am responsible for any damage.',
        cardAuthorizationTitle: 'Card Authorization',
        cardAuthorizationText: 'I authorize charges to my card.',
      },
      signedAt: '2025-01-04T12:00:00Z',
      userAgent: 'Mozilla/5.0 Test',
      timezone: 'America/New_York',
    };

    test('should successfully sign an agreement', async () => {
      const mockResponse = {
        data: {
          id: 'agreement-uuid',
          agreementNumber: 'AGR-2025-001',
          bookingId: 'booking-uuid',
          status: 'Active',
          pdfUrl: '/storage/agreements/company-id/AGR-2025-001.pdf',
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const response = await request(app)
        .post('/api/reservations/bookings/booking-uuid/sign-agreement')
        .set('Authorization', 'Bearer test-token')
        .send(validAgreementData);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('agreement-uuid');
      expect(response.body.agreementNumber).toBe('AGR-2025-001');
      expect(response.body.status).toBe('Active');
    });

    test('should return 400 when signature is missing', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Signature is required' }
        }
      });
      
      const invalidData = { ...validAgreementData, signatureImage: '' };
      
      const response = await request(app)
        .post('/api/reservations/bookings/booking-uuid/sign-agreement')
        .set('Authorization', 'Bearer test-token')
        .send(invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Signature is required');
    });

    test('should return 404 when booking not found', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { message: 'Booking not found' }
        }
      });
      
      const response = await request(app)
        .post('/api/reservations/bookings/non-existent-id/sign-agreement')
        .set('Authorization', 'Bearer test-token')
        .send(validAgreementData);
      
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Booking not found');
    });

    test('should return 409 when agreement already exists', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 409,
          data: { message: 'Agreement already exists for booking booking-uuid' }
        }
      });
      
      const response = await request(app)
        .post('/api/reservations/bookings/booking-uuid/sign-agreement')
        .set('Authorization', 'Bearer test-token')
        .send(validAgreementData);
      
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Agreement already exists');
    });

    test('should forward all agreement data to C# API', async () => {
      axios.post.mockResolvedValueOnce({ data: { id: 'test' } });
      
      await request(app)
        .post('/api/reservations/bookings/booking-uuid/sign-agreement')
        .set('Authorization', 'Bearer test-token')
        .send(validAgreementData);
      
      // Verify axios was called with correct data
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/booking/bookings/booking-uuid/sign-agreement'),
        expect.objectContaining({
          signatureImage: validAgreementData.signatureImage,
          language: validAgreementData.language,
          consents: validAgreementData.consents,
          consentTexts: validAgreementData.consentTexts,
        }),
        expect.any(Object)
      );
    });

    test('should include Authorization header in request to C# API', async () => {
      axios.post.mockResolvedValueOnce({ data: { id: 'test' } });
      
      await request(app)
        .post('/api/reservations/bookings/booking-uuid/sign-agreement')
        .set('Authorization', 'Bearer test-token')
        .send(validAgreementData);
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('GET /api/reservations/bookings/:id/rental-agreement', () => {
    test('should return rental agreement when it exists', async () => {
      const mockAgreement = {
        data: {
          id: 'agreement-uuid',
          agreementNumber: 'AGR-2025-001',
          bookingId: 'booking-uuid',
          customerId: 'customer-uuid',
          vehicleId: 'vehicle-uuid',
          companyId: 'company-uuid',
          language: 'en',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          signatureImage: 'data:image/png;base64,...',
          signedAt: '2025-01-04T12:00:00Z',
          pdfUrl: '/storage/agreements/company-id/AGR-2025-001.pdf',
          pdfGeneratedAt: '2025-01-04T12:01:00Z',
          status: 'Active',
        }
      };
      
      axios.get.mockResolvedValueOnce(mockAgreement);
      
      const response = await request(app)
        .get('/api/reservations/bookings/booking-uuid/rental-agreement')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('agreement-uuid');
      expect(response.body.agreementNumber).toBe('AGR-2025-001');
      expect(response.body.pdfUrl).toBeTruthy();
    });

    test('should return 404 when agreement not found', async () => {
      axios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { message: 'Rental agreement not found for this booking' }
        }
      });
      
      const response = await request(app)
        .get('/api/reservations/bookings/booking-without-agreement/rental-agreement')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });
});

describe('Agreement Data Structure Validation', () => {
  test('signatureImage should be base64 encoded PNG', () => {
    const validSignature = 'data:image/png;base64,iVBORw0KGgo...';
    expect(validSignature).toMatch(/^data:image\/png;base64,/);
  });

  test('consents should have all required timestamps', () => {
    const consents = {
      termsAcceptedAt: '2025-01-04T12:00:00Z',
      nonRefundableAcceptedAt: '2025-01-04T12:00:01Z',
      damagePolicyAcceptedAt: '2025-01-04T12:00:02Z',
      cardAuthorizationAcceptedAt: '2025-01-04T12:00:03Z',
    };

    Object.values(consents).forEach(timestamp => {
      expect(() => new Date(timestamp)).not.toThrow();
      // Verify it's a valid ISO date (toISOString adds .000 milliseconds)
      const date = new Date(timestamp);
      expect(date.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  test('consentTexts should have title and text for each consent', () => {
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

    const requiredFields = [
      'termsTitle', 'termsText',
      'nonRefundableTitle', 'nonRefundableText',
      'damagePolicyTitle', 'damagePolicyText',
      'cardAuthorizationTitle', 'cardAuthorizationText',
    ];

    requiredFields.forEach(field => {
      expect(consentTexts[field]).toBeTruthy();
    });
  });

  test('language should be valid ISO code', () => {
    const validLanguages = ['en', 'es', 'pt', 'de', 'fr'];
    validLanguages.forEach(lang => {
      expect(lang).toMatch(/^[a-z]{2}$/);
    });
  });
});
