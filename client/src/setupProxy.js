const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API requests, not static assets
  // Proxy to Node.js server on port 5000 (which then proxies to Azure API)
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    ws: false, // Disable WebSocket proxying - HMR uses different WebSocket endpoint
    timeout: 60000, // 60 second timeout to handle slow API responses
    proxyTimeout: 60000,
    cookieDomainRewrite: '', // Preserve cookie domain
    cookiePathRewrite: '/', // Preserve cookie path
    onProxyReq: (proxyReq, req, res) => {
      // Forward cookies from the original request
      if (req.headers.cookie) {
        proxyReq.setHeader('Cookie', req.headers.cookie);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Forward Set-Cookie headers from the server response
      // This ensures session cookies are properly set in the browser
      if (proxyRes.headers['set-cookie']) {
        proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie => {
          // Ensure cookies work with the proxy setup
          return cookie
            .replace(/; Secure/gi, '') // Remove Secure flag for HTTP in development
            .replace(/; SameSite=None/gi, '; SameSite=Lax'); // Use Lax for local development
        });
      }
    },
    onError: (err, req, res) => {
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Proxy Error',
          message: 'Node.js proxy server may not be running. Make sure the server is running on port 5000.',
          details: err.message
        });
      }
    }
  }));
};

