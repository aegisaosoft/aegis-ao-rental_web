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
  
  // Extract role - check common claim names (case-insensitive)
  // Role can be a string or an array
  let roleClaim = decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] 
    || decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] 
    || decoded?.role 
    || decoded?.Role 
    || decoded?.ROLE
    || 'user';
  
  // Handle role as array (take first value) or string
  let role = 'user';
  if (Array.isArray(roleClaim)) {
    // If role is an array, take the first non-empty value
    role = roleClaim.find(r => r && String(r).trim()) || roleClaim[0] || 'user';
    role = String(role).toLowerCase().trim();
  } else if (roleClaim) {
    role = String(roleClaim).toLowerCase().trim();
  }
  
  // Store token and user data in req for use in routes
  req.token = token;
  // Check admin status (case-insensitive comparison)
  const isAdmin = role === 'admin' || role === 'mainadmin';
  req.user = {
    customerId: customerId,
    email: decoded?.email || decoded?.name || null,
    role: role,
    isAdmin: isAdmin
  };
  
  console.log('[Auth] Token decoded - role claim:', roleClaim, 'type:', typeof roleClaim, 'isArray:', Array.isArray(roleClaim), 'normalized role:', role, 'isAdmin:', isAdmin);
  console.log('[Auth] Full decoded token:', JSON.stringify(decoded, null, 2));
  console.log('[Auth] Token found, proceeding to route handler');
  next();
};

const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is admin based on role or isAdmin flag (case-insensitive)
    const role = req.user?.role ? String(req.user.role).toLowerCase() : null;
    const isAdmin = req.user?.isAdmin || role === 'admin' || role === 'mainadmin';
    
    console.log('[Auth] requireAdmin check - req.user:', JSON.stringify(req.user, null, 2));
    console.log('[Auth] requireAdmin check - role:', role, 'isAdmin:', isAdmin);
    
    if (!isAdmin) {
      console.log('[Auth] Admin check failed - role:', role, 'isAdmin:', req.user?.isAdmin);
      console.log('[Auth] Full req.user object:', JSON.stringify(req.user, null, 2));
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('[Auth] Admin check passed, proceeding');
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
