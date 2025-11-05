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
  try {
    const axios = require('axios');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
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
    
    // Use shorter timeout for Azure (15 seconds instead of 30)
    const timeout = 15000;
    
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
    }
    
    // Preserve the original status code - don't modify 400 responses
    // 400 means company not found, which is important for multitenant architecture
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
    
    // Handle timeout or connection errors specifically
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error('[Companies Route] Request timeout - API may be down or unreachable');
      return res.status(503).json({
        message: 'API service unavailable. Please try again later.',
        error: 'SERVICE_UNAVAILABLE',
        code: error.code
      });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('[Companies Route] Cannot connect to API:', apiBaseUrl);
      return res.status(503).json({
        message: 'API service unavailable. Cannot connect to backend API.',
        error: 'CONNECTION_FAILED',
        code: error.code,
        apiUrl: apiBaseUrl
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

// Get single company by ID
router.get('/:id', async (req, res) => {
  try {
    const token = req.session.token;
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
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    
          // Forward the request to the backend API
          const axios = require('axios');
          const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
    
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

module.exports = router;
