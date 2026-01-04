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
const multer = require('multer');
const FormData = require('form-data');
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
const companyLocationsRoutes = require('./routes/companyLocations');
const scanRoutes = require('./routes/scan');
const licenseRoutes = require('./routes/license');
const modelsRoutes = require('./routes/models');
const terminalRoutes = require('./routes/terminal');
const webhooksRoutes = require('./routes/webhooks');
const violationsRoutes = require('./routes/violations');
const findersListRoutes = require('./routes/findersList');
const metaRoutes = require('./routes/meta');
const { apiClient } = require('./config/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Log startup information
console.log('='.repeat(60));
console.log('Node.js Proxy Server Starting...');
console.log(`Port: ${PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`API_BASE_URL: ${process.env.API_BASE_URL || 'NOT SET (will use default)'}`);
console.log('='.repeat(60));

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
        "https://cdn.jsdelivr.net",
        // Add Microblink license validation domains
        "https://*.microblink.com",
        "https://api.microblink.com",
        "https://baltazar.microblink.com"  // BlinkID license validation server
      ],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      // Allow camera streams and video playback from self/blob and Azure public assets
      mediaSrc: [
        "'self'",
        "blob:",
        "data:",
        "https:",
        "http://localhost:3000",
        "https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net",
        "https://*.azurewebsites.net",
        "https://*.aegis-rental.com"
      ],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      workerSrc: ["'self'", "blob:", "https://unpkg.com", "https://cdn.jsdelivr.net"],
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

// Rate limiting disabled (unlimited requests)

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Trust proxy for Azure (needed for secure cookies behind load balancer)
app.set('trust proxy', 1);

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.JWT_SECRET || 'development-secret-key-that-should-be-at-least-32-characters-long',
  resave: true, // Force save session even if not modified (helps with cookie setting)
  saveUninitialized: true, // Save uninitialized sessions (needed for login flow)
  name: 'connect.sid', // Explicit session cookie name
  cookie: {
    secure: isProduction, // true in production (HTTPS), false in development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site Stripe redirects in production
    path: '/', // Ensure cookie is available for all paths
    domain: undefined // Don't set domain - let browser handle it
  },
  rolling: true // Reset expiration on every request
}));

// Body parsing middleware - skip for multipart/form-data (handled by multer)
const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '10mb' });

app.use((req, res, next) => {
  // Skip body parsers for multipart/form-data requests (handled by multer)
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  // Skip body parsers for multipart/form-data requests (handled by multer)
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  urlencodedParser(req, res, next);
});

// Multer for file uploads (memory storage for proxying)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

// Favicon endpoint - serve actual favicon file
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(204).end();
  }
});

// Serve SVG favicon
app.get('/favicon.svg', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon.svg');
  if (fs.existsSync(faviconPath)) {
    res.type('image/svg+xml').sendFile(faviconPath);
  } else {
    res.status(404).end();
  }
});

// Serve PNG favicons
app.get('/favicon-16.png', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon-16.png');
  if (fs.existsSync(faviconPath)) {
    res.type('image/png').sendFile(faviconPath);
  } else {
    res.status(404).end();
  }
});

app.get('/favicon-32.png', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon-32.png');
  if (fs.existsSync(faviconPath)) {
    res.type('image/png').sendFile(faviconPath);
  } else {
    res.status(404).end();
  }
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
app.use('/api/booking', reservationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/CompanyLocations', companyLocationsRoutes);
app.use('/api/Models', modelsRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/finderslist', findersListRoutes);
app.use('/api/companies', metaRoutes); // Meta integration routes (mounted on /api/companies/:companyId/meta/*)
app.use('/api/meta', metaRoutes); // OAuth routes (mounted on /api/meta/oauth/*)

// Stream static files from backend for agreements and customers folders
app.get(['/api/agreements/*', '/api/customers/*'], async (req, res) => {
  try {
    // Map /api/agreements/... -> /agreements/..., /api/customers/... -> /customers/...
    const backendPath = req.originalUrl.replace(/^\/api/, '');
    console.log('[Static Proxy] Streaming', backendPath);
    const response = await apiClient.get(backendPath, {
      responseType: 'stream'
    });
    // Forward content type and length
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    // Allow inline viewing
    if (response.headers['content-disposition']) {
      res.setHeader('Content-Disposition', response.headers['content-disposition']);
    }
    response.data.pipe(res);
  } catch (error) {
    console.error('[Static Proxy] Error streaming', req.originalUrl, error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to fetch file'
    });
  }
});

// Middleware to preserve original hostname early in the request
// This ensures we capture the hostname before any proxies modify it
app.use((req, res, next) => {
  // Store the original hostname for later use
  const originalHost = req.get('x-forwarded-host') || req.get('host') || req.hostname || '';
  if (originalHost) {
    req.originalHostname = originalHost.toLowerCase().split(':')[0];
    console.log(`[Host Preservation] Captured original hostname: ${req.originalHostname} from headers:`, {
      'x-forwarded-host': req.get('x-forwarded-host'),
      'host': req.get('host'),
      'hostname': req.hostname
    });
  }
  next();
});

// Middleware to detect company from domain and add X-Company-Id header
// This helps the backend middleware identify the company
app.use('/api/*', async (req, res, next) => {
  // Early debug logging for ALL API requests
  console.log(`[API Request] ${req.method} ${req.originalUrl}`);
  if (req.originalUrl.includes('/Media/')) {
    console.log(`[Media Early] Request received: ${req.method} ${req.originalUrl}`);
    console.log(`[Media Early] Content-Type: ${req.headers['content-type']}`);
  }
  
  // Skip company detection for session-token endpoint (it's fast and doesn't need it)
  if (req.originalUrl === '/api/auth/session-token' || req.path === '/auth/session-token') {
    console.log('[Company Detection] Skipping for /session-token endpoint');
    return next();
  }
  
  try {
    // Extract hostname from request - check forwarded headers first (for Azure/proxies)
    const hostname = req.get('x-forwarded-host') || req.get('host') || req.hostname || '';
    const hostnameLower = hostname.toLowerCase().split(':')[0]; // Remove port if present
    
    // Check if this is a .localhost subdomain (e.g., miamilifecars.localhost)
    const isLocalhostSubdomain = hostnameLower.endsWith('.localhost');
    const isPlainLocalhost = hostnameLower === 'localhost' || hostnameLower === '127.0.0.1';
    
    // Skip only for plain localhost (not subdomains)
    if (isPlainLocalhost) {
      console.log(`[Company Detection] Skipping plain localhost: ${hostnameLower}`);
      return next();
    }
    
    // Extract subdomain from hostname
    // For .localhost subdomains: miamilifecars.localhost -> miamilifecars
    // For production domains: company1.aegis-rental.com -> company1
    let subdomain = null;
    let fullDomain = null;
    
    if (isLocalhostSubdomain) {
      // Extract subdomain from .localhost (e.g., miamilifecars.localhost -> miamilifecars)
      const parts = hostnameLower.split('.');
      if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
        subdomain = parts[0];
        fullDomain = hostnameLower; // Use full hostname for .localhost subdomains
        console.log(`[Company Detection] .localhost subdomain detected: ${subdomain} from ${hostnameLower}`);
      }
    } else {
      // Extract subdomain from production domain (e.g., company1.aegis-rental.com -> company1)
      const parts = hostnameLower.split('.');
      if (parts.length > 2) {
        subdomain = parts[0];
        fullDomain = `${subdomain}.aegis-rental.com`;
      }
    }
    
    if (subdomain) {
      // Skip 'www' subdomain
      if (subdomain === 'www') {
        return next();
      }
      
      // Use Azure API by default for local testing (or set API_BASE_URL in .env)
      const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
      
      console.log(`[Company Detection] Hostname: ${hostnameLower}, Subdomain: ${subdomain}, FullDomain: ${fullDomain}`);
      console.log(`[Company Detection] API Base URL: ${apiBaseUrl}`);
      
      try {
        // For .localhost subdomains, we need to query the backend directly by subdomain
        // since they won't be in the domain mapping (which is for production domains)
        if (isLocalhostSubdomain) {
          console.log(`[Company Detection] .localhost subdomain detected, querying backend for subdomain: ${subdomain}`);
          // The backend will resolve the company from the hostname in X-Forwarded-Host header
          // We'll ensure the host header is forwarded, but don't set X-Company-Id here
          // Let the backend middleware handle the resolution
          console.log(`[Company Detection] Forwarding hostname ${hostnameLower} to backend for resolution`);
        } else {
          // For production domains, use domain mapping
          const domainMappingUrl = `${apiBaseUrl}/api/companies/domain-mapping`;
          console.log(`[Company Detection] Fetching domain mapping from: ${domainMappingUrl}`);
          
          const domainMappingResponse = await axios.get(domainMappingUrl, {
            httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false }),
            timeout: 10000 // Increased timeout for production
          });
          
          const domainMapping = domainMappingResponse.data?.result || domainMappingResponse.data;
          
          console.log(`[Company Detection] Domain mapping response status: ${domainMappingResponse.status}`);
          console.log(`[Company Detection] Domain mapping keys:`, Object.keys(domainMapping || {}));
          
          if (domainMapping && domainMapping[fullDomain]) {
            const companyId = domainMapping[fullDomain];
            req.headers['x-company-id'] = companyId;
            console.log(`[Company Detection] ✓ Set X-Company-Id header: ${companyId} for ${fullDomain}`);
          } else {
            console.warn(`[Company Detection] ✗ No mapping found for ${fullDomain}`);
            console.warn(`[Company Detection] Available domains:`, Object.keys(domainMapping || {}));
            console.warn(`[Company Detection] Looking for: ${fullDomain}`);
            // Don't set header - let backend try to resolve from hostname
          }
        }
      } catch (err) {
        // If domain mapping fails, log but continue - backend will try to resolve from hostname
        console.error(`[Company Detection] ✗ Could not fetch domain mapping for ${hostnameLower}:`, err.message);
        console.error(`[Company Detection] Error details:`, {
          code: err.code,
          response: err.response?.status,
          responseData: err.response?.data,
          message: err.message,
          stack: err.stack
        });
        // Backend middleware will try to resolve from hostname as fallback
      }
    } else {
      console.log(`[Company Detection] Hostname ${hostnameLower} does not appear to have a subdomain`);
    }
  } catch (err) {
    // Don't block request if company detection fails
    console.warn('[Company Detection] Middleware error:', err.message);
  }
  
  next();
});


// Helper middleware to get token from session (optional - doesn't fail if no token)
// This ensures token is available from session before catch-all proxy
const getTokenFromSession = (req, res, next) => {
  // Get token from session (priority) or Authorization header
  const sessionToken = req.session?.token;
  const headerToken = req.headers['authorization']?.split(' ')[1];
  
  // Set req.token if available (for consistency with authenticateToken middleware)
  req.token = sessionToken || headerToken;
  
  // Continue even if no token (some endpoints may be public)
  next();
};

// Catch-all proxy for unmapped API routes (forward to C# API)
// Handle file uploads with multer middleware
// Use getTokenFromSession middleware to ensure token is retrieved from session
app.use('/api/*', getTokenFromSession, upload.any(), async (req, res) => {
  const axios = require('axios');
  const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
  
  // Debug logging for Media requests
  if (req.originalUrl.includes('/Media/')) {
    console.log(`[Media Debug] Received request: ${req.method} ${req.originalUrl}`);
    console.log(`[Media Debug] Headers:`, JSON.stringify(req.headers, null, 2));
  }
  
      // Skip if this is already handled by a specific route
    // Note: /api/RentalCompanies should go through catch-all, not /api/companies
    const skipPaths = ['/api/auth', '/api/vehicles', '/api/booking', '/api/customers', '/api/payments', '/api/admin', '/api/companies', '/api/CompanyLocations', '/api/Models', '/api/scan', '/api/license', '/api/violations', '/api/finderslist', '/api/meta'];
    // Note: /api/DriverLicense/upload and /api/DriverLicense/image are handled directly on client server, not forwarded to API
    if (req.originalUrl.startsWith('/api/DriverLicense') ||
        skipPaths.some(path => req.originalUrl.startsWith(path))) {
      // Don't handle this request - let specific route handlers process it
      // Check if response was already sent by the specific route
      if (!res.headersSent) {
        // If no response was sent, the specific route didn't handle it
        // This shouldn't happen, but log it for debugging
        console.warn(`[Proxy Catch-All] Skipped ${req.method} ${req.originalUrl} but no response was sent by specific route`);
      }
      return; // Exit this middleware - specific route should have handled it
    }
    
    // Log that we're processing this route through catch-all
    console.log(`[Proxy Catch-All] Processing: ${req.method} ${req.originalUrl}`);
  
  // Use token from getTokenFromSession middleware (req.token) - it gets it from session
  // Fallback to manual extraction if middleware didn't set it
  const headerToken = req.headers.authorization?.split(' ')[1];
  const token = req.token || req.session?.token || headerToken;
  
  console.log(`[Proxy Catch-All] Token extraction:`, {
    hasReqToken: !!req.token, // From getTokenFromSession middleware
    hasSessionToken: !!req.session?.token,
    hasHeaderToken: !!headerToken,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    sessionID: req.sessionID,
    hasSessionCookie: req.headers.cookie?.includes('connect.sid'),
    url: req.originalUrl
  });
  
  // Create axios instance (don't set default headers with token - set it per request)
  const apiClient = axios.create({
    baseURL: apiBaseUrl,
    timeout: 30000,
    withCredentials: true, // Forward credentials (cookies) to backend
    httpsAgent: new (require('https')).Agent({
      rejectUnauthorized: false
    }),
    // Suppress response parsing for 204/304 to avoid parse errors
    responseType: 'text' // Get raw response first, parse manually
  });
  
      try {
      const proxyPath = req.originalUrl; // Keep full path including /api
      const fullBackendUrl = `${apiBaseUrl}${proxyPath}`;
      console.log(`[Proxy] ${req.method} ${proxyPath} -> ${fullBackendUrl}`);
      if (req.method === 'DELETE') {
        console.log('[Proxy] DELETE params:', {
          companyId: req.params.companyId,
          serviceId: req.params.serviceId,
        });
      }
      console.log(`[Proxy] Request headers:`, {
        'content-type': req.headers['content-type'],
        'authorization': req.headers['authorization'] ? 'present' : 'missing',
        'x-company-id': req.headers['x-company-id'] || 'missing'
      });
      
      // For 404 errors, help debug by showing what we're trying to reach
      if (proxyPath.includes('DriverLicense')) {
        console.log(`[Proxy] DriverLicense endpoint - Backend URL: ${fullBackendUrl}`);
        console.log(`[Proxy] Make sure backend API is running on ${apiBaseUrl}`);
      }
    if (req.method === 'PUT' || req.method === 'POST') {
      console.log('[Proxy] Request body:', JSON.stringify(req.body, null, 2));
    }
    
    // For PUT requests to RentalCompanies, use a more robust approach to handle 204
    if (req.method === 'PUT' && proxyPath.includes('/api/RentalCompanies/')) {
      try {
    // Use the token extracted at the top level
        const putHeaders = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }), // Use session token or header token
      ...(req.headers['x-company-id'] && { 'X-Company-Id': req.headers['x-company-id'] }),
      ...(req.headers.cookie && { Cookie: req.headers.cookie }) // Forward cookies
    };
    
    console.log(`[Proxy] PUT request headers:`, {
      hasAuth: !!putHeaders.Authorization,
      hasToken: !!token,
      url: proxyPath
    });
        
        const response = await apiClient({
          method: req.method,
          url: proxyPath,
          params: req.query,
          data: req.body,
          headers: putHeaders,
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
    // Check if this is a file upload (multipart/form-data)
    const isFileUpload = req.headers['content-type']?.includes('multipart/form-data') || req.files?.length > 0;
    
    // Use the token extracted at the top level
    // Build headers - don't set Content-Type for file uploads (let axios set it with boundary)
    const headers = {
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }), // Use session token or header token
      ...(req.headers['x-company-id'] && { 'X-Company-Id': req.headers['x-company-id'] }),
      ...(req.headers['x-forwarded-host'] && { 'X-Forwarded-Host': req.headers['x-forwarded-host'] }),
      ...(req.headers.cookie && { Cookie: req.headers.cookie }) // Forward cookies
    };
    
    // Only set Content-Type for non-file uploads
    if (!isFileUpload) {
      headers['Content-Type'] = 'application/json';
    }
    
    console.log(`[Proxy] Request headers for ${req.method} ${proxyPath}:`, {
      hasAuth: !!headers.Authorization,
      hasToken: !!token,
      isFileUpload,
      contentType: headers['Content-Type']
    });
    
    // Prepare request data
    let requestData = req.body;
    
    // For file uploads, create FormData from multer-processed files
    if (isFileUpload && req.files && req.files.length > 0) {
      const formData = new FormData();
      
      // Add files from multer
      // IMPORTANT: Preserve the original field name from the request (e.g., 'image', 'file', etc.)
      // The backend expects specific field names (e.g., 'image' for license uploads, 'file' for others)
      req.files.forEach(file => {
        // Use the original fieldname from multer, or default to 'file' if not available
        const fieldName = file.fieldname || 'file';
        formData.append(fieldName, file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
      
      // Add other form fields (including fieldMapping if present)
      // Multer with upload.any() should parse both files and fields into req.body
      if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
          // Skip file fields (already added above)
          if (key !== 'file') {
            const value = req.body[key];
            const stringValue = value != null ? String(value) : '';
            formData.append(key, stringValue);
          }
        });
      }
      
      // Also check req.body.fieldMapping directly (in case it wasn't in the keys loop)
      if (req.body?.fieldMapping !== undefined && req.body?.fieldMapping !== null) {
        formData.append('fieldMapping', String(req.body.fieldMapping));
      }
      
      requestData = formData;
      // Use formData's headers (includes boundary)
      Object.assign(headers, formData.getHeaders());
      console.log(`[Proxy] FormData headers:`, formData.getHeaders());
      console.log(`[Proxy] ✓ FormData prepared with ${req.files.length} file(s) and fields`);
    } else if (isFileUpload) {
      console.error(`[Proxy] File upload detected but no files found in req.files`);
    }
    
    // Check if this is an image/file request - handle binary responses differently
    const isImageRequest = proxyPath.includes('/Media/') && (
      proxyPath.includes('/licenses/file/') || 
      proxyPath.includes('/file/') ||
      proxyPath.endsWith('.png') || 
      proxyPath.endsWith('.jpg') || 
      proxyPath.endsWith('.jpeg') || 
      proxyPath.endsWith('.gif') || 
      proxyPath.endsWith('.webp')
    );
    
    // For license image file requests, check local folders first before forwarding to API
    if (isImageRequest && proxyPath.includes('/Media/customers/') && proxyPath.includes('/licenses/file/')) {
      const fs = require('fs');
      // Extract customerId and fileName from path like /api/Media/customers/{customerId}/licenses/file/{fileName}
      const match = proxyPath.match(/\/Media\/customers\/([^/]+)\/licenses\/file\/(.+)$/);
      if (match) {
        const [, customerId, fileName] = match;
        const relativePath = `customers/${customerId}/licenses/${fileName}`;
        
        // Check local client/server folders first
        const possibleLocalPaths = [
          path.join(__dirname, 'public', relativePath), // server/public/customers/...
          path.join(__dirname, '../client/public', relativePath), // client/public/customers/...
          path.join(__dirname, '../client/build', relativePath) // client/build/customers/... (production)
        ];
        
        // Try to find file locally first
        for (const localPath of possibleLocalPaths) {
          if (fs.existsSync(localPath)) {
            const stats = fs.statSync(localPath);
            if (stats.isFile()) {
              
              // Determine content type from file extension
              const ext = path.extname(localPath).toLowerCase();
              const contentType = ext === '.png' ? 'image/png' :
                                ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                                ext === '.gif' ? 'image/gif' :
                                ext === '.webp' ? 'image/webp' :
                                'application/octet-stream';
              
              // Set headers
              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Length', stats.size);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
              
              // For HEAD requests, just send headers
              if (req.method === 'HEAD') {
                return res.status(200).end();
              }
              
              // For GET requests, stream the file
              const fileStream = fs.createReadStream(localPath);
              fileStream.on('error', (err) => {
                console.error(`[Proxy] Error reading local license image file: ${err.message}`);
                if (!res.headersSent) {
                  res.status(500).json({ error: 'Error reading file' });
                }
              });
              
              fileStream.pipe(res);
              return; // Exit early - file served locally
            }
          }
        }
        console.log(`[Proxy] License image not found locally, forwarding to API: ${proxyPath}`);
      }
    }
    
    // For image requests, use arraybuffer response type to handle binary data
    const response = await apiClient({
      method: req.method,
      url: proxyPath,
      params: req.query,
      data: requestData,
      headers: headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true, // Don't throw on any status code
      responseType: isImageRequest ? 'arraybuffer' : 'text' // Use arraybuffer for images, text for others
    });
    
    console.log(`[Proxy] Response status: ${response.status}, content-type: ${response.headers['content-type']}, isImage: ${isImageRequest}`);
    
    // Handle 204 No Content responses - don't try to parse
    if (response.status === 204 || response.status === 304) {
      console.log('[Proxy] Returning 204 No Content');
      return res.status(response.status).end();
    }
    
    // For image requests, forward binary data directly with proper headers
    if (isImageRequest && response.status === 200) {
      console.log('[Proxy] Forwarding image response as binary');
      // Set content type from backend response
      if (response.headers['content-type']) {
        res.setHeader('Content-Type', response.headers['content-type']);
      }
      // Forward CORS headers if present
      if (response.headers['access-control-allow-origin']) {
        res.setHeader('Access-Control-Allow-Origin', response.headers['access-control-allow-origin']);
      }
      if (response.headers['access-control-allow-methods']) {
        res.setHeader('Access-Control-Allow-Methods', response.headers['access-control-allow-methods']);
      }
      // Send binary data
      return res.status(response.status).send(Buffer.from(response.data));
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
        console.log('[Proxy] Error URL was:', `${apiBaseUrl}${proxyPath}`);
        
        // For 401 errors, provide helpful message
        if (response.status === 401) {
          console.error(`[Proxy] 401 Unauthorized: ${req.method} ${proxyPath}`);
          console.error(`[Proxy] Authorization header present: ${!!headers.Authorization}`);
          console.error(`[Proxy] Token present: ${!!token}`);
          console.error(`[Proxy] Session token present: ${!!req.session?.token}`);
          console.error(`[Proxy] Header token present: ${!!req.headers.authorization}`);
          console.error(`[Proxy] Request headers sent:`, {
            Authorization: headers.Authorization ? 'Bearer ***' : 'missing',
            'X-Company-Id': headers['X-Company-Id'] || 'missing',
            Cookie: headers.Cookie ? 'present' : 'missing'
          });
          return res.status(401).json({
            message: `Authentication required: ${req.method} ${proxyPath}`,
            backendUrl: `${apiBaseUrl}${proxyPath}`,
            status: 401,
            statusText: response.statusText,
            error: jsonData?.message || 'You are not authenticated or your token has expired. Please log in again.',
            hasAuthHeader: !!headers.Authorization,
            hasToken: !!token,
            hasSession: !!req.session
          });
        }
        
        // For 404 errors, provide more helpful message
        if (response.status === 404) {
          console.error(`[Proxy] 404 Not Found: ${req.method} ${proxyPath}`);
          console.error(`[Proxy] Backend URL: ${apiBaseUrl}${proxyPath}`);
          return res.status(404).json({
            message: `Endpoint not found: ${req.method} ${proxyPath}`,
            backendUrl: `${apiBaseUrl}${proxyPath}`,
            status: 404,
            statusText: response.statusText,
            details: jsonData || 'The requested endpoint does not exist on the backend API'
          });
        }
        
        return res.status(response.status).json(jsonData || {
          message: 'Error from backend API',
          status: response.status,
          statusText: response.statusText
        });
      }
    
    // Success response with data
    res.status(response.status).json(jsonData);
      } catch (error) {
      console.error(`[Proxy Error] ${req.method} ${req.originalUrl}:`, error.message);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        code: error.code,
        message: error.message,
        backendUrl: `${apiBaseUrl}${req.originalUrl}`
      });
      
      // Handle timeout errors - return 504 Gateway Timeout
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        console.error(`[Proxy] Gateway timeout - API took longer than 30 seconds to respond: ${apiBaseUrl}${req.originalUrl}`);
        return res.status(504).json({
          message: 'Gateway Timeout - The backend API did not respond in time. Please try again in a moment.',
          error: 'GATEWAY_TIMEOUT',
          code: error.code,
          backendUrl: `${apiBaseUrl}${req.originalUrl}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Handle connection refused or unreachable API
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH') {
        console.error(`[Proxy] Cannot connect to API: ${apiBaseUrl}`);
        return res.status(503).json({
          message: 'Service Unavailable - Cannot connect to backend API. The API may be down or restarting.',
          error: 'SERVICE_UNAVAILABLE',
          code: error.code,
          backendUrl: `${apiBaseUrl}${req.originalUrl}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // If it's a 404 from the backend, provide more context
      if (error.response?.status === 404) {
        return res.status(404).json({
          message: `Backend endpoint not found: ${req.method} ${req.originalUrl}`,
          backendUrl: `${apiBaseUrl}${req.originalUrl}`,
          error: 'The endpoint does not exist on the backend API. Please verify the route exists in the backend controller.'
        });
      }
    
    // Handle connection/network errors
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'EPIPE' ||
      error.message?.includes('Connection: close') ||
      error.message?.includes('Parse Error')
    ) {
      console.warn('[Proxy] Connection/parse error encountered', {
        method: req.method,
        url: req.originalUrl,
        message: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseHeaders: error.response?.headers,
        requestStatus: error.request?.res?.statusCode ?? error.request?.statusCode,
      });

      const inferredStatus =
        error.response?.status ??
        error.request?.res?.statusCode ??
        error.request?.statusCode ??
        null;

      if (inferredStatus === 204 || inferredStatus === 200) {
        console.warn(
          '[Proxy] Suppressing parse/connection error for successful response',
          {
            method: req.method,
            url: req.originalUrl,
            inferredStatus,
            message: error.message,
          }
        );
        return res.status(inferredStatus).end();
      }

      if (inferredStatus === null && req.method === 'DELETE') {
        console.warn(
          '[Proxy] Treating DELETE parse/connection error as 204',
          {
            method: req.method,
            url: req.originalUrl,
            message: error.message,
            code: error.code,
          }
        );
        return res.status(204).end();
      }

      if (error.response?.status) {
        return res.status(error.response.status).json(
          error.response.data || { message: error.message }
        );
      }

      return res.status(500).json({
        message: 'Network error connecting to backend API',
        error: error.message,
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

// Serve model images - check both locations and return 404 if not found
const clientPublicPath = path.join(__dirname, '../client/public');
const serverPublicPath = path.join(__dirname, 'public');

// Log paths for debugging
console.log('[Server] __dirname:', __dirname);
console.log('[Server] serverPublicPath:', serverPublicPath);
console.log('[Server] clientPublicPath:', clientPublicPath);
console.log('[Server] process.cwd():', process.cwd());

// Models are served from Azure Blob Storage - no local file handling needed
// Model image URLs come from the API backend

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

// Proxy /customers/ requests to backend (for license images)
// First checks if file exists locally in client/server folder, then forwards to API if not found
// IMPORTANT: This must be BEFORE static file middleware to intercept /customers/ requests
app.use('/customers', async (req, res) => {
  const axios = require('axios');
  const fs = require('fs');
  
  // Check local client/server folders first
  const possibleLocalPaths = [
    path.join(__dirname, 'public', req.originalUrl.replace(/^\//, '')), // server/public/customers/...
    path.join(__dirname, '../client/public', req.originalUrl.replace(/^\//, '')), // client/public/customers/...
    path.join(__dirname, '../client/build', req.originalUrl.replace(/^\//, '')) // client/build/customers/... (production)
  ];
  
  // Try to find file locally first
  for (const localPath of possibleLocalPaths) {
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      if (stats.isFile()) {
        
        // Determine content type from file extension
        const ext = path.extname(localPath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' :
                          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                          ext === '.gif' ? 'image/gif' :
                          ext === '.webp' ? 'image/webp' :
                          'application/octet-stream';
        
        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        
        // For HEAD requests, just send headers
        if (req.method === 'HEAD') {
          return res.status(200).end();
        }
        
        // For GET requests, stream the file
        const fileStream = fs.createReadStream(localPath);
        fileStream.on('error', (err) => {
          console.error(`[Static Proxy] Error reading local file: ${err.message}`);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error reading file' });
          }
        });
        
        fileStream.pipe(res);
        return; // Exit early - file served locally
      }
    }
  }
  
  // File not found locally, forward to API server
  console.log(`[Static Proxy] File not found locally, forwarding to API: ${req.originalUrl}`);
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:7163';
  const backendUrl = `${apiBaseUrl}${req.originalUrl}`;
  
  try {
    console.log(`[Static Proxy] ${req.method} ${req.originalUrl} -> ${backendUrl}`);
    console.log(`[Static Proxy] Content-Type will be checked from backend response`);
    
    // For HEAD requests, use HEAD method; for GET, use GET
    const axiosConfig = {
      method: req.method,
      url: backendUrl,
      responseType: req.method === 'HEAD' ? undefined : 'stream', // HEAD doesn't need stream
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status code
    };
    
    // Only add httpsAgent if using HTTPS
    if (backendUrl.startsWith('https://')) {
      axiosConfig.httpsAgent = new (require('https')).Agent({ rejectUnauthorized: false });
    }
    
    const response = await axios(axiosConfig);
    
    console.log(`[Static Proxy] Backend response status: ${response.status} for ${req.method} ${req.originalUrl}`);
    console.log(`[Static Proxy] Backend URL was: ${backendUrl}`);
    
    // If backend returns 404, forward 404 to client
    if (response.status === 404) {
      console.log(`[Static Proxy] ❌ 404 - File not found on backend: ${backendUrl}`);
      return res.status(404).json({ error: 'File not found', path: req.originalUrl, backendUrl });
    }
    
    // If backend returns any error status, forward it
    if (response.status >= 400) {
      console.error(`[Static Proxy] ❌ Error ${response.status} from backend: ${backendUrl}`);
      return res.status(response.status).json({ error: 'Failed to fetch file', status: response.status });
    }
    
    // Only proceed if status is 200
    if (response.status !== 200) {
      console.warn(`[Static Proxy] ⚠️ Unexpected status ${response.status}, treating as error`);
      return res.status(404).json({ error: 'File not found', status: response.status });
    }
    
    // For HEAD requests, check content-length header
    // If content-length is 0 or missing, the file probably doesn't exist
    const contentLength = response.headers['content-length'];
    if (req.method === 'HEAD') {
      console.log(`[Static Proxy] HEAD request - Content-Length: ${contentLength || 'missing'}`);
      
      // If content-length is 0 or very small, it might be an empty response (file doesn't exist)
      if (!contentLength || parseInt(contentLength) === 0) {
        console.log(`[Static Proxy] ⚠️ HEAD returned 200 but content-length is 0 or missing - treating as 404`);
        return res.status(404).json({ error: 'File not found', path: req.originalUrl });
      }
      
      // Forward headers
      res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', contentLength);
      return res.status(200).end();
    }
    
    // Check if response is actually an image (not HTML error page)
    const contentType = response.headers['content-type'] || '';
    const isImage = contentType.startsWith('image/');
    
    console.log(`[Static Proxy] Content-Length: ${contentLength || 'missing'}`);
    console.log(`[Static Proxy] Content-Type: ${contentType}, isImage: ${isImage}`);
    console.log(`[Static Proxy] Response headers:`, JSON.stringify(response.headers, null, 2));
    
    // If backend returns HTML instead of image, treat as 404
    if (!isImage && contentType.includes('text/html')) {
      console.error(`[Static Proxy] ❌ Backend returned HTML instead of image - treating as 404`);
      console.error(`[Static Proxy] Backend URL was: ${backendUrl}`);
      console.error(`[Static Proxy] This usually means the backend static file middleware isn't working or file doesn't exist`);
      return res.status(404).json({ error: 'File not found', path: req.originalUrl, reason: 'Backend returned HTML instead of image', backendUrl });
    }
    
    // Forward content-type and other headers
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Add CORS headers for images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    // For GET requests, pipe the stream
    // Handle stream errors
    response.data.on('error', (streamError) => {
      console.error(`[Static Proxy] ❌ Stream error:`, streamError.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error', message: streamError.message });
      }
    });
    
    // Handle client disconnect
    req.on('close', () => {
      if (response.data && typeof response.data.destroy === 'function') {
        response.data.destroy();
      }
    });
    
    response.data.pipe(res);
  } catch (error) {
    console.error(`[Static Proxy] ❌ Error proxying ${req.originalUrl}:`, error.message);
    console.error(`[Static Proxy] Error details:`, {
      code: error.code,
      response: error.response?.status,
      message: error.message,
      backendUrl,
      stack: error.stack
    });
    
    // If it's a 404 from backend, return 404
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'File not found', path: req.originalUrl });
    }
    
    // Handle connection errors (backend not reachable)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      console.error(`[Static Proxy] ❌ Cannot connect to backend at ${apiBaseUrl}`);
      console.error(`[Static Proxy] Error code: ${error.code}, Message: ${error.message}`);
      console.error(`[Static Proxy] Attempted URL: ${backendUrl}`);
      console.error(`[Static Proxy] Make sure backend is running and accessible at ${apiBaseUrl}`);
      return res.status(503).json({ 
        error: 'Backend unavailable', 
        message: `Cannot connect to backend at ${apiBaseUrl}`,
        code: error.code,
        attemptedUrl: backendUrl
      });
    }
    
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to fetch static file from backend', message: error.message });
    }
  }
});

// Serve static files from the React app build directory
// Also serve from client/public in development
if (fs.existsSync(clientPublicPath)) {
  app.use(express.static(clientPublicPath, { fallthrough: true }));
}
app.use(express.static(serverPublicPath, { fallthrough: true }));

// Models are served directly from Azure Blob Storage - no local static serving needed

// Serve BlinkID resources - must come BEFORE the catch-all route
// Serve from node_modules/@microblink/blinkid/dist/resources
// Check both server/node_modules and root node_modules
const serverNodeModules = path.join(__dirname, 'node_modules/@microblink/blinkid/dist/resources');
const rootNodeModules = path.join(__dirname, '../node_modules/@microblink/blinkid/dist/resources');
const blinkidResourcesPath = fs.existsSync(serverNodeModules) ? serverNodeModules : 
                              fs.existsSync(rootNodeModules) ? rootNodeModules : null;

if (blinkidResourcesPath) {
  app.use('/resources', express.static(blinkidResourcesPath));
} else {
  console.warn(`⚠️  BlinkID resources directory not found. Checked:`);
  console.warn(`   - ${serverNodeModules}`);
  console.warn(`   - ${rootNodeModules}`);
  console.warn('   Make sure @microblink/blinkid is installed: npm install @microblink/blinkid');
}

// Helper function to detect social media crawlers
const isSocialCrawler = (userAgent) => {
  if (!userAgent) return false;
  const crawlers = [
    'facebookexternalhit',
    'Facebot',
    'Twitterbot',
    'LinkedInBot',
    'Pinterest',
    'Slackbot',
    'TelegramBot',
    'WhatsApp',
    'Discordbot'
  ];
  return crawlers.some(crawler => userAgent.toLowerCase().includes(crawler.toLowerCase()));
};

// Generate OG HTML for social crawlers
const generateCompanyOgHtml = (company, baseUrl, verificationCode = null) => {
  const title = company?.companyName || company?.CompanyName || 'Car Rental';
  const description = company?.motto || company?.Motto || company?.about || company?.About || `${title} - Vehicle Rental Services`;
  
  let imageUrl = '';
  const logoUrl = company?.logoUrl || company?.LogoUrl;
  if (logoUrl) {
    imageUrl = logoUrl.startsWith('http') ? logoUrl : `${baseUrl}${logoUrl}`;
  }
  
  const fbVerifyTag = verificationCode 
    ? `<meta name="facebook-domain-verification" content="${verificationCode}" />` 
    : '';
  
  const ogImageTags = imageUrl ? `
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">` : '';
  
  const twitterImageTag = imageUrl ? `
  <meta name="twitter:image" content="${imageUrl}">` : '';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${fbVerifyTag}
  <title>${title}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description.substring(0, 200).replace(/"/g, '&quot;')}">
  <meta property="og:url" content="${baseUrl}">${ogImageTags}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description.substring(0, 200).replace(/"/g, '&quot;')}">${twitterImageTag}
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
</body>
</html>`;
};

// The "catchall" handler: for any request that doesn't
// match API routes, send back React's index.html file.
// This MUST be the last route
app.get('*', async (req, res) => {
  // Don't catch API routes, static resources, or BlinkID resources
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/static/') ||
      req.path.startsWith('/resources/')) {
    return res.status(404).send('Not found');
  }
  
  const userAgent = req.headers['user-agent'] || '';
  
  // Handle social crawlers - serve OG HTML with meta tags
  if (isSocialCrawler(userAgent) && (req.path === '/' || req.path === '')) {
    console.log(`[OG Tags] Social crawler detected: ${userAgent.substring(0, 50)}`);
    
    try {
      const host = req.headers['x-forwarded-host'] || req.headers['host'] || '';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const baseUrl = `${protocol}://${host}`;
      const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
      
      // Fetch company info from API
      const companyResponse = await axios.get(`${apiBaseUrl}/api/companies/config`, {
        headers: {
          'x-forwarded-host': host,
          'x-original-host': host
        },
        timeout: 5000
      });
      
      if (companyResponse.status === 200 && companyResponse.data) {
        const company = companyResponse.data;
        console.log(`[OG Tags] Company found: ${company.companyName || company.CompanyName}`);
        
        // Fetch domain verification code
        let verificationCode = null;
        if (company.id || company.Id) {
          try {
            const companyId = company.id || company.Id;
            const verifyResponse = await axios.get(
              `${apiBaseUrl}/api/companies/${companyId}/meta/domain-verification`,
              { timeout: 3000 }
            );
            if (verifyResponse.status === 200 && verifyResponse.data?.code) {
              verificationCode = verifyResponse.data.code;
              console.log(`[OG Tags] Verification code found`);
            }
          } catch (e) {
            console.log(`[OG Tags] Could not fetch verification code: ${e.message}`);
          }
        }
        
        const html = generateCompanyOgHtml(company, baseUrl, verificationCode);
        return res.type('html').send(html);
      }
    } catch (error) {
      console.error(`[OG Tags] Error:`, error.message);
    }
  }
  
  // Default: serve React app
  res.sendFile(path.join(serverPublicPath, 'index.html'));
});

// Server start
const startServer = async () => {
  try {
    // Check required environment variables
    if (!process.env.API_BASE_URL) {
      console.warn('⚠️  WARNING: API_BASE_URL environment variable is not set!');
      console.warn('Using default Azure API URL for local development.');
      console.warn('To use a different API, set API_BASE_URL in .env file or environment variables.');
      // Don't exit - we have a default now
    }
    
    // HTTP server (production uses Azure HTTPS)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(60));
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://0.0.0.0:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   API Backend: ${process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net (default)'}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
      console.log('='.repeat(60));
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