# Setup HTTPS for Mobile Phone Debugging

## Step 1: Install mkcert (Run PowerShell as Administrator)

1. Right-click on PowerShell and select "Run as Administrator"
2. Navigate to the client directory:
   ```powershell
   cd C:\aegis-ao\rental\aegis-ao-rental_web\client
   ```
3. Install mkcert:
   ```powershell
   choco install mkcert -y
   ```
4. Install the local Certificate Authority:
   ```powershell
   mkcert -install
   ```

## Step 2: Generate SSL Certificates

Still in the Administrator PowerShell, in the `client` directory:

```powershell
mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.1.147 127.0.0.1 ::1
```

This creates two files: `key.pem` and `cert.pem` in your client folder.

## Step 3: Create .env.local file

Create a file named `.env.local` in the `client` folder with this content:

```
HTTPS=true
SSL_CRT_FILE=cert.pem
SSL_KEY_FILE=key.pem
```

## Step 4: Install CA on your phone (Important!)

To avoid certificate warnings on your phone:

### For Android:
1. On your computer, find the CA certificate:
   ```powershell
   mkcert -CAROOT
   ```
   This shows the folder containing `rootCA.pem`
2. Copy `rootCA.pem` to your phone (via email, USB, cloud storage)
3. On your Android phone:
   - Go to Settings → Security → Encryption & credentials
   - Tap "Install a certificate" → "CA certificate"
   - Select the `rootCA.pem` file
   - Name it "mkcert local CA"

### For iOS:
1. Copy `rootCA.pem` to your iPhone (via AirDrop, email, or cloud)
2. Install the profile (iOS will prompt you)
3. Go to Settings → General → About → Certificate Trust Settings
4. Enable full trust for "mkcert"

## Step 5: Restart dev server

Stop your current dev server (Ctrl+C) and restart:

```bash
npm start
```

Or use:
```bash
npm run start:https
```

## Step 6: Access from your phone

On your phone's browser, navigate to:
```
https://192.168.1.147:3000
```

The camera should now work! ✅

---

## Troubleshooting

**If you see "ERR_CERT_AUTHORITY_INVALID" on your phone:**
- Make sure you installed the CA certificate on your phone (Step 4)
- Make sure you enabled trust for the certificate

**If the certificate is not trusted:**
- Double-check that you ran `mkcert -install` as Administrator
- Make sure both `cert.pem` and `key.pem` files exist in the client folder

