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
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

// Load environment variables FIRST before any imports
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const fullEnvPath = path.join(__dirname, envFile);
if (fs.existsSync(fullEnvPath)) {
  dotenv.config({ path: fullEnvPath, override: true });
} else {
  dotenv.config({ path: path.join(__dirname, '.env'), override: true });
}

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const reservationRoutes = require('./routes/reservations');
const customerRoutes = require('./routes/customers');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const companiesRoutes = require('./routes/companies');
const scanRoutes = require('./routes/scan');
const licenseRoutes = require('./routes/license');
const modelsRoutes = require('./routes/models');
const mockRoutes = require('./routes/mock');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net",
        "https://*.azurewebsites.net",
        "https://localhost:5000",
        "http://localhost:5000",
        "https://fonts.googleapis.com",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net"
      ],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      // Allow camera streams and video playback from self/blob
      mediaSrc: ["'self'", "blob:"],
      imgSrc: ["'self'", "data:", "https:"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.googleapis.com"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Behind reverse proxy (Azure, etc.) so Express should trust X-Forwarded-* headers
app.set('trust proxy', 1);

// Explicitly allow camera access via Permissions-Policy (formerly Feature-Policy)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self)');
  next();
});

// Enable cross-origin isolation for WebAssembly-based SDKs (BlinkID)
// Note: COOP/COEP disabled to allow cross-origin QR images to render in the modal

// Rate limiting (disabled for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: (req) => {
    // Extract IP from Azure proxy headers, handling format like "73.193.149.182:57851"
    const forwarded = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || req.connection?.remoteAddress;
    if (forwarded) {
      // Get first IP if comma-separated, remove port if present
      const ip = forwarded.split(',')[0].trim().split(':')[0];
      return ip || 'unknown';
    }
    return req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'development-secret-key-that-should-be-at-least-32-characters-long',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - must be robust for Azure health checks
app.get('/api/health', (req, res) => {
  try {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message 
    });
  }
});

// Favicon endpoint - prevent 503 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// Update selected company in session
app.post('/api/session/company', (req, res) => {
  const { companyId } = req.body;
  if (companyId) {
    req.session.companyId = companyId;
    res.json({ success: true, companyId });
  } else {
    delete req.session.companyId;
    res.json({ success: true, companyId: null });
  }
});

