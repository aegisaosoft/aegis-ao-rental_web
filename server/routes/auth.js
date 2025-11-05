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
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const apiService = require('../config/api');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new customer
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const response = await apiService.register(req.body);
    
    // Store token in session (support both old and new response format)
    const token = response.data.result?.token || response.data.token;
    if (token) {
      req.session.token = token;
      // User data will be fetched via /profile endpoint
    }
    
    return res.status(201).json(response.data);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error during registration' 
    });
  }
});

// Login customer
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const response = await apiService.login(req.body);
    
    // Store token in session (support both old and new response format)
    const token = response.data.result?.token || response.data.token;
    if (token) {
      req.session.token = token;
      // User data will be fetched via /profile endpoint
    }
    
    return res.json(response.data);
  } catch (error) {
    console.error('Login error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error during login' 
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // authenticateToken middleware already verified the token and set req.user
    // Use session token first, fallback to header token
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token not found' });
    }
    
    console.log('[Profile] Fetching profile with token from:', req.session.token ? 'session' : 'header');
    const response = await apiService.getProfile(token);
    return res.json(response.data);
  } catch (error) {
    console.error('[Profile] Profile fetch error:', error.message);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('phone').optional().isMobilePhone(),
  body('dateOfBirth').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const response = await apiService.updateCustomer(req.user.customerId, req.body);
    return res.json(response.data);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

module.exports = router;
