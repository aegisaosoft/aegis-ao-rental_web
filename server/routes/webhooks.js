const express = require('express');
const router = express.Router();
const axios = require('axios');
const https = require('https');

// Get API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://localhost:7163';

// Create axios instance for webhook forwarding
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

/**
 * Stripe webhook endpoint
 * POST /api/webhooks/stripe
 * 
 * This endpoint receives webhook events from Stripe and forwards them to the backend API.
 * Important: This endpoint should NOT require authentication as Stripe will be calling it.
 */
router.post('/stripe', async (req, res) => {
  try {
    const targetUrl = `${API_BASE_URL}/api/Webhooks/stripe`;
    console.log('[Webhook] Received webhook from Stripe');
    console.log('[Webhook] Target URL:', targetUrl);
    console.log('[Webhook] Event type:', req.body?.type);
    console.log('[Webhook] Event ID:', req.body?.id);
    
    // Forward the raw body and headers to the backend API
    const response = await apiClient.post('/api/Webhooks/stripe', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': req.headers['stripe-signature'] || ''
      },
      timeout: 30000
    });
    
    console.log('[Webhook] C# API response:', response.status, response.data);
    res.json(response.data);
  } catch (error) {
    console.error('[Webhook] ERROR Details:');
    console.error('  - Message:', error.message);
    console.error('  - Code:', error.code);
    console.error('  - Response status:', error.response?.status);
    console.error('  - Response data:', error.response?.data);
    console.error('  - Target:', `${API_BASE_URL}/api/Webhooks/stripe`);
    
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to process webhook'
    });
  }
});

module.exports = router;

