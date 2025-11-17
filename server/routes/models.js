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
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get models grouped by category
router.get('/grouped-by-category', async (req, res) => {
  try {
    const companyId = req.query.companyId || null;
    const locationId = req.query.locationId || null;
    const pickupDate = req.query.pickupDate || null;
    const returnDate = req.query.returnDate || null;
    const response = await apiService.getModelsGroupedByCategory(companyId, locationId, pickupDate, returnDate);
    
    // Unwrap standardized response format if present
    let data = response.data;
    if (data?.result) {
      data = data.result;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Models grouped by category fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Get all models
router.get('/', async (req, res) => {
  try {
    const response = await apiService.getModels(req.query);
    res.json(response.data);
  } catch (error) {
    console.error('Models fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Bulk update daily rates for models
router.put('/bulk-update-daily-rate', authenticateToken, async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.bulkUpdateModelDailyRate(token, req.body);

    // The .NET API returns { count, message }
    const data = response.data?.result || response.data;
    res.json(data);
  } catch (error) {
    console.error('Bulk update models error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to update model daily rates'
    });
  }
});

module.exports = router;