// Get current company from session
app.get('/api/session/company', (req, res) => {
  res.json({ companyId: req.session.companyId || null });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/Models', modelsRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/license', licenseRoutes);

// Mock routes for development (fallback when external API fails)
app.use('/api/mock', mockRoutes);

// Catch-all proxy for unmapped API routes (forward to C# API)
app.use('/api/*', async (req, res) => {
  const axios = require('axios');
  const apiBaseUrl = process.env.API_BASE_URL || 'https://localhost:7163';
  
  // Skip if this is already handled by a specific route
  // Note: /api/RentalCompanies should go through catch-all, not /api/companies
  const skipPaths = ['/api/auth', '/api/vehicles', '/api/reservations', '/api/customers', '/api/payments', '/api/admin', '/api/Models', '/api/scan', '/api/license', '/api/mock'];
  // Only skip /api/companies (not /api/RentalCompanies)
  if (req.originalUrl.startsWith('/api/companies') || skipPaths.some(path => req.originalUrl.startsWith(path))) {
    return; // Let specific route handlers process it
  }
  
  const apiClient = axios.create({
    baseURL: apiBaseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(req.headers.authorization && { Authorization: req.headers.authorization })
    },
    httpsAgent: new (require('https')).Agent({
      rejectUnauthorized: false
    }),
    // Suppress response parsing for 204/304 to avoid parse errors
    responseType: 'text' // Get raw response first, parse manually
  });
  
  try {
    const proxyPath = req.originalUrl; // Keep full path including /api
    console.log(`[Proxy] ${req.method} ${proxyPath} -> ${apiBaseUrl}${proxyPath}`);
    if (req.method === 'PUT' || req.method === 'POST') {
      console.log('[Proxy] Request body:', JSON.stringify(req.body, null, 2));
    }
    
    // For PUT requests to RentalCompanies, use a more robust approach to handle 204
    if (req.method === 'PUT' && proxyPath.includes('/api/RentalCompanies/')) {
      try {
        const response = await apiClient({
          method: req.method,
          url: proxyPath,
          params: req.query,
          data: req.body,
          validateStatus: (status) => status >= 200 && status < 600, // Accept all status codes
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        
        console.log(`[Proxy] Response status: ${response.status}`);
        
        // Handle 204 No Content - return immediately without trying to parse
        if (response.status === 204) {
          console.log('[Proxy] Returning 204 No Content for PUT');
          return res.status(204).end();
        }
        
        // Handle other responses
        const responseData = response.data;
        if (responseData === null || responseData === undefined || 
            (typeof responseData === 'string' && responseData.trim() === '')) {
          console.log('[Proxy] Returning empty response');
          return res.status(response.status).end();
        }
        
        // Parse JSON if needed
        let jsonData = responseData;
        if (typeof responseData === 'string') {
          try {
            jsonData = JSON.parse(responseData);
          } catch (e) {
            return res.status(response.status).send(responseData);
          }
        }
        
        if (response.status >= 400) {
          return res.status(response.status).json(jsonData || {
            message: 'Error from backend API',
            status: response.status
          });
        }
        
        return res.status(response.status).json(jsonData);
      } catch (axiosError) {
        // Special handling for parse errors with 204
        if (axiosError.response?.status === 204 || 
            axiosError.message?.includes('Connection: close') ||
            axiosError.message?.includes('Parse Error')) {
          console.log('[Proxy] Caught parse error, but status was 204, returning 204');
          return res.status(204).end();
        }
        throw axiosError;
      }
    }
    
    // For other requests, use standard handling
    const response = await apiClient({
      method: req.method,
      url: proxyPath,
      params: req.query,
      data: req.body,
      validateStatus: () => true // Don't throw on any status code
    });
    
    console.log(`[Proxy] Response status: ${response.status}, content-type: ${response.headers['content-type']}`);
    
    // Handle 204 No Content responses - don't try to parse
    if (response.status === 204 || response.status === 304) {
      console.log('[Proxy] Returning 204 No Content');
      return res.status(response.status).end();
    }
    
    // Handle empty responses (no data or empty string)
    const responseData = response.data;
    if (responseData === null || responseData === undefined || 
        (typeof responseData === 'string' && responseData.trim() === '')) {
      console.log('[Proxy] Returning empty response');
      return res.status(response.status).end();
    }
    
    // Try to parse JSON if it's a string
    let jsonData;
    if (typeof responseData === 'string') {
      try {
        jsonData = JSON.parse(responseData);
      } catch (e) {
        // If it's not valid JSON, treat as plain text
        console.log('[Proxy] Response is not JSON, returning as text');
        return res.status(response.status).send(responseData);
      }
    } else {
      jsonData = responseData;
    }
    
    // Handle error status codes
    if (response.status >= 400) {
      console.log('[Proxy] Error response:', jsonData);
      return res.status(response.status).json(jsonData || {
        message: 'Error from backend API',
        status: response.status,
        statusText: response.statusText
      });
    }
    
    // Success response with data
    console.log('[Proxy] Success response');
    res.status(response.status).json(jsonData);
  } catch (error) {
    console.error(`[Proxy Error] ${req.method} ${req.originalUrl}:`, error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      code: error.code,
      message: error.message
    });
    
    // Handle connection/network errors
    if (error.code === 'ECONNRESET' || error.code === 'EPIPE' || 
        error.message?.includes('Connection: close') || 
        error.message?.includes('Parse Error')) {
      // Try to get the status if available
      if (error.response?.status) {
        // If it's a 204, send it properly
        if (error.response.status === 204) {
          return res.status(204).end();
        }
        // Otherwise, return the error response
        return res.status(error.response.status).json(
          error.response.data || { message: error.message }
        );
      }
      // If no response, it's a network error
      return res.status(500).json({
        message: 'Network error connecting to backend API',
        error: error.message
      });
    }
    
    // Handle 204 responses in error cases too
    if (error.response?.status === 204 || error.response?.status === 304) {
      return res.status(error.response.status).end();
    }
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message || 'Server error';
    const errorData = error.response?.data || { message: errorMessage, error: error.message };
    
    res.status(statusCode).json(errorData);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle favicon requests gracefully
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  
  // Check if favicon exists
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    // Return 204 No Content if favicon doesn't exist
    res.status(204).end();
  }
});

// Serve model images - check both locations and return 404 if not found
const clientPublicPath = path.join(__dirname, '../client/public');
const serverPublicPath = path.join(__dirname, 'public');

const sendModelImage = (req, res) => {
  try {
    const filename = req.params.filename;
    
    // In production, __dirname is where index.js is located (root of deployed package)
    // Try server/public/models first (for production) since that's where we copy them
    const serverModelPath = path.join(serverPublicPath, 'models', filename);
    if (fs.existsSync(serverModelPath)) {
      console.log(`[Model Image] Serving from server: ${serverModelPath}`);
      return res.sendFile(serverModelPath);
    }
    
    // Try client/public/models (for development)
    const clientModelPath = path.join(clientPublicPath, 'models', filename);
    if (fs.existsSync(clientModelPath)) {
      console.log(`[Model Image] Serving from client: ${clientModelPath}`);
      return res.sendFile(clientModelPath);
    }
    
    // Debug logging
    console.log(`[Model Image] Not found: ${filename}`);
    console.log(`[Model Image] Checked server path: ${serverModelPath}`);
    console.log(`[Model Image] Checked client path: ${clientModelPath}`);
    
    // Check if models directory exists
    const modelsDir = path.join(serverPublicPath, 'models');
    if (fs.existsSync(modelsDir)) {
      const files = fs.readdirSync(modelsDir);
      console.log(`[Model Image] Models directory exists with ${files.length} files`);
      console.log(`[Model Image] Sample files: ${files.slice(0, 5).join(', ')}`);
    } else {
      console.log(`[Model Image] Models directory does not exist: ${modelsDir}`);
    }
    
    // If not found, return 404 instead of 500
    const fallback = path.join(serverPublicPath, 'economy.jpg');
    if (fs.existsSync(fallback)) {
      console.log(`[Model Image] Using fallback image: ${fallback}`);
      return res.sendFile(fallback);
    }
    res.status(404).send('Image not found');
  } catch (error) {
    console.error('[Model Image] Error serving model image:', error);
    res.status(500).json({ message: 'Error serving image' });
  }
};

// Support both /models/* and /api/models/* for dev proxy
app.get('/models/:filename', (req, res) => sendModelImage(req, res));
app.get('/api/models/:filename', (req, res) => sendModelImage(req, res));

// Helper: return LAN base URL for QR (detect first non-internal IPv4)
app.get('/api/lan-ip', (req, res) => {
  try {
    const ifaces = os.networkInterfaces();
    let ip = '';
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ip = iface.address;
          break;
        }
      }
      if (ip) break;
    }
    const port = String(req.query.port || '3000');
    if (!ip) return res.status(404).json({ message: 'LAN IP not found' });
    const base = `http://${ip}:${port}`;
    res.json({ base });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get LAN IP' });
  }
});

// Serve static files from the React app build directory
// Also serve from client/public in development
if (fs.existsSync(clientPublicPath)) {
  app.use(express.static(clientPublicPath, { fallthrough: true }));
}
app.use(express.static(serverPublicPath, { fallthrough: true }));

// The "catchall" handler: for any request that doesn't
// match API routes, send back React's index.html file.
// This MUST be the last route
app.get('*', (req, res) => {
  // Don't catch API routes or model image requests
  if (req.path.startsWith('/api/') || req.path.startsWith('/models/')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(serverPublicPath, 'index.html'));
});

// Server start
const startServer = async () => {
  try {
    // Check required environment variables
    if (!process.env.API_BASE_URL) {
      console.error('ERROR: API_BASE_URL environment variable is not set!');
      console.error('Please set API_BASE_URL in Azure App Service Configuration');
      // Don't exit in production - let it try to use default
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    }
    
    // HTTP server (production uses Azure HTTPS)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Base URL: ${process.env.API_BASE_URL || 'NOT SET'}`);
      console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

startServer();

module.exports = app;