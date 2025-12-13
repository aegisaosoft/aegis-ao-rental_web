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
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get violations for a company
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { companyId, dateFrom, dateTo, page = 1, pageSize = 10 } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    console.log('[Violations Route] Fetching violations:', {
      companyId,
      dateFrom,
      dateTo,
      page,
      pageSize,
      hasToken: !!token
    });

    const response = await apiService.getViolations(token, {
      companyId,
      dateFrom,
      dateTo,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    console.log('[Violations Route] Response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Violations Route] Error:', error.message);
    console.error('[Violations Route] Error response:', error.response?.data);
    console.error('[Violations Route] Error status:', error.response?.status);
    
    // If backend API returns 404, return empty data
    if (error.response?.status === 404) {
      console.warn('[Violations Route] Backend API endpoint not found, returning empty data');
      return res.json({
        items: [],
        data: [],
        totalCount: 0,
        total: 0,
        page: parseInt(req.query.page || 1),
        pageSize: parseInt(req.query.pageSize || 10)
      });
    }

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to fetch violations',
      error: error.message,
    });
  }
});

module.exports = router;
