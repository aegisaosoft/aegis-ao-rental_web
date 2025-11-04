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
    const apiBaseUrl = process.env.API_BASE_URL || 'https://localhost:7163';
    const proxyPath = '/api/companies/config';
    
    // Forward X-Company-Id header if present (set by company detection middleware)
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(req.headers.authorization && { Authorization: req.headers.authorization }),
      ...(req.headers['x-company-id'] && { 'X-Company-Id': req.headers['x-company-id'] })
    };
    
    console.log(`[Companies Route] GET ${proxyPath} with X-Company-Id: ${headers['X-Company-Id'] || 'none'}`);
    
    const response = await axios.get(`${apiBaseUrl}${proxyPath}`, {
      headers: headers,
      httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false }),
      validateStatus: () => true // Don't throw on any status code
    });
    
    console.log(`[Companies Route] GET /config response status: ${response.status}`);
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Companies Route] Config fetch error:', error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
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
    const apiBaseUrl = process.env.API_BASE_URL || 'https://localhost:7163';
    
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
