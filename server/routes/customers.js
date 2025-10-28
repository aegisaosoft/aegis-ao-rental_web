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

// Get all customers (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.adminGetCustomers(token, req.query);
    res.json(response.data);
  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.getCustomer(id);
    res.json(response.data);
  } catch (error) {
    console.error('Customer fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new customer
router.post('/', async (req, res) => {
  try {
    const response = await apiService.createCustomer(req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.updateCustomer(id, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Customer update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
