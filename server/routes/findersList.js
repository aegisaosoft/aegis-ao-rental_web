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

// Get finders list for a company
router.get('/', authenticateToken, async (req, res) => {
  try {
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    console.log('[Finders List Route] Fetching finders list:', {
      companyId,
      hasToken: !!token
    });

    const response = await apiService.getFindersList(token, {
      companyId,
    });

    console.log('[Finders List Route] Response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Finders List Route] Error:', error.message);
    console.error('[Finders List Route] Error response:', error.response?.data);
    console.error('[Finders List Route] Error status:', error.response?.status);

    // If backend API returns 404, return empty data
    if (error.response?.status === 404) {
      console.warn('[Finders List Route] Backend API endpoint not found, returning empty data');
      return res.json({
        id: null,
        companyId,
        findersList: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to fetch finders list',
      error: error.message,
    });
  }
});

// Create or update finders list for a company
router.post('/', authenticateToken, async (req, res) => {
  try {
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { companyId } = req.query;
    const { findersList } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    if (!Array.isArray(findersList)) {
      return res.status(400).json({ message: 'Finders list must be an array' });
    }

    console.log('[Finders List Route] Saving finders list:', {
      companyId,
      count: findersList.length,
      hasToken: !!token
    });

    const response = await apiService.saveFindersList(token, {
      companyId,
      findersList: findersList || [],
    });

    console.log('[Finders List Route] Response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Finders List Route] Error:', error.message);
    console.error('[Finders List Route] Error response:', error.response?.data);
    console.error('[Finders List Route] Error status:', error.response?.status);

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to save finders list',
      error: error.message,
    });
  }
});

// Update finders list (PUT) - same as POST
router.put('/', authenticateToken, async (req, res) => {
  try {
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { companyId } = req.query;
    const { findersList } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    if (!Array.isArray(findersList)) {
      return res.status(400).json({ message: 'Finders list must be an array' });
    }

    console.log('[Finders List Route] Saving finders list (PUT):', {
      companyId,
      count: findersList.length,
      hasToken: !!token
    });

    const response = await apiService.saveFindersList(token, {
      companyId,
      findersList: findersList || [],
    });

    console.log('[Finders List Route] Response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Finders List Route] Error:', error.message);
    console.error('[Finders List Route] Error response:', error.response?.data);
    console.error('[Finders List Route] Error status:', error.response?.status);

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to save finders list',
      error: error.message,
    });
  }
});

module.exports = router;
