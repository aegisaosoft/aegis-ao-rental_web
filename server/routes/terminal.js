const express = require('express');
const router = express.Router();
const { apiClient } = require('../config/api');

/**
 * Create connection token for Stripe Terminal
 * POST /api/terminal/connection-token
 */
router.post('/connection-token', async (req, res) => {
  try {
    const response = await apiClient.post('/api/Terminal/connection-token', req.body, {
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
    const response = await apiClient.post('/api/Terminal/create-payment-intent', req.body, {
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
    const response = await apiClient.post('/api/Terminal/capture-payment-intent', req.body, {
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
    const response = await apiClient.post('/api/Terminal/cancel-payment-intent', req.body, {
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

/**
 * Refund a terminal payment
 * POST /api/terminal/refund
 */
router.post('/refund', async (req, res) => {
  try {
    const response = await apiClient.post('/api/Terminal/refund', req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error refunding terminal payment:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to process refund',
      error: error.response?.data
    });
  }
});

/**
 * Get terminal payment history
 * GET /api/terminal/payments
 */
router.get('/payments', async (req, res) => {
  try {
    const response = await apiClient.get(`/api/Terminal/payments?${new URLSearchParams(req.query).toString()}`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching terminal payments:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to fetch terminal payments',
      error: error.response?.data
    });
  }
});

/**
 * Get terminal payment stats
 * GET /api/terminal/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const response = await apiClient.get(`/api/Terminal/stats?${new URLSearchParams(req.query).toString()}`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching terminal stats:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to fetch terminal stats',
      error: error.response?.data
    });
  }
});

// ==========================================
// Terminal Setup: Locations & Readers
// ==========================================

/**
 * Create a terminal location
 * POST /api/terminal/locations
 */
router.post('/locations', async (req, res) => {
  try {
    const response = await apiClient.post('/api/Terminal/locations', req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error creating terminal location:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to create location',
      error: error.response?.data
    });
  }
});

/**
 * List terminal locations
 * GET /api/terminal/locations
 */
router.get('/locations', async (req, res) => {
  try {
    const response = await apiClient.get(
      `/api/Terminal/locations?${new URLSearchParams(req.query).toString()}`,
      { headers: { Authorization: req.headers.authorization } }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error listing terminal locations:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to list locations',
      error: error.response?.data
    });
  }
});

/**
 * Update a terminal location
 * PUT /api/terminal/locations/:locationId
 */
router.put('/locations/:locationId', async (req, res) => {
  try {
    const response = await apiClient.put(
      `/api/Terminal/locations/${req.params.locationId}`,
      req.body,
      { headers: { Authorization: req.headers.authorization } }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error updating terminal location:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to update location',
      error: error.response?.data
    });
  }
});

/**
 * Delete a terminal location
 * DELETE /api/terminal/locations/:locationId
 */
router.delete('/locations/:locationId', async (req, res) => {
  try {
    const response = await apiClient.delete(
      `/api/Terminal/locations/${req.params.locationId}?${new URLSearchParams(req.query).toString()}`,
      { headers: { Authorization: req.headers.authorization } }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error deleting terminal location:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to delete location',
      error: error.response?.data
    });
  }
});

/**
 * Register a terminal reader
 * POST /api/terminal/readers
 */
router.post('/readers', async (req, res) => {
  try {
    const response = await apiClient.post('/api/Terminal/readers', req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error registering terminal reader:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to register reader',
      error: error.response?.data
    });
  }
});

/**
 * List terminal readers
 * GET /api/terminal/readers
 */
router.get('/readers', async (req, res) => {
  try {
    const response = await apiClient.get(
      `/api/Terminal/readers?${new URLSearchParams(req.query).toString()}`,
      { headers: { Authorization: req.headers.authorization } }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error listing terminal readers:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to list readers',
      error: error.response?.data
    });
  }
});

/**
 * Delete (deregister) a terminal reader
 * DELETE /api/terminal/readers/:readerId
 */
router.delete('/readers/:readerId', async (req, res) => {
  try {
    const response = await apiClient.delete(
      `/api/Terminal/readers/${req.params.readerId}?${new URLSearchParams(req.query).toString()}`,
      { headers: { Authorization: req.headers.authorization } }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error deleting terminal reader:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to delete reader',
      error: error.response?.data
    });
  }
});

module.exports = router;

