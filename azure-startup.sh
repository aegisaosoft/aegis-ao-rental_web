#!/bin/bash
# Azure Linux App Service Startup Script
# This ensures the app runs as a standalone Node.js server, not Docker

# Navigate to the app directory (Azure sets HOME to /home)
cd "$HOME" || cd /home/site/wwwroot || exit 1

# Install production dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --production
fi

# Start the Node.js server
echo "Starting Node.js server..."
node server/index.js

