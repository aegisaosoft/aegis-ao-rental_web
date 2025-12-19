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
  // express-session middleware runs before this, so req.session should be available
  // However, if no session cookie is sent, express-session creates a NEW empty session
  // We need to check if this is a NEW session (no cookie) vs an existing session (has cookie but no data)
  
  const hasSessionCookie = req.headers.cookie?.includes('connect.sid');
  const sessionToken = req.session?.token;
  const headerToken = req.headers['authorization']?.split(' ')[1];
  
  // Check if this is a new session (no cookie sent) - this means user is not authenticated
  // vs an existing session that just doesn't have a token yet
  const isNewSession = !hasSessionCookie && req.session && Object.keys(req.session).length === 0;
  
  console.log('[Auth] Session check:', {
    sessionID: req.sessionID,
    hasSession: !!req.session,
    hasSessionToken: !!sessionToken,
    hasHeaderToken: !!headerToken,
    hasCookies: !!req.headers.cookie,
    hasSessionCookie: hasSessionCookie,
    isNewSession: isNewSession,
    sessionKeys: req.session ? Object.keys(req.session) : [],
    cookieHeader: req.headers.cookie ? (req.headers.cookie.includes('connect.sid') ? 'connect.sid present' : req.headers.cookie.substring(0, 100)) : 'none',
    url: req.originalUrl || req.url,
    method: req.method
  });
  
  // Get token from session or header (don't verify here - let C# API verify it)
  let token = sessionToken || headerToken;

  if (!token) {
    console.error('[Auth] ❌ No token found in session or headers');
    console.error('[Auth] Debug info:', {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      sessionTokenPresent: !!req.session?.token,
      hasAuthHeader: !!req.headers['authorization'],
      authHeaderValue: req.headers['authorization'] ? req.headers['authorization'].substring(0, 50) + '...' : 'none',
      hasCookies: !!req.headers.cookie,
      cookieCount: req.headers.cookie ? req.headers.cookie.split(';').length : 0,
      cookies: req.headers.cookie ? req.headers.cookie.substring(0, 200) : 'none',
      url: req.originalUrl || req.url,
      method: req.method,
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    
    // More detailed error message
    const errorDetails = {
      message: 'Access token required',
      details: 'Please ensure you are logged in and your session is valid. Try logging out and logging back in.',
      debug: {
        hasSession: !!req.session,
        hasSessionToken: !!req.session?.token,
        hasAuthHeader: !!req.headers['authorization'],
        hasCookies: !!req.headers.cookie,
        sessionID: req.sessionID
      }
    };
    
    return res.status(401).json(errorDetails);
  }

  // If we got token from header but not from session, store it in session
  if (headerToken && !sessionToken) {
    console.log('[Auth] Storing header token in session');
    if (req.session) {
      req.session.token = headerToken;
      // Save session to ensure it persists
      req.session.save((err) => {
        if (err) {
          console.error('[Auth] Error saving session after storing token:', err);
        } else {
          console.log('[Auth] Session saved after storing header token');
        }
      });
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

  // PRIORITY: Get role from session first (source of truth from login/register)
  // Fall back to token if not in session
  let role = null;
  let customerId = null;
  let email = null;
  
  // Check session first (this is the authoritative source from login/register)
  if (req.session?.user) {
    role = req.session.user.role;
    customerId = req.session.user.customerId;
    email = req.session.user.email;
    console.log('[Auth] ✅ Using role from session:', role);
  }
  
  // If role not in session, extract from token and store in session
  if (!role && decoded) {
    console.log('[Auth] Role not in session, extracting from token');
    
    // Extract customer ID from decoded token
    customerId = customerId || decoded?.nameid || decoded?.NameIdentifier || decoded?.name || null;
    
    // Extract role - check common claim names (case-insensitive)
    // Role can be a string or an array
    let roleClaim = decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] 
      || decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] 
      || decoded?.role 
      || decoded?.Role 
      || decoded?.ROLE
      || 'user';
    
    // Handle role as array (take first value) or string
    if (Array.isArray(roleClaim)) {
      // If role is an array, take the first non-empty value
      role = roleClaim.find(r => r && String(r).trim()) || roleClaim[0] || 'user';
      role = String(role).toLowerCase().trim();
    } else if (roleClaim) {
      role = String(roleClaim).toLowerCase().trim();
    } else {
      role = 'user';
    }
    
    // Store role and user info in session (from token)
    if (req.session) {
      if (!req.session.user) {
        req.session.user = {};
      }
      
      // Store role in session from token
      if (role) {
        req.session.user.role = role;
      }
      
      // Update customerId if available and not already set
      if (customerId && !req.session.user.customerId) {
        req.session.user.customerId = customerId;
      }
      
      // Update email if available and not already set
      const tokenEmail = decoded?.email || decoded?.name || decoded?.Email;
      if (tokenEmail && !req.session.user.email) {
        req.session.user.email = tokenEmail;
        email = tokenEmail;
      }
      
      // Save session if we updated it
      if (role || customerId || email) {
        req.session.save((err) => {
          if (err) {
            console.error('[Auth] Error saving role to session:', err);
          } else {
            console.log('[Auth] Role and user info stored/updated in session from token:', {
              role: role,
              customerId: customerId,
              email: email
            });
          }
        });
      }
    }
  }
  
  // Default role if still not set
  if (!role) {
    role = 'user';
  }
  
  // Store token and user data in req for use in routes
  // Use role from session (or token if session didn't have it)
  req.token = token;
  // Check admin status (case-insensitive comparison)
  const isAdmin = role === 'admin' || role === 'mainadmin';
  req.user = {
    customerId: customerId,
    email: email || decoded?.email || decoded?.name || null,
    role: role, // This is now from session (priority) or token (fallback)
    isAdmin: isAdmin
  };
  
  console.log('[Auth] Role source:', req.session?.user?.role ? 'session' : 'token', '- role:', role, 'isAdmin:', isAdmin);
  if (decoded) {
    console.log('[Auth] Token decoded:', JSON.stringify(decoded, null, 2));
  }
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
