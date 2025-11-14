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
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all company locations (same pattern as vehicles)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (same as vehicles)
    const token = req.token || req.session.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const params = { ...req.query };
    
    const axios = require('axios');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
    
    const response = await axios.get(`${apiBaseUrl}/api/CompanyLocations`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Company locations fetch error:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
    });
  }
});

// Get single company location by ID (same pattern as vehicles)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (same as vehicles)
    const token = req.token || req.session.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const axios = require('axios');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
    
    const response = await axios.get(`${apiBaseUrl}/api/CompanyLocations/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Company location fetch error:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
    });
  }
});

// Create company location (requires authentication and admin) - same pattern as vehicles
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (same as vehicles)
    const token = req.token || req.session.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const axios = require('axios');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
    
    console.log('[CompanyLocations] Creating location:', {
      url: `${apiBaseUrl}/api/CompanyLocations`,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      body: req.body
    });
    
    const response = await axios.post(`${apiBaseUrl}/api/CompanyLocations`, req.body, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    console.log('[CompanyLocations] Create response status:', response.status);
    
    if (response.status >= 400) {
      console.error('[CompanyLocations] Create error:', response.data);
    }
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Company location creation error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
    });
  }
});

// Update company location (requires authentication and admin) - same pattern as vehicles
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (same as vehicles)
    const token = req.token || req.session.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const axios = require('axios');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
    
    const response = await axios.put(`${apiBaseUrl}/api/CompanyLocations/${id}`, req.body, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    if (response.status === 204) {
      return res.status(204).end();
    }
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Company location update error:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
    });
  }
});

// Delete company location (requires authentication and admin) - same pattern as vehicles
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (same as vehicles)
    const token = req.token || req.session.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const axios = require('axios');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
    
    const response = await axios.delete(`${apiBaseUrl}/api/CompanyLocations/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    if (response.status === 204) {
      return res.status(204).end();
    }
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Company location deletion error:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

