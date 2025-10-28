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

// Get all available vehicles with optional filters
router.get('/', async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    
    // Try to get vehicles with token first (if available)
    if (token) {
      try {
        const response = await apiService.getVehicles(token, req.query);
        return res.json(response.data);
      } catch (apiError) {
        console.log('Authenticated API call failed, trying without token');
      }
    }
    
    // Fallback: Try to get vehicles without token (public access)
    try {
      const response = await apiService.getVehicles(null, req.query);
      return res.json(response.data);
    } catch (error) {
      console.error('Vehicles fetch error:', error);
      return res.status(error.response?.status || 500).json({ 
        message: error.response?.data?.message || 'Server error' 
      });
    }
  } catch (error) {
    console.error('Vehicles fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    
    // Try to get vehicle with token first (if available)
    if (token) {
      try {
        const response = await apiService.getVehicle(token, id);
        return res.json(response.data);
      } catch (apiError) {
        console.log('Authenticated API call failed, trying without token');
      }
    }
    
    // Fallback: Try to get vehicle without token (public access)
    try {
      const response = await apiService.getVehicle(null, id);
      return res.json(response.data);
    } catch (error) {
      console.error('Vehicle fetch error:', error);
      return res.status(error.response?.status || 500).json({ 
        message: error.response?.data?.message || 'Server error' 
      });
    }
  } catch (error) {
    console.error('Vehicle fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vehicle categories
router.get('/categories', async (req, res) => {
  try {
    const response = await apiService.getVehicleCategories();
    res.json(response.data);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Get vehicle makes
router.get('/makes', async (req, res) => {
  try {
    const response = await apiService.getVehicleMakes();
    res.json(response.data);
  } catch (error) {
    console.error('Makes fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Get vehicle locations
router.get('/locations', async (req, res) => {
  try {
    const response = await apiService.getVehicleLocations();
    res.json(response.data);
  } catch (error) {
    console.error('Locations fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Admin routes for vehicle management
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.adminCreateVehicle(token, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Vehicle creation error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Update vehicle (requires authentication, not admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.updateVehicle(token, id, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Vehicle update error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.adminDeleteVehicle(token, id);
    res.json(response.data);
  } catch (error) {
    console.error('Vehicle deletion error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

module.exports = router;
