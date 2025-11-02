const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API requests, not static assets
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    ws: false, // Disable WebSocket proxying - HMR uses different WebSocket endpoint
    timeout: 5000, // 5 second timeout to prevent hanging requests
    proxyTimeout: 5000
  }));
};

