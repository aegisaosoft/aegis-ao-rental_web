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

module.exports = router;
