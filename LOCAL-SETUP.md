# Local Development Setup Guide

## Quick Start

### Option 1: Use Azure API (Recommended for Quick Testing)

1. **Start the Node.js proxy server:**
   ```bash
   cd aegis-ao-rental_web/server
   npm start
   ```
   The server will start on `http://localhost:5000` and automatically use the Azure API.

2. **Start the React client:**
   ```bash
   cd aegis-ao-rental_web/client
   npm start
   ```
   The client will start on `http://localhost:3000` and proxy API requests to the Node.js server.

### Option 2: Use Local .NET API

1. **Start the .NET API locally:**
   ```bash
   cd aegis-ao-rental/CarRental.Api
   dotnet run
   ```
   The API will start on `https://localhost:7163` (or `http://localhost:5094`)

2. **Create `.env` file in `server` directory:**
   ```env
   NODE_ENV=development
   PORT=5000
   API_BASE_URL=https://localhost:7163
   ```

3. **Start the Node.js proxy server:**
   ```bash
   cd aegis-ao-rental_web/server
   npm start
   ```

4. **Start the React client:**
   ```bash
   cd aegis-ao-rental_web/client
   npm start
   ```

## Architecture

```
React App (localhost:3000)
    ↓
setupProxy.js (proxies /api/*)
    ↓
Node.js Server (localhost:5000)
    ↓
Azure API or Local .NET API
```

## Troubleshooting

### 504 Gateway Timeout

**Problem:** Requests are timing out.

**Solutions:**
1. Make sure the Node.js server is running on port 5000
2. Check that `API_BASE_URL` is set correctly in `server/.env`
3. If using Azure API, verify the API is accessible
4. Check the Node.js server console for error messages

### 503 Service Unavailable

**Problem:** Node.js proxy can't reach the backend API.

**Solutions:**
1. Verify the backend API is running (if using local API)
2. Check network connectivity to Azure API
3. Verify `API_BASE_URL` environment variable is correct

### Port Already in Use

**Problem:** Port 5000 is already in use.

**Solutions:**
1. Find and stop the process using port 5000:
   ```powershell
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```
2. Or change the port in `server/.env`:
   ```env
   PORT=5001
   ```
   Then update `client/src/setupProxy.js` to use port 5001.

## Environment Variables

### Server (.env in `server/` directory)

```env
NODE_ENV=development
PORT=5000
API_BASE_URL=https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net
```

### Client (optional, .env in `client/` directory)

React uses `/api` which proxies to the Node.js server, so no client-side API URL configuration is needed.

## Testing the Setup

1. **Check Node.js server is running:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Check React proxy is working:**
   Open browser console and look for proxy logs when making API requests.

3. **Check API connection:**
   Look for `[API Config] API_BASE_URL:` in the Node.js server console.

