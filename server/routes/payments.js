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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.createPaymentIntent(req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm payment
router.post('/confirm/:paymentIntentId', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.confirmPayment(paymentIntentId);
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
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.getPaymentMethods(customerId);
    res.json(response.data);
  } catch (error) {
    console.error('Payment methods fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
