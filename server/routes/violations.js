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
const axios = require('axios');
const apiService = require('../config/api');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// External violations API base URL
const EXTERNAL_VIOLATIONS_API = 'https://aegis-violations.com';

// Get violations for a company
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { companyId, dateFrom, dateTo, page = 1, pageSize = 10 } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    console.log('[Violations Route] Fetching violations:', {
      companyId,
      dateFrom,
      dateTo,
      page,
      pageSize,
      hasToken: !!token
    });

    const response = await apiService.getViolations(token, {
      companyId,
      dateFrom,
      dateTo,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    console.log('[Violations Route] Response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Violations Route] Error:', error.message);
    console.error('[Violations Route] Error response:', error.response?.data);
    console.error('[Violations Route] Error status:', error.response?.status);
    
    // If backend API returns 404, return empty data
    if (error.response?.status === 404) {
      console.warn('[Violations Route] Backend API endpoint not found, returning empty data');
      return res.json({
        items: [],
        data: [],
        totalCount: 0,
        total: 0,
        page: parseInt(req.query.page || 1),
        pageSize: parseInt(req.query.pageSize || 10)
      });
    }

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to fetch violations',
      error: error.message,
    });
  }
});

// Find violations from external API - returns immediately with requestId, processing runs in background
router.post('/find/:companyId', authenticateToken, async (req, res) => {
  console.log('[Violations Route] POST /find/:companyId route hit');
  console.log('[Violations Route] Full request details:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    params: req.params,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'present' : 'missing'
    }
  });
  
  try {
    const { companyId } = req.params;
    // Safely extract body - handle case where body might be undefined
    const body = req.body || {};
    const { states, dateFrom, dateTo } = body;

    console.log('[Violations Route] Request received:', {
      params: req.params,
      body: req.body,
      companyId,
      states,
      dateFrom,
      dateTo,
      contentType: req.headers['content-type']
    });

    if (!companyId) {
      console.error('[Violations Route] Missing companyId in params:', req.params);
      return res.status(400).json({ 
        message: 'Company ID is required',
        received: { params: req.params, body: req.body, url: req.url, originalUrl: req.originalUrl }
      });
    }

    // All parameters are optional - states, dateFrom, dateTo can be empty
    // The external API will handle validation

    console.log('[Violations Route] Finding violations:', {
      companyId,
      states,
      dateFrom,
      dateTo
    });

    // Get token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Create axios instance for external API
    const externalApi = axios.create({
      baseURL: EXTERNAL_VIOLATIONS_API,
      timeout: 10000, // Short timeout since this should return quickly with requestId
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include authentication token
      },
    });

    // Build request body according to Swagger API specification:
    // - states: array of strings (not comma-separated)
    // - startDate: string (not dateFrom)
    // - endDate: string (not dateTo)
    // 'USA' is a valid code meaning all states
    const requestBody = {};
    if (states && Array.isArray(states) && states.length > 0) {
      // API expects states as an array of strings
      requestBody.states = states;
    }
    if (dateFrom) {
      // API expects startDate (not dateFrom)
      requestBody.startDate = dateFrom;
    }
    if (dateTo) {
      // API expects endDate (not dateTo)
      requestBody.endDate = dateTo;
    }

    console.log('[Violations Route] Sending to external API:', {
      url: `/api/Violations/${companyId}`,
      method: 'POST',
      body: requestBody,
      states: states,
      dateFrom: dateFrom,
      dateTo: dateTo
    });

    // This endpoint should return immediately with a requestId
    // The actual violation finding runs in the background
    const response = await externalApi.post(`/api/Violations/${companyId}`, requestBody);

    console.log('[Violations Route] Find violations response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Violations Route] Error finding violations:', error.message);
    console.error('[Violations Route] Error stack:', error.stack);
    console.error('[Violations Route] Error response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('[Violations Route] Error response status:', error.response?.status);
    console.error('[Violations Route] Error response headers:', error.response?.headers);
    console.error('[Violations Route] Request that failed:', {
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
      headers: error.config?.headers
    });

    // If it's a 400 from the external API, return detailed error
    if (error.response?.status === 400) {
      const errorDetails = error.response?.data || {};
      console.error('[Violations Route] External API 400 error details:', errorDetails);
      return res.status(400).json({
        message: errorDetails.message || errorDetails.Message || 'Invalid request to violations API',
        error: error.message,
        details: errorDetails,
        requestSent: {
          companyId,
          states,
          dateFrom,
          dateTo
        }
      });
    }

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to start violations finding',
      error: error.message,
    });
  }
});

// Get violations finding progress
router.get('/progress/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    console.log('[Violations Route] Getting violations progress:', {
      requestId
    });

    // Get token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Create axios instance for external API
    const externalApi = axios.create({
      baseURL: EXTERNAL_VIOLATIONS_API,
      timeout: 10000, // 10 second timeout for progress checks
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include authentication token
      },
    });

    const response = await externalApi.get(`/api/Violations/progress/${requestId}`);

    console.log('[Violations Route] Progress response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Violations Route] Error getting violations progress:', error.message);
    console.error('[Violations Route] Error response:', error.response?.data);
    console.error('[Violations Route] Error status:', error.response?.status);

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to get violations progress',
      error: error.message,
    });
  }
});

// Get violations finding progress by company ID (newer endpoint)
router.get('/progress/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    console.log('[Violations Route] Getting violations progress by company:', {
      companyId
    });

    // Get token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Create axios instance for external API
    const externalApi = axios.create({
      baseURL: EXTERNAL_VIOLATIONS_API,
      timeout: 30000, // Longer timeout for progress checks (API might be slow)
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include authentication token
      },
    });

    const response = await externalApi.get(`/api/Violations/progress/company/${companyId}`);

    console.log('[Violations Route] Progress response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Violations Route] Error getting violations progress by company:', error.message);
    console.error('[Violations Route] Error response:', error.response?.data);
    console.error('[Violations Route] Error status:', error.response?.status);

    // Handle timeout errors gracefully (don't return error to client)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.log('[Violations Route] Timeout checking progress - returning empty response');
      return res.status(408).json({
        message: 'Progress check timed out',
        timeout: true
      });
    }

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to get violations progress',
      error: error.message,
    });
  }
});

module.exports = router;
