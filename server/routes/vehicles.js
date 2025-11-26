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
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all available vehicles with optional filters
router.get('/', async (req, res) => {
  try {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    
    // Try to get vehicles with token first (if available)
    if (token) {
      try {
        const response = await apiService.getVehicles(token, req.query);
        return res.json(response.data);
      } catch (apiError) {
        console.log('Authenticated API call failed, trying without token');
      }
    }
    
    // Fallback: Try to get vehicles without token (public access)
    try {
      const response = await apiService.getVehicles(null, req.query);
      return res.json(response.data);
    } catch (error) {
      console.error('Vehicles fetch error:', error);
      return res.status(error.response?.status || 500).json({ 
        message: error.response?.data?.message || 'Server error' 
      });
    }
  } catch (error) {
    console.error('Vehicles fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lookup vehicle info by VIN using external validation API (must be before /:id route)
router.get('/vin-lookup/:vin', authenticateToken, async (req, res) => {
  try {
    const { vin } = req.params;

    if (!vin || vin.length !== 17) {
      return res.status(400).json({
        message: 'Invalid VIN. VIN must be exactly 17 characters.'
      });
    }

    const axios = require('axios');
    const vinApiUrl = `https://vehicle-validation.aegis-rental.com/api/vin/decode/${encodeURIComponent(vin.toUpperCase())}`;

    const response = await axios.get(vinApiUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    return res.json(response.data);
  } catch (error) {
    console.error('VIN lookup error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to lookup VIN information',
      error: error.message
    });
  }
});

// Get vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    
    // Try to get vehicle with token first (if available)
    if (token) {
      try {
        const response = await apiService.getVehicle(token, id);
        return res.json(response.data);
      } catch (apiError) {
        console.log('Authenticated API call failed, trying without token');
      }
    }
    
    // Fallback: Try to get vehicle without token (public access)
    try {
      const response = await apiService.getVehicle(null, id);
      return res.json(response.data);
    } catch (error) {
      console.error('Vehicle fetch error:', error);
      return res.status(error.response?.status || 500).json({ 
        message: error.response?.data?.message || 'Server error' 
      });
    }
  } catch (error) {
    console.error('Vehicle fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vehicle categories
router.get('/categories', async (req, res) => {
  try {
    const response = await apiService.getVehicleCategories();
    res.json(response.data);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Get vehicle makes
router.get('/makes', async (req, res) => {
  try {
    const response = await apiService.getVehicleMakes();
    res.json(response.data);
  } catch (error) {
    console.error('Makes fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Get vehicle locations
router.get('/locations', async (req, res) => {
  try {
    const response = await apiService.getVehicleLocations();
    res.json(response.data);
  } catch (error) {
    console.error('Locations fetch error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Admin routes for vehicle management
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.adminCreateVehicle(token, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Vehicle creation error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Update vehicle (requires authentication, not admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.updateVehicle(token, id, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Vehicle update error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const response = await apiService.adminDeleteVehicle(token, id);
    res.json(response.data);
  } catch (error) {
    console.error('Vehicle deletion error:', error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || 'Server error' 
    });
  }
});

// Import vehicles from CSV (requires authentication and admin)
// Authenticate first, then process file upload
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Create a wrapper to handle multer after authentication
// Use upload.any() to parse both files and form fields (fieldMapping, companyId)
const handleFileUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('[Vehicle Import] Multer error:', err);
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    next();
  });
};

router.post('/import', authenticateToken, requireAdmin, handleFileUpload, async (req, res) => {
  try {
    console.log('[Vehicle Import] Request received, user:', req.user);
    console.log('[Vehicle Import] Is admin:', req.user?.isAdmin, 'Role:', req.user?.role);
    
    // Find the file in req.files (multer.any() puts files in req.files, not req.file)
    const file = req.files?.find(f => f.fieldname === 'file');
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Use token from authenticateToken middleware (req.token) - it gets it from session
    const token = req.token || req.session?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get form fields from req.body (multer.any() parses them)
    const companyId = req.body?.companyId;
    const fieldMapping = req.body?.fieldMapping;

    // Forward the file and fields to the backend API
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Append file
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
    
    // Append companyId if present
    if (companyId) {
      formData.append('companyId', companyId);
    }
    
    // Append fieldMapping if present
    if (fieldMapping) {
      formData.append('fieldMapping', fieldMapping);
    }

    const axios = require('axios');
    const https = require('https');
    const apiBaseUrl = process.env.API_BASE_URL || 'https://localhost:7163';
    
    try {
      const response = await axios.post(`${apiBaseUrl}/api/vehicles/import`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false // Allow self-signed certificates in development
        })
      });
      res.json(response.data);
    } catch (apiError) {
      console.error('[Vehicle Import] Backend API error:', apiError.response?.data || apiError.message);
      console.error('[Vehicle Import] Full error:', JSON.stringify(apiError.response?.data, null, 2));
      const status = apiError.response?.status || 500;
      const errorData = apiError.response?.data || { message: apiError.message || 'Server error' };
      res.status(status).json(errorData);
    }
  } catch (error) {
    console.error('Vehicle import error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error' 
    });
  }
});

module.exports = router;
