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

const jwt = require('jsonwebtoken');
const apiService = require('../config/api');

const authenticateToken = async (req, res, next) => {
  // ALWAYS check session token first (priority), then Authorization header
  const sessionToken = req.session?.token;
  const headerToken = req.headers['authorization']?.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
  
  let token = null;
  let decoded = null;

  // Try session token first
  if (sessionToken) {
    try {
      decoded = jwt.verify(sessionToken, jwtSecret);
      token = sessionToken;
      console.log('[Auth] Using valid token from session');
    } catch (error) {
      console.log('[Auth] Session token invalid, clearing from session:', error.message);
      // Clear invalid session token
      if (req.session) {
        delete req.session.token;
      }
    }
  }

  // If session token didn't work, try header token
  if (!token && headerToken) {
    try {
      decoded = jwt.verify(headerToken, jwtSecret);
      token = headerToken;
      console.log('[Auth] Using valid token from Authorization header, storing in session');
      // Store valid header token in session for future requests
      if (req.session) {
        req.session.token = headerToken;
      }
    } catch (error) {
      console.log('[Auth] Header token also invalid:', error.message);
    }
  }

  // If no valid token found, return error
  if (!token || !decoded) {
    console.log('[Auth] No valid token found in session or headers');
    return res.status(401).json({ message: 'Access token required or invalid' });
  }

  // Extract customer ID from token - the .NET API uses NameIdentifier for customerId
  // The token payload has: { name, nameid (NameIdentifier), role }
  const customerId = decoded.nameid || decoded.NameIdentifier || decoded.name;
  const role = decoded.role || decoded.Role || 'user';
  
  // Store decoded token data in req.user for use in routes
  req.user = {
    customerId: customerId,
    email: decoded.email || decoded.name, // may not have email in token
    role: role
  };
  
  next();
};

const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is admin - this would need to be implemented in the API
    // For now, we'll assume the API handles admin verification
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin
};
