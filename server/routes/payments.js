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
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create payment intent
router.post('/intent', authenticateToken, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.createPaymentIntent(token, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create checkout session
router.post('/checkout-session', authenticateToken, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    console.log('[Payments] Forwarding checkout session request:', req.body);
    const response = await apiService.createCheckoutSession(token, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Checkout session creation error:', error.response?.data || error.message || error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error'
    });
  }
});

// Confirm payment
router.post('/confirm/:paymentIntentId', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.confirmPayment(token, paymentIntentId);
    res.json(response.data);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer payment methods
router.get('/methods/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.getPaymentMethods(token, customerId);
    res.json(response.data);
  } catch (error) {
    console.error('Payment methods fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
