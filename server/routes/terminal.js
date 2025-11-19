const express = require('express');
const router = express.Router();
const apiService = require('../config/api');

/**
 * Create connection token for Stripe Terminal
 * POST /api/terminal/connection-token
 */
router.post('/connection-token', async (req, res) => {
  try {
    const response = await apiService.post('/Terminal/connection-token', req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error creating connection token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to create connection token',
      error: error.response?.data
    });
  }
});

/**
 * Create payment intent for Stripe Terminal
 * POST /api/terminal/create-payment-intent
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const response = await apiService.post('/Terminal/create-payment-intent', req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error creating payment intent:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to create payment intent',
      error: error.response?.data
    });
  }
});

/**
 * Capture payment intent
 * POST /api/terminal/capture-payment-intent
 */
router.post('/capture-payment-intent', async (req, res) => {
  try {
    const response = await apiService.post('/Terminal/capture-payment-intent', req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error capturing payment intent:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to capture payment',
      error: error.response?.data
    });
  }
});

/**
 * Cancel payment intent
 * POST /api/terminal/cancel-payment-intent
 */
router.post('/cancel-payment-intent', async (req, res) => {
  try {
    const response = await apiService.post('/Terminal/cancel-payment-intent', req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error cancelling payment intent:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to cancel payment',
      error: error.response?.data
    });
  }
});

module.exports = router;

