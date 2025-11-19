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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.getCompanyBookings(token, companyId, req.query);
    res.json(response.data);
  } catch (error) {
    console.error('Company bookings fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Create new booking
router.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.createBooking(token, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Reservation creation error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Update booking
router.put('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
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
