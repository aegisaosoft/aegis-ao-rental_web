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

// Helper middleware to get token from session (optional - doesn't fail if no token)
const getTokenFromSession = (req, res, next) => {
  // Get token from session (priority) or Authorization header
  const sessionToken = req.session?.token;
  const headerToken = req.headers['authorization']?.split(' ')[1];
  
  // Set req.token if available (for consistency with authenticateToken middleware)
  req.token = sessionToken || headerToken;
  
  // Continue even if no token (public endpoint)
  next();
};

// Get all company locations (anonymous access allowed - public endpoint)
router.get('/', getTokenFromSession, async (req, res) => {
  try {
    // Token is optional for this endpoint (backend allows anonymous access)
    // Use token from getTokenFromSession middleware (req.token) - it gets it from session
    const token = req.token;
    
    const params = { ...req.query };
    
    // Use apiClient from apiService which is already configured with proper base URL
    const { apiClient } = require('../config/api');
    
    const config = { 
      params,
      validateStatus: () => true // Don't throw on any status code
    };
    
    // Add authorization header only if token is available
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    
    const response = await apiClient.get('/api/CompanyLocations', config);
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Company Locations] Fetch error:', error.message);
    console.error('[Company Locations] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'Backend API is not available. Please check if the backend server is running.',
        error: error.message
      });
    }
    
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
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { apiClient } = require('../config/api');
    
    const response = await apiClient.get(`/api/CompanyLocations/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Company Locations] Fetch error:', error.message);
    console.error('[Company Locations] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'Backend API is not available. Please check if the backend server is running.',
        error: error.message
      });
    }
    
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
    });
  }
});

// Create company location (requires authentication and admin) - same pattern as vehicles
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { apiClient } = require('../config/api');
    
    const response = await apiClient.post('/api/CompanyLocations', req.body, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Company Locations] Creation error:', error.message);
    console.error('[Company Locations] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'Backend API is not available. Please check if the backend server is running.',
        error: error.message
      });
    }
    
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
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { apiClient } = require('../config/api');
    
    const response = await apiClient.put(`/api/CompanyLocations/${id}`, req.body, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });
    
    if (response.status === 204) {
      return res.status(204).end();
    }
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Company Locations] Update error:', error.message);
    console.error('[Company Locations] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'Backend API is not available. Please check if the backend server is running.',
        error: error.message
      });
    }
    
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
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { apiClient } = require('../config/api');
    
    const response = await apiClient.delete(`/api/CompanyLocations/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });
    
    if (response.status === 204) {
      return res.status(204).end();
    }
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Company Locations] Deletion error:', error.message);
    console.error('[Company Locations] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'Backend API is not available. Please check if the backend server is running.',
        error: error.message
      });
    }
    
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

