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
const router = express.Router();
const apiService = require('../config/api');

// Get current company config (domain-based) - must be before /:id route
router.get('/config', async (req, res) => {
  const axios = require('axios');
  // Use Azure API by default for local testing (or set API_BASE_URL in .env)
  const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
  
  try {
    const proxyPath = '/api/companies/config';
    
    // Forward X-Company-Id header if present (set by company detection middleware)
    // Also forward X-Forwarded-Host so backend can resolve company from hostname
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(req.headers.authorization && { Authorization: req.headers.authorization }),
      ...(req.headers['x-company-id'] && { 'X-Company-Id': req.headers['x-company-id'] }),
      ...(req.headers['x-forwarded-host'] && { 'X-Forwarded-Host': req.headers['x-forwarded-host'] }),
      ...(req.headers['host'] && !req.headers['x-forwarded-host'] && { 'X-Forwarded-Host': req.headers['host'] })
    };
    
    // Forward query parameters (including companyId as fallback)
    const queryParams = { ...req.query };
    
    console.log(`[Companies Route] GET ${proxyPath}`);
    console.log(`[Companies Route] API Base URL: ${apiBaseUrl}`);
    console.log(`[Companies Route] Request headers from client:`, {
      'x-company-id': req.headers['x-company-id'],
      'host': req.headers['host'],
      'x-forwarded-host': req.headers['x-forwarded-host']
    });
    console.log(`[Companies Route] X-Company-Id header to backend: ${headers['X-Company-Id'] || 'none'}`);
    console.log(`[Companies Route] Query params:`, queryParams);
    
    // Use longer timeout for Azure to handle slow responses (30 seconds)
    const timeout = 30000;
    
    const response = await axios.get(`${apiBaseUrl}${proxyPath}`, {
      headers: headers,
      params: queryParams, // Forward query parameters
      httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false }),
      validateStatus: () => true, // Don't throw on any status code
      timeout: timeout
    });
    
    console.log(`[Companies Route] GET /config response status: ${response.status}`);
    if (response.status !== 200) {
      console.log(`[Companies Route] Error response:`, response.data);
      
      // If API returns 503, it means the service is unavailable
      // This could be during startup or health check failure
      if (response.status === 503) {
        console.error(`[Companies Route] API returned 503 - Service Unavailable. This may indicate the API is still starting up or health checks are failing.`);
      }
    }
    
    // Preserve the original status code - don't modify 400 responses
    // 400 means company not found, which is important for multitenant architecture
    // 503 means service unavailable - forward it as-is
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Companies Route] Config fetch error:', error.message);
    console.error('[Companies Route] Error code:', error.code);
    console.error('[Companies Route] Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });
    
    // Handle timeout errors - return 504 Gateway Timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      console.error('[Companies Route] Gateway timeout - API took longer than 30 seconds to respond');
      console.error('[Companies Route] API URL:', apiBaseUrl);
      console.error('[Companies Route] This could indicate the API is slow, overloaded, or experiencing issues.');
      return res.status(504).json({
        message: 'Gateway Timeout - The backend API did not respond in time. Please try again in a moment.',
        error: 'GATEWAY_TIMEOUT',
        code: error.code,
        apiUrl: apiBaseUrl,
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle connection refused or unreachable API
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH') {
      console.error('[Companies Route] Cannot connect to API:', apiBaseUrl);
      console.error('[Companies Route] Error code:', error.code);
      return res.status(503).json({
        message: 'Service Unavailable - Cannot connect to backend API. The API may be down or restarting.',
        error: 'CONNECTION_FAILED',
        code: error.code,
        apiUrl: apiBaseUrl,
        timestamp: new Date().toISOString()
      });
    }
    
    // If the API itself returned 503, forward it
    if (error.response?.status === 503) {
      console.error('[Companies Route] API returned 503 Service Unavailable');
      return res.status(503).json({
        message: error.response?.data?.message || 'API service unavailable. The backend service may be starting up.',
        error: 'SERVICE_UNAVAILABLE',
        data: error.response?.data
      });
    }
    
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message,
      code: error.code
    });
  }
});

