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
const mockRoutes = require('./routes/mock');
const terminalRoutes = require('./routes/terminal');
const webhooksRoutes = require('./routes/webhooks');

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
      imgSrc: ["'self'", "data:", "https:"],
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
  resave: true, // Force save session even if not modified (helps with cookie setting)
  saveUninitialized: true, // Save uninitialized sessions (needed for login flow)
  name: 'connect.sid', // Explicit session cookie name
  cookie: {
    secure: false, // Always false for local development (HTTP)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Use 'lax' for local development to ensure cookies work
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

// Mock routes for development (fallback when external API fails)
app.use('/api/mock', mockRoutes);

// Middleware to detect company from domain and add X-Company-Id header
// This helps the backend middleware identify the company
app.use('/api/*', async (req, res, next) => {
  // Skip company detection for session-token endpoint (it's fast and doesn't need it)
  if (req.originalUrl === '/api/auth/session-token' || req.path === '/auth/session-token') {
    console.log('[Company Detection] Skipping for /session-token endpoint');
    return next();
  }
  
  try {
    // Extract hostname from request - check forwarded headers first (for Azure/proxies)
    const hostname = req.get('x-forwarded-host') || req.get('host') || req.hostname || '';
    const hostnameLower = hostname.toLowerCase().split(':')[0]; // Remove port if present
    
    // Skip for localhost
    if (hostnameLower.includes('localhost') || hostnameLower.includes('127.0.0.1')) {
      return next();
    }
    
    // Extract subdomain from hostname (e.g., company1.aegis-rental.com -> company1)
    const parts = hostnameLower.split('.');
    if (parts.length > 2) {
      const subdomain = parts[0];
      
      // Skip 'www' subdomain
      if (subdomain === 'www') {
        return next();
      }
      
      // Try to get domain mapping from API (cached by backend)
      // This is a lightweight call that the backend caches
      const fullDomain = `${subdomain}.aegis-rental.com`;
      // Use Azure API by default for local testing (or set API_BASE_URL in .env)
      const apiBaseUrl = process.env.API_BASE_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net';
      
      console.log(`[Company Detection] Hostname: ${hostnameLower}, Subdomain: ${subdomain}, FullDomain: ${fullDomain}`);
      console.log(`[Company Detection] API Base URL: ${apiBaseUrl}`);
      
      try {
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
          
          // Fallback: Try to get company directly by subdomain from backend
          try {
            console.log(`[Company Detection] Fallback: Trying to get company by subdomain: ${subdomain}`);
            // We'll add the subdomain as a query parameter so backend can resolve it
            // The backend middleware should handle hostname resolution, but this is a fallback
            req.query.companySubdomain = subdomain;
          } catch (fallbackErr) {
            console.error(`[Company Detection] Fallback also failed:`, fallbackErr.message);
          }
          // Don't set header - let backend try to resolve from hostname
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
  
      // Skip if this is already handled by a specific route
    // Note: /api/RentalCompanies should go through catch-all, not /api/companies
    const skipPaths = ['/api/auth', '/api/vehicles', '/api/booking', '/api/customers', '/api/payments', '/api/admin', '/api/companies', '/api/CompanyLocations', '/api/Models', '/api/scan', '/api/license', '/api/mock'];
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
    
    console.log(`[Proxy] Request: ${req.method} ${proxyPath}, isFileUpload: ${isFileUpload}, files: ${req.files?.length || 0}`);
    
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
      console.log(`[Proxy] Processing file upload with ${req.files.length} file(s)`);
      req.files.forEach((file, index) => {
        console.log(`[Proxy] File ${index + 1}: fieldname=${file.fieldname}, originalname=${file.originalname}, mimetype=${file.mimetype}, size=${file.size}`);
      });
      
      const formData = new FormData();
      
      // Add files from multer
      req.files.forEach(file => {
        formData.append(file.fieldname || 'file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
      
      // Add other form fields
      if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
          formData.append(key, req.body[key]);
        });
      }
      
      requestData = formData;
      // Use formData's headers (includes boundary)
      Object.assign(headers, formData.getHeaders());
      console.log(`[Proxy] FormData headers:`, formData.getHeaders());
    } else if (isFileUpload) {
      console.error(`[Proxy] File upload detected but no files found in req.files`);
    }
    
    const response = await apiClient({
      method: req.method,
      url: proxyPath,
      params: req.query,
      data: requestData,
      headers: headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
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

// Log paths for debugging
console.log('[Server] __dirname:', __dirname);
console.log('[Server] serverPublicPath:', serverPublicPath);
console.log('[Server] clientPublicPath:', clientPublicPath);
console.log('[Server] process.cwd():', process.cwd());

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

// Serve model images as static files from /models/ directory
// This ensures /models/MAKE_MODEL.png works directly
const modelsStaticPath = path.join(serverPublicPath, 'models');
if (fs.existsSync(modelsStaticPath)) {
  app.use('/models', express.static(modelsStaticPath));
  console.log(`✅ Model images served as static files from: ${modelsStaticPath}`);
} else {
  console.log(`⚠️ Models directory not found at: ${modelsStaticPath}`);
}


// Serve BlinkID resources - must come BEFORE the catch-all route
// Serve from node_modules/@microblink/blinkid/dist/resources
// Check both server/node_modules and root node_modules
const serverNodeModules = path.join(__dirname, 'node_modules/@microblink/blinkid/dist/resources');
const rootNodeModules = path.join(__dirname, '../node_modules/@microblink/blinkid/dist/resources');
const blinkidResourcesPath = fs.existsSync(serverNodeModules) ? serverNodeModules : 
                              fs.existsSync(rootNodeModules) ? rootNodeModules : null;

if (blinkidResourcesPath) {
  app.use('/resources', express.static(blinkidResourcesPath));
  console.log(`✅ BlinkID resources served from: ${blinkidResourcesPath}`);
} else {
  console.warn(`⚠️  BlinkID resources directory not found. Checked:`);
  console.warn(`   - ${serverNodeModules}`);
  console.warn(`   - ${rootNodeModules}`);
  console.warn('   Make sure @microblink/blinkid is installed: npm install @microblink/blinkid');
}

// The "catchall" handler: for any request that doesn't
// match API routes, send back React's index.html file.
// This MUST be the last route
app.get('*', (req, res) => {
  // Don't catch API routes, model image requests, static resources, or BlinkID resources
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/models/') || 
      req.path.startsWith('/static/') ||
      req.path.startsWith('/resources/')) {
    return res.status(404).send('Not found');
  }
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
      console.log(`✅ Node.js Proxy Server is running!`);
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