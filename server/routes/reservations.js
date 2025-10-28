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

// Get all reservations (with optional filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.getReservations(req.query);
    res.json(response.data);
  } catch (error) {
    console.error('Reservations fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Get reservation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.getReservation(id);
    res.json(response.data);
  } catch (error) {
    console.error('Reservation fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Create new reservation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.createReservation(req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Reservation creation error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Update reservation
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.updateReservation(id, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Reservation update error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Cancel reservation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    const response = await apiService.cancelReservation(id);
    res.json(response.data);
  } catch (error) {
    console.error('Reservation cancellation error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

module.exports = router;
