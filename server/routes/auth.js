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
    // authenticateToken middleware already extracted token and set req.token
    const token = req.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Token not found' });
    }
    
    // Check token expiration before sending to backend
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token, { complete: false });
      if (decoded && decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;
        console.log('[Profile] Token expiration check:', {
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          expiresInSeconds: expiresIn,
          isExpired: expiresIn < 0
        });
        if (expiresIn < 0) {
          console.warn('[Profile] Token is expired! Expired', Math.abs(expiresIn), 'seconds ago');
          return res.status(401).json({ 
            message: 'Token has expired. Please log in again.',
            expired: true,
            expiredAt: new Date(decoded.exp * 1000).toISOString()
          });
        }
      }
    } catch (decodeError) {
      console.warn('[Profile] Could not decode token for expiration check:', decodeError.message);
      // Continue anyway - let backend validate
    }
    
    console.log('[Profile] Fetching profile with token (length:', token.length + ')');
    const response = await apiService.getProfile(token);
    
    // Include token in response if requested (for QR code generation)
    // This allows frontend to get token without making a separate request
    const responseData = { ...response.data };
    if (req.query.includeToken === 'true') {
      responseData._token = token; // Use _token to avoid conflicts
      console.log('[Profile] Token included in response for QR code generation');
    }
    
    return res.json(responseData);
  } catch (error) {
    console.error('[Profile] Profile fetch error:', error.message);
    console.error('[Profile] Error code:', error.code);
    console.error('[Profile] Error response status:', error.response?.status);
    console.error('[Profile] Error response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('[Profile] Full error:', error);
    
    // Handle timeout or connection errors
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'API service unavailable. Please try again later.' 
      });
    }
    
    // For 401 errors, provide more details
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: error.response?.data?.message || 'Authentication failed. Token may be invalid or expired.',
        details: error.response?.data,
        backendError: true
      });
    }
    
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error',
      details: error.response?.data
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

// Set token in session (for QR code scan)
router.post('/session-token', async (req, res) => {
  try {
    console.log('[Auth Route] POST /session-token called');
    const { token, companyId, userId } = req.body;
    
    console.log('[Auth Route] Received token:', token ? token.substring(0, 20) + '...' : 'MISSING');
    console.log('[Auth Route] Token length:', token ? token.length : 0);
    console.log('[Auth Route] Company ID:', companyId);
    console.log('[Auth Route] User ID:', userId);
    
    if (!token) {
      console.error('[Auth Route] ❌ Token is required but not provided');
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Store token in session
    const trimmedToken = token.trim();
    req.session.token = trimmedToken;
    
    console.log('[Auth Route] ✅ Token stored in session');
    console.log('[Auth Route] Session ID:', req.sessionID);
    
    // Store companyId and userId in localStorage-equivalent (session or response)
    // These are stored client-side for convenience
    const response = {
      message: 'Token stored in session',
      token: trimmedToken.substring(0, 20) + '...', // Preview only
      companyId,
      userId
    };
    
    console.log('[Auth Route] Sending success response');
    return res.json(response);
  } catch (error) {
    console.error('Session token error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error while storing token' 
    });
  }
});

// Get current session token (for QR code generation)
// This endpoint requires authentication and returns the token from various sources
router.get('/session-token', authenticateToken, (req, res) => {
  try {
    // Option A: Token from authorization header
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    // Option B: Token from cookie
    if (!token) {
      token = req.cookies?.token 
        || req.cookies?.jwt 
        || req.cookies?.auth_token;
    }
    
    // Option C: Token from session
    if (!token && req.session) {
      token = req.session.token;
    }
    
    // Option D: Generate a new short-lived token for mobile transfer
    if (!token && req.user) {
      token = jwt.sign(
        { 
          userId: req.user.customerId, 
          email: req.user.email,
          role: req.user.role 
        },
        process.env.JWT_SECRET || 'development-secret-key-that-should-be-at-least-32-characters-long',
        { expiresIn: '5m' } // Short-lived for QR transfer
      );
    }
    
    if (token) {
      res.json({ token });
    } else {
      res.status(404).json({ error: 'No token available' });
    }
  } catch (error) {
    console.error('[Auth Route] Get session token error:', error);
    res.status(500).json({ error: 'Failed to retrieve token' });
  }
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
