# Setup HTTPS for Development

## Problem
The BlinkID camera requires HTTPS to access the camera on non-localhost addresses (like `192.168.1.147:3000`).

## Solution Options

### Option 1: Quick Fix - Use localhost (Simplest)
Instead of accessing `http://192.168.1.147:3000`, use `http://localhost:3000`.
This works because browsers allow camera access on localhost without HTTPS.

**Limitation**: This won't work for mobile device testing.

---

### Option 2: Enable HTTPS (Recommended for mobile testing)

#### Step 1: Create self-signed certificate

Open PowerShell in the `aegis-ao-rental_web/client` directory and run:

```powershell
# Install mkcert (if not already installed)
# Option A: Using Chocolatey
choco install mkcert

# Option B: Using Scoop
scoop bucket add extras
scoop install mkcert

# Option C: Manual download from https://github.com/FiloSottile/mkcert/releases

# Install local CA
mkcert -install

# Generate certificate
mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.1.147 127.0.0.1 ::1
```

#### Step 2: Create or update `.env.local` file

Create a file named `.env.local` in `aegis-ao-rental_web/client/` with:

```
HTTPS=true
SSL_CRT_FILE=cert.pem
SSL_KEY_FILE=key.pem
```

#### Step 3: Restart the dev server

Stop the current dev server (Ctrl+C) and restart it:

```bash
npm start
```

The server will now run on `https://localhost:3000` and `https://192.168.1.147:3000`.

#### Step 4: Trust the certificate on mobile devices

For mobile testing:
1. Copy the CA certificate from your computer to your mobile device
2. Install it in your mobile device's trusted certificates

---

### Option 3: Use ngrok (Alternative for mobile testing)

```bash
# Install ngrok
choco install ngrok

# Or download from https://ngrok.com/download

# Run ngrok (after starting your dev server on port 3000)
ngrok http 3000
```

Ngrok will provide an HTTPS URL (e.g., `https://abc123.ngrok.io`) that you can access from any device.

---

## Recommended Approach

1. **For local development**: Use `http://localhost:3000`
2. **For mobile testing**: Use Option 2 (mkcert) or Option 3 (ngrok)

