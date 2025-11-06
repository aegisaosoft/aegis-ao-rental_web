#!/usr/bin/env node
/**
 * Build script that syncs license keys before building
 * 
 * This ensures license keys are available during the build process
 * for React apps that embed environment variables at build time.
 * 
 * Usage:
 *   node scripts/build-with-licenses.js
 *   or
 *   npm run build (which should call this)
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔨 Building with license keys...\n');

// First, sync the license keys
try {
  console.log('1️⃣  Syncing license keys...');
  execSync('node scripts/sync-blinkid-licenses.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ License keys synced\n');
} catch (error) {
  console.error('❌ Failed to sync license keys');
  console.error('   Build will continue, but keys may not be available');
  console.error('   Run: npm run sync-licenses\n');
}

// Then build the React app
try {
  console.log('2️⃣  Building React app...');
  execSync('cd client && npm run build', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('\n✅ Build complete!');
} catch (error) {
  console.error('\n❌ Build failed');
  process.exit(1);
}

