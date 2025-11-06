# Scripts Directory

## sync-blinkid-licenses.js

### Purpose
This script automatically syncs BlinkID license keys from individual key files in `C:\aegis-ao\rental\MicroBlink\` to all `.env` files in the client directory.

### Usage

```bash
# From the root directory
npm run sync-licenses

# Or directly
node scripts/sync-blinkid-licenses.js
```

### What it does

1. Reads license keys from individual key files in `C:\aegis-ao\rental\MicroBlink\`:
   - `ios.key` - iOS license key
   - `android.key` - Android license key
   - `in-browser.key` - In Browser license key
2. Updates all `.env` files in `client/` directory:
   - `.env`
   - `.env.development`
   - `.env.production`

### Key File Format

Each key file should contain only the license key (no extra text or formatting):

**ios.key:**
```
<ios_license_key>
```

**android.key:**
```
<android_license_key>
```

**in-browser.key:**
```
<in_browser_license_key>
```

### Benefits

- **Single source of truth**: License keys are stored in individual key files (`MicroBlink/*.key`)
- **Clean separation**: Each platform has its own key file (iOS, Android, In Browser)
- **Automatic sync**: No need to manually update multiple `.env` files
- **Consistency**: Ensures all environment files have the same keys
- **Easy updates**: Just update the key files and run `npm run sync-licenses`

### When to run

- After updating license keys in `MicroBlink/*.key` files
- When setting up a new development environment
- Before deploying to ensure production keys are up to date

### Key File Location

**Important**: Keys are stored in the project directory for deployment.

Location: `aegis-ao-rental_web/MicroBlink/`

Required files:
- `ios.key`
- `android.key`
- `in-browser.key`

These files are part of the project repository and will be deployed with the application. This ensures license keys are available during build and deployment.

### Notes

- The script will not overwrite keys if they're already correct
- If a `.env` file doesn't exist, it will be skipped with a warning
- Always restart your React dev server after syncing to pick up new keys

