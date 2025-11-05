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
  const token = sessionToken || headerToken;

  if (!token) {
    console.log('[Auth] No token found in session or headers');
    return res.status(401).json({ message: 'Access token required' });
  }

  // If we used session token, log it
  if (sessionToken && !headerToken) {
    console.log('[Auth] Using token from session');
  } else if (headerToken && !sessionToken) {
    console.log('[Auth] Using token from Authorization header (no session token found)');
    // Store header token in session for future requests
    req.session.token = headerToken;
  }

  try {
    // Use fallback JWT secret if environment variable is not set
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Extract customer ID from token - the .NET API uses NameIdentifier for customerId
    // The token payload has: { name, nameid (NameIdentifier), role }
    const customerId = decoded.nameid || decoded.NameIdentifier || decoded.name;
    
    // Store decoded token data in req.user for use in routes
    req.user = {
      customerId: customerId,
      email: decoded.email || decoded.name, // may not have email in token
      role: decoded.role || 'user'
    };
    
    // Ensure token is in session for future requests
    if (!req.session.token) {
      req.session.token = token;
    }
    
    next();
  } catch (error) {
    console.error('[Auth] Token verification error:', error.message);
    // Clear invalid token from session
    if (req.session) {
      delete req.session.token;
    }
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
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
