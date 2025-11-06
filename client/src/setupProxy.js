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
    onError: (err, req, res) => {
      console.error('[Proxy Error]', err.message);
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Proxy Error',
          message: 'Node.js proxy server may not be running. Make sure the server is running on port 5000.',
          details: err.message
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:5000${req.url}`);
    }
  }));
};

