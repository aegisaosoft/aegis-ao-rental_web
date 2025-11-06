#!/usr/bin/env node
/**
 * Sync BlinkID License Keys from individual key files to .env files
 * 
 * This script reads license keys from C:\aegis-ao\rental\MicroBlink\*.key files
 * and updates the .env files in the client directory.
 * 
 * Expected key files:
 *   - ios.key
 *   - android.key
 *   - in-browser.key
 * 
 * Usage:
 *   node scripts/sync-blinkid-licenses.js
 */

const fs = require('fs');
const path = require('path');

// Path to the MicroBlink directory (relative to project root)
// This ensures keys are part of the project and get deployed
const MICROBLINK_DIR = path.join(__dirname, '../MicroBlink');
const CLIENT_DIR = path.join(__dirname, '../client');

// Key file paths
const KEY_FILES = {
  ios: path.join(MICROBLINK_DIR, 'ios.key'),
  android: path.join(MICROBLINK_DIR, 'android.key'),
  inBrowser: path.join(MICROBLINK_DIR, 'in-browser.key')
};

// Environment files to update
const ENV_FILES = [
  path.join(CLIENT_DIR, '.env'),
  path.join(CLIENT_DIR, '.env.development'),
  path.join(CLIENT_DIR, '.env.production')
];

function readKeyFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content || null;
  } catch (error) {
    console.error(`Error reading key file ${filePath}: ${error.message}`);
    return null;
  }
}

function loadLicenseKeys() {
  const licenses = {
    ios: readKeyFile(KEY_FILES.ios),
    android: readKeyFile(KEY_FILES.android),
    inBrowser: readKeyFile(KEY_FILES.inBrowser)
  };
  
  return licenses;
}

function updateEnvFile(filePath, licenses) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update or add license keys
    const replacements = {
      'REACT_APP_BLINKID_LICENSE_KEY=': `REACT_APP_BLINKID_LICENSE_KEY=${licenses.inBrowser}`,
      'REACT_APP_BLINKID_LICENSE_KEY_IOS=': `REACT_APP_BLINKID_LICENSE_KEY_IOS=${licenses.ios}`,
      'REACT_APP_BLINKID_LICENSE_KEY_ANDROID=': `REACT_APP_BLINKID_LICENSE_KEY_ANDROID=${licenses.android}`
    };
    
    let updated = false;
    
    for (const [key, value] of Object.entries(replacements)) {
      // Check if the key exists
      const keyPattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'm');
      
      if (keyPattern.test(content)) {
        // Replace existing value
        content = content.replace(keyPattern, value);
        updated = true;
      } else {
        // Add new key (find the External Services section)
        const externalServicesIndex = content.indexOf('# External Services');
        if (externalServicesIndex !== -1) {
          const insertIndex = content.indexOf('\n', externalServicesIndex) + 1;
          content = content.slice(0, insertIndex) + `${value}\n` + content.slice(insertIndex);
          updated = true;
        }
      }
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${path.basename(filePath)}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${path.basename(filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🔄 Syncing BlinkID License Keys from key files...\n');
  
  // Check if MicroBlink directory exists
  if (!fs.existsSync(MICROBLINK_DIR)) {
    console.error(`❌ MicroBlink directory not found: ${MICROBLINK_DIR}`);
    console.error('   Please ensure the directory exists and try again.');
    process.exit(1);
  }
  
  // Load license keys from individual files
  const licenses = loadLicenseKeys();
  
  // Check which keys are missing
  const missing = [];
  if (!licenses.ios) missing.push('ios.key');
  if (!licenses.android) missing.push('android.key');
  if (!licenses.inBrowser) missing.push('in-browser.key');
  
  if (missing.length > 0) {
    console.error(`❌ Missing license key files: ${missing.join(', ')}`);
    console.error(`   Expected location: ${MICROBLINK_DIR}`);
    console.error('   Please ensure all key files exist and try again.');
    process.exit(1);
  }
  
  console.log('✅ Found all license key files:');
  console.log(`   - In Browser (in-browser.key): ${licenses.inBrowser.substring(0, 50)}...`);
  console.log(`   - iOS (ios.key): ${licenses.ios.substring(0, 50)}...`);
  console.log(`   - Android (android.key): ${licenses.android.substring(0, 50)}...\n`);
  
  // Update all .env files
  let updatedCount = 0;
  for (const envFile of ENV_FILES) {
    if (updateEnvFile(envFile, licenses)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Sync complete! Updated ${updatedCount} file(s).`);
  console.log('   Restart your React dev server to pick up the new keys.');
}

main();

