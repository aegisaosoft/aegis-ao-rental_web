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

// Test route to verify customers router is working
router.get('/test', (req, res) => {
  console.log('[Customer Routes] Test route hit!');
  res.json({ message: 'Customer routes are working', timestamp: new Date().toISOString() });
});

// Lookup customer by email (public - no auth required)
router.get('/email/:email', async (req, res) => {
  console.log('[Customer Email Route] Route hit!', {
    method: req.method,
    originalUrl: req.originalUrl,
    url: req.url,
    params: req.params,
    query: req.query
  });
  
  try {
    let { email } = req.params;
    console.log('[Customer Email] Raw email param:', email);
    
    // Decode URL-encoded email (e.g., orlovus%40yahoo.com -> orlovus@yahoo.com)
    // Handle both single and double encoding
    try {
      email = decodeURIComponent(email);
      // If it still looks encoded, decode again
      if (email.includes('%')) {
        email = decodeURIComponent(email);
      }
    } catch (decodeError) {
      // If decoding fails, use as-is
      console.warn('[Customer Email] Decode error, using email as-is:', decodeError.message);
    }
    
    console.log('[Customer Email] Decoded email:', email);
    
    if (!email || !email.trim()) {
      console.error('[Customer Email] Email is empty after decoding');
      return res.status(400).json({ message: 'Email is required' });
    }

    const trimmedEmail = email.trim();
    console.log('[Customer Email] Looking up customer with email:', trimmedEmail);
    
    const response = await apiService.getCustomerByEmail(trimmedEmail);
    console.log('[Customer Email] Customer found:', !!response.data);
    
    if (response.data) {
      console.log('[Customer Email] Returning customer data');
      return res.json(response.data);
    } else {
      console.warn('[Customer Email] No customer data in response');
      return res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message ||
      (status === 404 ? 'Customer not found' : 'Server error');

    // Don't log 404 errors as errors - they're expected when customer doesn't exist
    if (status === 404) {
      console.log('[Customer Email] Customer not found (expected):', req.params.email);
    } else {
      console.error('[Customer Email] Lookup error:', {
        status,
        message: error.message,
        responseData: error.response?.data,
        email: req.params.email,
        stack: error.stack
      });
    }

    res.status(status).json({ message });
  }
});

// Get all customers (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const axios = require('axios');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    console.log('[Customers Route] GET /api/customers with query:', req.query);
    console.log('[Customers Route] Token present:', !!token);
    
    // Call the backend API directly at /api/customers (not /api/admin/customers)
    const response = await axios.get(`${apiBaseUrl}/api/customers`, {
      params: req.query,
      headers: {
        'Authorization': token ? `Bearer ${token}` : undefined,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true // Don't throw on any status code
    });
    
    console.log('[Customers Route] Backend response status:', response.status);
    console.log('[Customers Route] Backend response data:', response.data);
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Customers Route] Customers fetch error:', error.message);
    console.error('[Customers Route] Error response:', error.response?.data);
    console.error('[Customers Route] Error status:', error.response?.status);
    console.error('[Customers Route] Full error:', error);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Server error';
    res.status(status).json({ 
      error: message,
      details: error.response?.data 
    });
  }
});

