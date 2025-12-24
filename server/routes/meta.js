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
const router = express.Router();
const axios = require('axios');

// Get API base URL
const API_BASE_URL = process.env.API_BASE_URL || 
  'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';

/**
 * Get Meta connection status for a company
 * GET /api/companies/:companyId/meta/status
 */
router.get('/:companyId/meta/status', async (req, res) => {
  const { companyId } = req.params;
  
  console.log(`[Meta] GET /meta/status for company ${companyId}`);
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/companies/${companyId}/meta/status`,
      {
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[Meta] Error fetching status:`, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * Get available Facebook pages for a company
 * GET /api/companies/:companyId/meta/pages
 */
router.get('/:companyId/meta/pages', async (req, res) => {
  const { companyId } = req.params;
  
  console.log(`[Meta] GET /meta/pages for company ${companyId}`);
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/companies/${companyId}/meta/pages`,
      {
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[Meta] Error fetching pages:`, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * Initiate OAuth flow - redirect to backend API
 * GET /api/meta/oauth/connect/:companyId
 */
router.get('/oauth/connect/:companyId', (req, res) => {
  const { companyId } = req.params;
  const { lang } = req.query;
  
  console.log(`[Meta] Redirecting OAuth connect for company ${companyId} to backend API`);
  
  // Build redirect URL to backend API
  let redirectUrl = `${API_BASE_URL}/api/meta/oauth/connect/${companyId}`;
  if (lang) {
    redirectUrl += `?lang=${lang}`;
  }
  
  // Forward origin header so backend knows where to redirect back
  const origin = req.get('origin') || req.get('referer') || '';
  if (origin) {
    const separator = redirectUrl.includes('?') ? '&' : '?';
    redirectUrl += `${separator}origin=${encodeURIComponent(origin)}`;
  }
  
  return res.redirect(redirectUrl);
});

/**
 * OAuth callback - proxy to backend API
 * GET /api/meta/oauth/callback
 */
router.get('/oauth/callback', async (req, res) => {
  console.log(`[Meta] OAuth callback received, forwarding to backend API`);
  
  try {
    // Forward all query params to backend
    const queryString = new URLSearchParams(req.query).toString();
    const response = await axios.get(
      `${API_BASE_URL}/api/meta/oauth/callback?${queryString}`,
      {
        timeout: 30000,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }
    );
    
    // If backend returns redirect, follow it
    if (response.headers.location) {
      return res.redirect(response.headers.location);
    }
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    // Handle redirect response
    if (error.response?.status === 302 || error.response?.status === 301) {
      const location = error.response.headers.location;
      if (location) {
        return res.redirect(location);
      }
    }
    
    console.error(`[Meta] OAuth callback error:`, error.response?.data || error.message);
    
    // Redirect to frontend with error
    const frontendUrl = req.get('origin') || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/admin?meta_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Disconnect from Meta
 * POST /api/companies/:companyId/meta/disconnect
 */
router.post('/:companyId/meta/disconnect', async (req, res) => {
  const { companyId } = req.params;
  
  console.log(`[Meta] Disconnecting company ${companyId}`);
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/companies/${companyId}/meta/disconnect`,
      {},
      {
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[Meta] Error disconnecting:`, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * Select a Facebook Page
 * POST /api/companies/:companyId/meta/select-page
 */
router.post('/:companyId/meta/select-page', async (req, res) => {
  const { companyId } = req.params;
  
  console.log(`[Meta] Selecting page for company ${companyId}`);
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/companies/${companyId}/meta/select-page`,
      req.body,
      {
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[Meta] Error selecting page:`, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * Refresh Instagram connection
 * POST /api/companies/:companyId/meta/refresh-instagram
 */
router.post('/:companyId/meta/refresh-instagram', async (req, res) => {
  const { companyId } = req.params;
  
  console.log(`[Meta] Refreshing Instagram for company ${companyId}`);
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/companies/${companyId}/meta/refresh-instagram`,
      {},
      {
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[Meta] Error refreshing Instagram:`, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

module.exports = router;
