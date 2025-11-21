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
    
    // Store token and user info in session (support both old and new response format)
    const token = response.data.result?.token || response.data.token;
    const userInfo = response.data.result?.user || response.data.user;
    
    if (token) {
      // Ensure session exists
      if (!req.session) {
        console.error('[Register] ERROR: req.session is null!');
      }
      
      // Touch session to ensure it's initialized
      req.session.touch();
      
      // Store token in session
      req.session.token = token;
      req.session.authenticated = true;
      req.session.authenticatedAt = new Date().toISOString();
      
      // Store ALL user info in session (fetch only once during registration)
      if (userInfo) {
        req.session.user = {
          customerId: userInfo.customerId || userInfo.CustomerId,
          email: userInfo.email || userInfo.Email,
          firstName: userInfo.firstName || userInfo.FirstName,
          lastName: userInfo.lastName || userInfo.LastName,
          phone: userInfo.phone || userInfo.Phone,
          role: userInfo.role || userInfo.Role,
          companyId: userInfo.companyId || userInfo.CompanyId,
          companyName: userInfo.companyName || userInfo.CompanyName,
          isVerified: userInfo.isVerified || userInfo.IsVerified,
          isActive: userInfo.isActive || userInfo.IsActive,
          lastLogin: userInfo.lastLogin || userInfo.LastLogin,
          dateOfBirth: userInfo.dateOfBirth || userInfo.DateOfBirth,
          address: userInfo.address || userInfo.Address,
          city: userInfo.city || userInfo.City,
          state: userInfo.state || userInfo.State,
          country: userInfo.country || userInfo.Country,
          postalCode: userInfo.postalCode || userInfo.PostalCode,
          stripeCustomerId: userInfo.stripeCustomerId || userInfo.StripeCustomerId,
          customerType: userInfo.customerType || userInfo.CustomerType,
          createdAt: userInfo.createdAt || userInfo.CreatedAt,
          updatedAt: userInfo.updatedAt || userInfo.UpdatedAt
        };
        console.log('[Register] ✅ User info stored in session:', {
          customerId: req.session.user.customerId,
          email: req.session.user.email,
          role: req.session.user.role
        });
      } else {
        console.warn('[Register] No user info in register response');
      }
      
      // Mark session as modified to ensure it's saved
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('[Register] Error saving session:', err);
        } else {
          console.log('[Register] ✅ Session saved with token and user info');
        }
      });
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
    
    // Store token and user info in session (support both old and new response format)
    const token = response.data.result?.token || response.data.token;
    const userInfo = response.data.result?.user || response.data.user;
    
    if (token) {
      // Ensure session exists
      if (!req.session) {
        console.error('[Login] ERROR: req.session is null!');
      }
      
      // Touch session to ensure it's initialized (important for saveUninitialized: true)
      req.session.touch();
      
      // Store token in session
      req.session.token = token;
      req.session.authenticated = true;
      req.session.authenticatedAt = new Date().toISOString();
      
      // Store ALL user info in session (fetch only once during login)
      if (userInfo) {
        req.session.user = {
          customerId: userInfo.customerId || userInfo.CustomerId,
          email: userInfo.email || userInfo.Email,
          firstName: userInfo.firstName || userInfo.FirstName,
          lastName: userInfo.lastName || userInfo.LastName,
          phone: userInfo.phone || userInfo.Phone,
          role: userInfo.role || userInfo.Role,
          companyId: userInfo.companyId || userInfo.CompanyId,
          companyName: userInfo.companyName || userInfo.CompanyName,
          isVerified: userInfo.isVerified || userInfo.IsVerified,
          isActive: userInfo.isActive || userInfo.IsActive,
          lastLogin: userInfo.lastLogin || userInfo.LastLogin,
          dateOfBirth: userInfo.dateOfBirth || userInfo.DateOfBirth,
          address: userInfo.address || userInfo.Address,
          city: userInfo.city || userInfo.City,
          state: userInfo.state || userInfo.State,
          country: userInfo.country || userInfo.Country,
          postalCode: userInfo.postalCode || userInfo.PostalCode,
          stripeCustomerId: userInfo.stripeCustomerId || userInfo.StripeCustomerId,
          customerType: userInfo.customerType || userInfo.CustomerType,
          createdAt: userInfo.createdAt || userInfo.CreatedAt,
          updatedAt: userInfo.updatedAt || userInfo.UpdatedAt
        };
        console.log('[Login] ✅ User info stored in session:', {
          customerId: req.session.user.customerId,
          email: req.session.user.email,
          role: req.session.user.role
        });
      } else {
        console.warn('[Login] No user info in login response');
      }
      
      // Mark session as modified to ensure it's saved
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      console.log('[Login] Token and user info stored in session');
      console.log('[Login] Session details:', {
        sessionID: req.sessionID,
        hasToken: !!req.session.token,
        tokenLength: req.session.token ? req.session.token.length : 0,
        hasUser: !!req.session.user,
        cookieSecure: req.session.cookie.secure,
        cookieSameSite: req.session.cookie.sameSite,
        cookiePath: req.session.cookie.path,
        cookieDomain: req.session.cookie.domain,
        cookieMaxAge: req.session.cookie.maxAge
      });
      
      // Explicitly save session and wait for it to complete
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('[Login] ❌ Error saving session:', err);
            reject(err);
          } else {
            console.log('[Login] ✅ Session saved successfully');
            console.log('[Login] Set-Cookie header will be sent:', !!res.getHeader('Set-Cookie'));
            resolve();
          }
        });
      });
      
      // Force session to be saved and cookie to be set
      // Use callback to ensure it completes before response
      return new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('[Login] Error saving session:', err);
            return res.status(500).json({ 
              message: 'Failed to save session',
              error: err.message 
            });
          }
          
          // Manually set cookie header if not already set (fallback)
          if (!res.getHeader('Set-Cookie')) {
            console.warn('[Login] Set-Cookie header missing, express-session should have set it');
          }
          
          // Check if cookie header is set
          const cookieHeader = res.getHeader('Set-Cookie');
          console.log('[Login] Session saved, Set-Cookie header:', cookieHeader ? 'SET' : 'MISSING');
          if (cookieHeader) {
            const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
            console.log('[Login] Cookie preview:', cookieStr.substring(0, 150));
          } else {
            console.error('[Login] WARNING: Set-Cookie header not found! This is a problem.');
            console.error('[Login] Session store might not be working. Check session configuration.');
          }
          
          // Send response after session is saved
          res.json(response.data);
          resolve();
        });
      });
    } else {
      console.warn('[Login] No token in response:', response.data);
      return res.json(response.data);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error during login' 
    });
  }
});