// Get customer by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.getCustomer(token, id);
    res.json(response.data);
  } catch (error) {
    console.error('Customer fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new customer
router.post('/', async (req, res) => {
  try {
    // Use token from session if available
    const token = req.session?.token || req.headers.authorization?.split(' ')[1] || null;
    const response = await apiService.createCustomer(token, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req, res) => {
  console.log('[Customers Route] ===== PUT /api/customers/:id ROUTE HIT =====');
  console.log('[Customers Route] Request URL:', req.originalUrl);
  console.log('[Customers Route] Request method:', req.method);
  console.log('[Customers Route] Request params:', req.params);
  
  try {
    const axios = require('axios');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    console.log('[Customers Route] PUT /api/customers/' + id);
    console.log('[Customers Route] API Base URL:', apiBaseUrl);
    console.log('[Customers Route] Full backend URL:', `${apiBaseUrl}/api/customers/${id}`);
    console.log('[Customers Route] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[Customers Route] Token present:', !!token);
    console.log('[Customers Route] Token length:', token ? token.length : 0);
    
    // Call the backend API directly with timeout
    let response;
    try {
      response = await axios.put(`${apiBaseUrl}/api/customers/${id}`, req.body, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        httpsAgent: new (require('https')).Agent({
          rejectUnauthorized: false
        }),
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => {
          // Accept all status codes, including 204
          return status >= 200 && status < 600;
        }
      });
    } catch (axiosError) {
      // If axios throws an error even with validateStatus, handle it
      console.error('[Customers Route] Axios error:', axiosError.message);
      console.error('[Customers Route] Error code:', axiosError.code);
      
      // Handle timeout specifically
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        console.error('[Customers Route] Request timeout - backend may be slow or unreachable');
        return res.status(504).json({ 
          error: 'Gateway Timeout',
          message: 'The request to the backend API timed out. Please try again.',
          code: 'TIMEOUT'
        });
      }
      
      if (axiosError.response) {
        response = axiosError.response;
      } else {
        // Network error or other axios error
        console.error('[Customers Route] Network error or no response');
        console.error('[Customers Route] Error code:', axiosError.code);
        console.error('[Customers Route] Error message:', axiosError.message);
        console.error('[Customers Route] Attempted URL:', `${apiBaseUrl}/api/customers/${id}`);
        console.error('[Customers Route] Stack:', axiosError.stack);
        
        // Provide more helpful error message
        let errorMessage = 'Failed to connect to backend API';
        if (axiosError.code === 'ECONNREFUSED') {
          errorMessage = `Cannot connect to backend API at ${apiBaseUrl}. Is the backend running?`;
        } else if (axiosError.code === 'ENOTFOUND') {
          errorMessage = `Backend API host not found: ${apiBaseUrl}`;
        } else if (axiosError.code === 'CERT_HAS_EXPIRED' || axiosError.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          errorMessage = `SSL certificate error connecting to ${apiBaseUrl}. Check certificate or use http:// for local development.`;
        }
        
        return res.status(502).json({ 
          error: 'Bad Gateway',
          message: errorMessage,
          code: axiosError.code || 'NETWORK_ERROR',
          attemptedUrl: `${apiBaseUrl}/api/customers/${id}`
        });
      }
    }
    
    console.log('[Customers Route] Backend response status:', response.status);
    console.log('[Customers Route] Backend response data type:', typeof response.data);
    console.log('[Customers Route] Backend response data:', response.data);
    
    // Handle 204 No Content - backend returns this for successful updates
    if (response.status === 204) {
      console.log('[Customers Route] Returning 204 No Content');
      return res.status(204).end();
    }
    
    // Handle 200 OK with or without data
    if (response.status === 200) {
      if (response.data !== undefined && response.data !== null && response.data !== '') {
        // Check if it's an object with properties
        if (typeof response.data === 'object' && !Array.isArray(response.data) && Object.keys(response.data).length > 0) {
          return res.status(200).json(response.data);
        }
        // If it's a non-empty non-object (string, number, etc.), return it
        if (typeof response.data !== 'object' || Array.isArray(response.data)) {
          return res.status(200).json(response.data);
        }
      }
      // Empty 200 response, treat as 204
      return res.status(204).end();
    }
    
    // For error status codes, return the error response
    if (response.status >= 400) {
      const errorData = response.data || { error: 'Unknown error' };
      return res.status(response.status).json(errorData);
    }
    
    // For any other status code, return as-is
    if (response.data !== undefined && response.data !== null && response.data !== '') {
      return res.status(response.status).json(response.data);
    }
    return res.status(response.status).end();
  } catch (error) {
    // Safety net - ensure we always send a response
    // This should rarely be hit since we handle errors above
    if (res.headersSent) {
      console.error('[Customers Route] Response already sent, cannot send error response');
      return;
    }
    console.error('[Customers Route] Customer update error:', error.message);
    console.error('[Customers Route] Error stack:', error.stack);
    console.error('[Customers Route] Error response:', error.response?.data);
    console.error('[Customers Route] Error status:', error.response?.status);
    console.error('[Customers Route] Error headers:', error.response?.headers);
    
    // Handle 204 responses in error cases too (shouldn't happen, but just in case)
    if (error.response?.status === 204) {
      console.log('[Customers Route] Got 204 in error handler - returning 204');
      return res.status(204).end();
    }
    
    // If axios didn't get a response, it might be a network error
    if (!error.response) {
      console.error('[Customers Route] No response from backend - network error?');
      console.error('[Customers Route] Error code:', error.code);
      console.error('[Customers Route] Error message:', error.message);
      return res.status(500).json({ 
        error: 'Failed to connect to backend API',
        message: error.message,
        code: error.code
      });
    }
    
    // If we got a response, forward it
    const status = error.response.status || 500;
    const errorData = error.response.data || { 
      error: error.message || 'Server error',
      message: error.message || 'Server error'
    };
    
    console.error('[Customers Route] Forwarding error response:', status, errorData);
    return res.status(status).json(errorData);
  }
});

module.exports = router;
