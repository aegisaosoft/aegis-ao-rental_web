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
  message: 'Too many requests from this IP, please try again later.'
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
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
  const apiClient = axios.create({
    baseURL: process.env.API_BASE_URL || 'https://localhost:7163',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(req.headers.authorization && { Authorization: req.headers.authorization })
    },
    httpsAgent: new (require('https')).Agent({
      rejectUnauthorized: false
    })
  });
  
  try {
    const proxyPath = req.originalUrl; // Keep full path including /api
    const response = await apiClient({
      method: req.method,
      url: proxyPath,
      params: req.query,
      data: req.body
    });
    res.json(response.data);
  } catch (error) {
    console.error(`Proxying error for ${req.originalUrl}:`, error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || error.message,
      error: error.message
    });
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
    
    // Try client/public/models first (for development)
    const clientModelPath = path.join(clientPublicPath, 'models', filename);
    if (fs.existsSync(clientModelPath)) {
      console.log(`Serving model image from client: ${clientModelPath}`);
      return res.sendFile(clientModelPath);
    }
    
    // Try server/public/models (for production)
    const serverModelPath = path.join(serverPublicPath, 'models', filename);
    if (fs.existsSync(serverModelPath)) {
      console.log(`Serving model image from server: ${serverModelPath}`);
      return res.sendFile(serverModelPath);
    }
    
    console.log(`Model image not found: ${filename}`);
    console.log(`Checked paths: ${clientModelPath}, ${serverModelPath}`);
    
    // If not found, return 404 instead of 500
    const fallback = path.join(serverPublicPath, 'economy.jpg');
    if (fs.existsSync(fallback)) {
      console.log(`Using fallback image: ${fallback}`);
      return res.sendFile(fallback);
    }
    res.status(404).send('Image not found');
  } catch (error) {
    console.error('Error serving model image:', error);
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
    // HTTP server (production uses Azure HTTPS)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`API Base URL: ${process.env.API_BASE_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;