// Get current user profile - return from session ONLY (never re-read from backend)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // authenticateToken middleware already extracted token and set req.token
    const token = req.token || req.session?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Token not found' });
    }
    
    // ALWAYS return from session - never re-read from backend
    if (req.session?.user) {
      console.log('[Profile] ✅ Returning user info from session (no backend call)');
      const userData = { ...req.session.user };
      
      // Include token in response if requested (for QR code generation)
      if (req.query.includeToken === 'true') {
        userData._token = token; // Use _token to avoid conflicts
        console.log('[Profile] Token included in response for QR code generation');
      }
      
      return res.json(userData);
    }
    
    // If user info not in session, return error (should not happen after login)
    console.warn('[Profile] ⚠️ User info not in session - user should log in again');
    return res.status(401).json({ 
      message: 'User session not found. Please log in again.',
      sessionExpired: true
    });
  } catch (error) {
    console.error('[Profile] Profile error:', error.message);
    res.status(500).json({ 
      message: 'Server error',
      details: error.message
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
    
    // Ensure session is initialized
    req.session.touch();
    
    console.log('[Auth Route] ✅ Token stored in session');
    console.log('[Auth Route] Session ID:', req.sessionID);
    
    // Explicitly save session to ensure cookie is set
    req.session.save((err) => {
      if (err) {
        console.error('[Auth Route] ❌ Error saving session:', err);
        return res.status(500).json({ 
          message: 'Failed to save session',
          error: err.message 
        });
      }
      
      // Check if cookie header is set
      const cookieHeader = res.getHeader('Set-Cookie');
      console.log('[Auth Route] Session saved, Set-Cookie header:', cookieHeader ? 'SET' : 'MISSING');
      if (cookieHeader) {
        const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
        console.log('[Auth Route] Cookie preview:', cookieStr.substring(0, 150));
      } else {
        console.error('[Auth Route] WARNING: Set-Cookie header not found!');
      }
      
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
    });
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


// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const response = await apiService.forgotPassword(req.body);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error during forgot password request' 
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const response = await apiService.resetPassword(req.body);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error during password reset' 
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // Get token from session or request
    const token = req.token || req.session?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Token not found' });
    }

    console.log('[Profile Update] Updating profile with token (length:', token.length + ')');
    console.log('[Profile Update] Request body:', JSON.stringify(req.body, null, 2));
    
    // Call the backend API's /api/auth/profile endpoint
    const response = await apiService.updateProfile(token, req.body);
    
    // Update user info in session if update was successful
    if (response.status === 200 && response.data && req.session) {
      // Merge updated fields into session user info
      if (req.session.user) {
        req.session.user = {
          ...req.session.user,
          firstName: response.data.firstName || response.data.FirstName || req.session.user.firstName,
          lastName: response.data.lastName || response.data.LastName || req.session.user.lastName,
          phone: response.data.phone || response.data.Phone || req.session.user.phone,
          dateOfBirth: response.data.dateOfBirth || response.data.DateOfBirth || req.session.user.dateOfBirth,
          address: response.data.address || response.data.Address || req.session.user.address,
          city: response.data.city || response.data.City || req.session.user.city,
          state: response.data.state || response.data.State || req.session.user.state,
          country: response.data.country || response.data.Country || req.session.user.country,
          postalCode: response.data.postalCode || response.data.PostalCode || req.session.user.postalCode,
          updatedAt: response.data.updatedAt || response.data.UpdatedAt || req.session.user.updatedAt
        };
        req.session.save((err) => {
          if (err) {
            console.error('[Profile Update] Error saving updated user info to session:', err);
          } else {
            console.log('[Profile Update] ✅ Updated user info saved to session');
          }
        });
      }
    }
    
    console.log('[Profile Update] Success:', response.status);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Profile Update] Error:', error.message);
    console.error('[Profile Update] Error code:', error.code);
    console.error('[Profile Update] Error response status:', error.response?.status);
    console.error('[Profile Update] Error response data:', JSON.stringify(error.response?.data, null, 2));
    
    // Handle timeout or connection errors
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'API service unavailable. Please try again later.' 
      });
    }
    
    // Forward the error response from the backend
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error',
      errors: error.response?.data?.errors,
      details: error.response?.data
    });
  }
});

module.exports = router;
