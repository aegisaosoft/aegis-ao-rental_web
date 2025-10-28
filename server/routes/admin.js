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

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Get admin dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    
    // Get various admin data
    const [vehiclesRes, reservationsRes, customersRes] = await Promise.all([
      apiService.adminGetVehicles(token, { limit: 10 }),
      apiService.adminGetReservations(token, { limit: 10 }),
      apiService.adminGetCustomers(token, { limit: 10 })
    ]);

    res.json({
      recentVehicles: vehiclesRes.data,
      recentReservations: reservationsRes.data,
      recentCustomers: customersRes.data
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all vehicles for admin
router.get('/vehicles', async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.adminGetVehicles(token, req.query);
    res.json(response.data);
  } catch (error) {
    console.error('Admin vehicles fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all reservations for admin
router.get('/reservations', async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.adminGetReservations(token, req.query);
    res.json(response.data);
  } catch (error) {
    console.error('Admin reservations fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all customers for admin
router.get('/customers', async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.adminGetCustomers(token, req.query);
    res.json(response.data);
  } catch (error) {
    console.error('Admin customers fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