// Get all rental companies
router.get('/', async (req, res) => {
  try {
    console.log('Fetching companies with query:', req.query);
    const response = await apiService.getRentalCompanies(req.query);
    console.log('Companies response:', response?.data?.length || 0, 'companies');
    res.json(response.data);
  } catch (error) {
    console.error('Companies fetch error:', error.message);
    console.error('Error details:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
    });
  }
});

// ============================================================================
// STRIPE ROUTES - MUST BE BEFORE /:id ROUTE TO MATCH FIRST
// ============================================================================
// Proxy all Stripe management endpoints to Azure API
// These routes MUST come before /:id route so Express matches them first
// Public endpoint to check if Stripe account exists (for booking availability)
router.all('/:id/stripe/check-account', async (req, res) => {
  await handleStripeRoute(req, res, 'check-account');
});

// Admin app calls: /api/companies/{companyId}/stripe/status
// This maps to: CompanyStripeManagementController.GetStatus (NOT StripeConnectController.GetAccountStatus)
router.all('/:id/stripe/status', async (req, res) => {
  await handleStripeRoute(req, res, 'status');
});

router.all('/:id/stripe/sync', async (req, res) => {
  await handleStripeRoute(req, res, 'sync');
});

router.all('/:id/stripe/setup', async (req, res) => {
  await handleStripeRoute(req, res, 'setup');
});

router.all('/:id/stripe/reauth', async (req, res) => {
  await handleStripeRoute(req, res, 'reauth');
});

router.all('/:id/stripe/suspend', async (req, res) => {
  await handleStripeRoute(req, res, 'suspend');
});

router.all('/:id/stripe/reactivate', async (req, res) => {
  await handleStripeRoute(req, res, 'reactivate');
});

router.all('/:id/stripe', async (req, res) => {
  await handleStripeRoute(req, res, '');
});

// Helper function to handle Stripe routes
async function handleStripeRoute(req, res, stripePath) {
  const axios = require('axios');
  const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
  
  try {
    const { id } = req.params;
    
    // If stripePath wasn't provided, try to extract from URL
    if (!stripePath) {
      const originalMatch = req.originalUrl.match(/\/companies\/[^\/]+\/stripe\/(.+?)(?:\?|$)/);
      if (originalMatch && originalMatch[1]) {
        stripePath = originalMatch[1];
      } else {
        const pathMatch = req.path.match(/\/stripe\/(.+?)(?:\?|$)/);
        if (pathMatch && pathMatch[1]) {
          stripePath = pathMatch[1];
        }
      }
    }
    
    // Build path without query string - query params will be forwarded via config.params in handleStripeProxy
    const fullPath = `/api/companies/${id}/stripe/${stripePath}`;
    
    console.log(`[Companies Route] 🔵 Stripe proxy: ${req.method} ${req.originalUrl} -> ${apiBaseUrl}${fullPath}`);
    console.log(`[Companies Route] Query parameters:`, req.query);
    
    await handleStripeProxy(req, res, id, fullPath, apiBaseUrl);
  } catch (error) {
    console.error(`[Companies Route] Error in Stripe proxy:`, error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// ============================================================================
// COMPANY ROUTES - MUST BE AFTER STRIPE ROUTES
// ============================================================================
// Get single company by ID
router.get('/:id', async (req, res) => {
  try {
    // This route is public but can use token if available
    // Check session first, then headers
    const token = req.session?.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.getRentalCompany(token, req.params.id);
    res.json(response.data);
  } catch (error) {
    console.error('Company fetch error:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error'
    });
  }
});

// Update company
router.put('/:id', async (req, res) => {
  const axios = require('axios');
  const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
  
  try {
    const { id } = req.params;
    // Use token from session (this route doesn't use authenticateToken, so check session directly)
    const token = req.session?.token || req.headers.authorization?.split(' ')[1];
    
    console.log(`[Companies Route] PUT /api/companies/${id} -> ${apiBaseUrl}/api/RentalCompanies/${id}`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const response = await axios.put(
      `${apiBaseUrl}/api/RentalCompanies/${id}`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : undefined
        },
        httpsAgent: new (require('https')).Agent({
          rejectUnauthorized: false
        }),
        validateStatus: () => true // Don't throw on any status code
      }
    );
    
    console.log(`[Companies Route] Response status: ${response.status}`);
    
    // Return 204 No Content as expected by the backend
    if (response.status === 204) {
      return res.status(204).send();
    }
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Companies Route] Update error:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: error.stack
    });
    
    // Handle 204 responses in error cases too
    if (error.response?.status === 204) {
      return res.status(204).send();
    }
    
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || {
      message: error.message || 'Server error',
      error: error.message
    };
    
    res.status(statusCode).json(errorData);
  }
});

