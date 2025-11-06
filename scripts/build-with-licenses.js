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
const fs = require('fs-extra');

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
  console.log('✅ React build complete\n');
} catch (error) {
  console.error('\n❌ Build failed');
  process.exit(1);
}

// Finally, copy BlinkID resources to build output
try {
  console.log('3️⃣  Copying BlinkID resources...');
  const sourceDir = path.join(__dirname, '..', 'client', 'node_modules', '@microblink', 'blinkid', 'resources');
  const destDir = path.join(__dirname, '..', 'client', 'build', 'resources');
  
  // Check if source exists
  if (!fs.existsSync(sourceDir)) {
    console.warn('⚠️  BlinkID resources not found at:', sourceDir);
    console.warn('   Skipping BlinkID resources copy');
    console.warn('   Install BlinkID: cd client && npm install @microblink/blinkid\n');
  } else {
    // Ensure destination directory exists
    fs.ensureDirSync(destDir);
    
    // Copy resources
    fs.copySync(sourceDir, destDir, { overwrite: true });
    
    console.log('✅ BlinkID resources copied to build/resources');
    
    // List copied files for verification
    const files = fs.readdirSync(destDir);
    console.log(`   Copied ${files.length} resource files/folders\n`);
  }
} catch (error) {
  console.error('❌ Failed to copy BlinkID resources:', error.message);
  console.error('   Build succeeded but BlinkID may not work in production\n');
  // Don't exit - BlinkID is optional, main build succeeded
}

console.log('✨ Build complete!');
