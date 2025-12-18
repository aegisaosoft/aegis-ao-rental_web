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

const express = require('express');
const apiService = require('../config/api');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all bookings with optional filters
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.getBookings(token, req.query);
    res.json(response.data);
  } catch (error) {
    console.error('Reservations fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Sync payments from Stripe for multiple bookings (MUST be before :id routes)
router.post('/bookings/sync-payments-bulk', authenticateToken, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const bookingIds = req.body;
    console.log(`[Proxy] Bulk syncing payments for ${bookingIds.length} bookings`);
    const response = await apiService.syncPaymentsFromStripeBulk(token, bookingIds);
    console.log(`[Proxy] Bulk sync completed: ${response.data?.successCount}/${response.data?.totalProcessed} successful`);
    res.json(response.data);
  } catch (error) {
    console.error('[Proxy] Bulk payment sync error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to sync payments' 
    });
  }
});

// Get booking by ID
router.get('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.getBooking(token, id);
    res.json(response.data);
  } catch (error) {
    console.error('Reservation fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Get bookings for a company with pagination/filters
router.get('/companies/:companyId/bookings', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    
    if (!token) {
      console.error('[Company Bookings] ❌ No token found');
      console.error('[Company Bookings] Debug:', {
        hasReqToken: !!req.token,
        hasSessionToken: !!req.session?.token,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        sessionKeys: req.session ? Object.keys(req.session) : [],
        hasCookies: !!req.headers.cookie,
        url: req.originalUrl || req.url
      });
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    console.log('[Company Bookings] ✅ Using token from session via middleware (token length:', token.length + ')');
    console.log('[Company Bookings] Making request to backend with:', {
      companyId: companyId,
      query: req.query,
      tokenPrefix: token.substring(0, 30) + '...'
    });
    
    try {
      const response = await apiService.getCompanyBookings(token, companyId, req.query);
      console.log('[Company Bookings] ✅ Backend response received:', {
        status: response.status,
        dataLength: response.data ? JSON.stringify(response.data).length : 0
      });
      res.json(response.data);
    } catch (apiError) {
      console.error('[Company Bookings] ❌ Backend API error:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        message: apiError.message,
        config: {
          url: apiError.config?.url,
          method: apiError.config?.method,
          headers: apiError.config?.headers ? {
            hasAuthorization: !!apiError.config.headers.Authorization,
            authorizationPrefix: apiError.config.headers.Authorization ? apiError.config.headers.Authorization.substring(0, 30) + '...' : 'none'
          } : 'none'
        }
      });
      throw apiError;
    }
  } catch (error) {
    console.error('[Company Bookings] Error:', error.message);
    console.error('[Company Bookings] Error status:', error.response?.status);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Create new booking
router.post('/bookings', authenticateToken, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    
    if (!token) {
      console.error('[Booking] No token found for booking creation');
      console.error('[Booking] Token sources:', {
        hasReqToken: !!req.token,
        hasSessionToken: !!req.session?.token,
        hasHeaderToken: !!req.headers.authorization,
        cookies: Object.keys(req.cookies || {}),
        sessionKeys: Object.keys(req.session || {})
      });
      return res.status(401).json({ 
        message: 'Authentication token required',
        details: 'Please ensure you are logged in and your session is valid'
      });
    }
    
    console.log('[Booking] Creating booking with token (length:', token.length + ')');
    console.log('[Booking] Booking data:', {
      customerId: req.body.customerId,
      vehicleId: req.body.vehicleId,
      companyId: req.body.companyId,
      pickupDate: req.body.pickupDate,
      returnDate: req.body.returnDate,
      hasAgreementData: !!req.body.agreementData,
      hasSignature: !!req.body.agreementData?.signatureImage,
      signatureLength: req.body.agreementData?.signatureImage?.length || 0
    });
    
    const response = await apiService.createBooking(token, req.body);
    console.log('[Booking] Booking created successfully:', response.data?.id || response.data?.Id);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('[Booking] Reservation creation error:', error.message);
    console.error('[Booking] Error response:', error.response?.data);
    console.error('[Booking] Error status:', error.response?.status);
    console.error('[Booking] Error details:', {
      code: error.code,
      message: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data
    });
    
    const status = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message || 'Server error';
    
    res.status(status).json({ 
      message: errorMessage,
      error: error.response?.data?.error || errorMessage,
      details: error.response?.data
    });
  }
});

// Update booking
router.put('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.updateBooking(token, id, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Reservation update error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Cancel booking
router.post('/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.cancelBooking(token, id);
    res.json(response.data);
  } catch (error) {
    console.error('Reservation cancellation error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Sync payment from Stripe for a single booking
router.post('/bookings/:id/sync-payment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    console.log(`[Proxy] Syncing payment for booking ${id}`);
    const response = await apiService.syncPaymentFromStripe(token, id);
    console.log(`[Proxy] Sync response for booking ${id}:`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error(`[Proxy] Payment sync error for booking ${req.params.id}:`, error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to sync payment' 
    });
  }
});

// Refund payment
router.post('/bookings/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    console.log(`[Proxy] Processing refund for booking ${id}, amount: ${amount}, reason: ${reason || 'N/A'}`);
    const response = await apiService.refundPayment(token, id, amount, reason);
    res.json(response.data);
  } catch (error) {
    console.error(`[Proxy] Refund error for booking ${req.params.id}:`, error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to process refund' 
    });
  }
});

// Create security deposit payment intent
router.post('/bookings/:id/security-deposit-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    console.log(`[Proxy] Creating security deposit payment intent for booking ${id}`);
    const response = await apiService.createSecurityDepositPaymentIntent(token, id);
    console.log(`[Proxy] Payment intent created: ${response.data.paymentIntentId}`);
    res.json(response.data);
  } catch (error) {
    console.error(`[Proxy] Security deposit payment intent error for booking ${req.params.id}:`, error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to create payment intent' 
    });
  }
});

// Create security deposit checkout session (hosted Stripe page)
router.post('/bookings/:id/security-deposit-checkout', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    console.log(`[Proxy] Creating security deposit checkout session for booking ${id}`);
    const response = await apiService.createSecurityDepositCheckout(token, id);
    console.log(`[Proxy] Checkout session created: ${response.data.sessionId}`);
    res.json(response.data);
  } catch (error) {
    console.error(`[Proxy] Security deposit checkout error for booking ${req.params.id}:`, error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to create checkout session' 
    });
  }
});

module.exports = router;
