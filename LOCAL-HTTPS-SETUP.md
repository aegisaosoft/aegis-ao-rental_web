# Local HTTPS Development Setup

## Requirements
Both client and server will run on HTTPS for secure local development.

## Setup Steps

### 1. Generate SSL Certificates
```powershell
# Run the certificate generation script
.\generate-cert.ps1

# Trust the certificate (Windows only)
$certPath = "certs\server.crt"
Import-Certificate -FilePath $certPath -CertStoreLocation "Cert:\CurrentUser\Root"
```

### 2. Set Environment Variables

Create a `.env` file in the `server` directory:

```env
USE_HTTPS=true
PORT=5000
NODE_ENV=development
```

### 3. Start the Server

```powershell
cd server
npm start
```

The server will run on: **https://localhost:5000**

You may see a browser warning about the self-signed certificate - this is normal for local development.

### 4. Start the Client

In a new terminal:

```powershell
cd client
npm start
```

The client will run on: **https://localhost:3000**

### 5. Accept the Certificate

When you first access the client:
1. Chrome will show "Your connection is not private"
2. Click "Advanced"
3. Click "Proceed to localhost (unsafe)"
4. You only need to do this once

### 6. Configure Your Backend API

If you're connecting to a backend API, make sure to configure the URL in your environment:

```env
# In client/.env
REACT_APP_API_URL=https://your-api-url/api
```

## Troubleshooting

### Certificate Errors
If you get certificate errors:
1. Open `certs\server.crt`
2. Install it in "Trusted Root Certification Authorities"
3. Restart your browser

### React Scripts SSL Error
If React dev server fails to start with HTTPS:
```powershell
# Install certificate trust for localhost
$cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object {$_.Subject -like "*localhost*"}
Export-Certificate -Cert $cert -FilePath server.crt
```

### Browser won't connect
- Check that both client and server are using HTTPS
- Clear browser cache
- Try a different browser

## Running Both Services

Use the npm scripts in the root directory:

```powershell
# Start both client and server
npm run dev
```

Or manually in separate terminals:
```powershell
# Terminal 1
cd server && npm start

# Terminal 2  
cd client && npm start
```

## Production Deployment

When deploying to Azure:
- Remove `USE_HTTPS=true` from environment variables
- Azure will handle HTTPS automatically
- The workflow is configured for production deployment

