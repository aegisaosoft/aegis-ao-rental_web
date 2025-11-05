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
  
  // Get token from session or header (don't verify here - let C# API verify it)
  let token = sessionToken || headerToken;

  if (!token) {
    console.log('[Auth] No token found in session or headers');
    return res.status(401).json({ message: 'Access token required' });
  }

  // If we got token from header but not from session, store it in session
  if (headerToken && !sessionToken) {
    console.log('[Auth] Storing header token in session');
    if (req.session) {
      req.session.token = headerToken;
    }
  }

  // Try to decode token (without verification) to extract user info for middleware use
  // If decoding fails, still pass token to API - let API verify it
  let decoded = null;
  try {
    // Decode without verification - just to extract payload if possible
    decoded = jwt.decode(token, { complete: false });
  } catch (error) {
    console.log('[Auth] Could not decode token (non-critical):', error.message);
  }

  // Extract customer ID and role from decoded token if available
  // If not available, API will verify and provide this info
  const customerId = decoded?.nameid || decoded?.NameIdentifier || decoded?.name || null;
  // Extract role - check common claim names
  const roleClaim = decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] 
    || decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] 
    || decoded?.role 
    || decoded?.Role 
    || 'user';
  const role = roleClaim;
  
  // Store token and user data in req for use in routes
  req.token = token;
  req.user = {
    customerId: customerId,
    email: decoded?.email || decoded?.name || null,
    role: role
  };
  
  console.log('[Auth] Token found, proceeding to route handler');
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