// Shared handler function for Stripe proxy requests
async function handleStripeProxy(req, res, id, fullPath, apiBaseUrl) {
  const axios = require('axios');
  
  try {
    // Get token from multiple sources (in order of preference):
    // 1. Authorization header (if frontend sends it directly)
    // 2. Session token (for web app users)
    // 3. Cookie (if token is stored in cookie)
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7); // Remove "Bearer " prefix
    } else if (!token) {
      token = req.session?.token;
    }
    
    // If still no token, check cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    console.log(`[Companies Route] ${req.method} ${req.path} -> ${apiBaseUrl}${fullPath}`);
    console.log(`[Companies Route] Token found: ${token ? 'Yes' : 'No'}, Has session: ${!!req.session}, Session has token: ${!!req.session?.token}`);
    
    // For status endpoint, don't require token (allows anonymous access)
    const isStatusEndpoint = fullPath.includes('/stripe/status');
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(req.headers['x-company-id'] && { 'X-Company-Id': req.headers['x-company-id'] }),
      ...(req.headers['x-forwarded-host'] && { 'X-Forwarded-Host': req.headers['x-forwarded-host'] })
    };
    
    if (isStatusEndpoint) {
      console.log(`[Companies Route] Status endpoint - allowing anonymous access (no token required)`);
    }
    
    const config = {
      method: req.method.toLowerCase(),
      url: `${apiBaseUrl}${fullPath}`,
      headers: headers,
      httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false }),
      validateStatus: () => true, // Don't throw on any status code
      timeout: 30000 // 30 second timeout
    };
    
    // Add request body for POST/PUT/PATCH
    if (['post', 'put', 'patch'].includes(req.method.toLowerCase()) && req.body) {
      config.data = req.body;
    }
    
    // Add query parameters (including source=web or source=admin)
    if (Object.keys(req.query).length > 0) {
      config.params = req.query;
      console.log(`[Companies Route] Forwarding query parameters to backend:`, req.query);
    }
    
    const response = await axios(config);
    
    console.log(`[Companies Route] ${req.method} ${req.path} response status: ${response.status}`);
    console.log(`[Companies Route] Response data keys:`, response.data ? Object.keys(response.data) : 'null');
    if (response.data?.result) {
      console.log(`[Companies Route] Response.result keys:`, Object.keys(response.data.result));
      console.log(`[Companies Route] Response.result.stripeAccountId:`, response.data.result.stripeAccountId);
      console.log(`[Companies Route] Response.result.StripeAccountId:`, response.data.result.StripeAccountId);
    }
    
    // Forward the response status and data
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[Companies Route] Stripe endpoint error for ${req.method} ${req.path}:`, error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      message: error.message
    });
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return res.status(504).json({
        message: 'Gateway Timeout - The backend API did not respond in time.',
        error: 'GATEWAY_TIMEOUT',
        code: error.code
      });
    }
    
    // Handle connection errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH') {
      return res.status(503).json({
        message: 'Service Unavailable - Cannot connect to backend API.',
        error: 'CONNECTION_FAILED',
        code: error.code
      });
    }
    
    // Forward the error response
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || {
      message: error.message || 'Server error',
      error: error.message
    };
    
    res.status(statusCode).json(errorData);
  }
}

module.exports = router;
