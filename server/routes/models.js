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

const router = express.Router();

// Get models grouped by category
router.get('/grouped-by-category', async (req, res) => {
  try {
    const companyId = req.query.companyId || null;
    const response = await apiService.getModelsGroupedByCategory(companyId);
    
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

module.exports = router;

