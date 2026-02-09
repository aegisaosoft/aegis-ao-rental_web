/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov
 *
 */

/**
 * HEIC MIME types that should be converted
 */
const HEIC_MIME_TYPES = [
  'image/heic',
  'image/heif',
  'image/x-heic',
  'image/x-heif'
];

/**
 * HEIC file extensions
 */
const HEIC_EXTENSIONS = ['.heic', '.heif'];

/**
 * Default configuration for HEIC middleware
 */
const DEFAULT_CONFIG = {
  quality: 85,
  maxSize: 20 * 1024 * 1024, // 20MB
  allowedMimeTypes: HEIC_MIME_TYPES,
  skipClientConverted: true,
  outputFormat: 'jpeg',
  onError: null,
  onSuccess: null,
  enableStats: false
};

/**
 * Check if file is HEIC based on MIME type or extension
 */
function isHeicFile(file) {
  if (!file) return false;

  // Check MIME type first
  if (file.mimetype && HEIC_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    return true;
  }

  // Check file extension as fallback
  if (file.originalname) {
    const fileName = file.originalname.toLowerCase();
    return HEIC_EXTENSIONS.some(ext => fileName.endsWith(ext));
  }

  return false;
}

/**
 * Get output file extension based on format
 */
function getOutputExtension(format = 'jpeg') {
  switch (format.toLowerCase()) {
    case 'png':
      return '.png';
    case 'webp':
      return '.webp';
    case 'jpeg':
    case 'jpg':
    default:
      return '.jpg';
  }
}

/**
 * Get output MIME type based on format
 */
function getOutputMimeType(format = 'jpeg') {
  switch (format.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg';
  }
}

/**
 * Generate converted filename
 */
function generateConvertedFilename(originalname, format = 'jpeg') {
  if (!originalname) return `converted${getOutputExtension(format)}`;

  const extension = getOutputExtension(format);
  return originalname.replace(/\.(heic|heif)$/i, extension);
}

/**
 * Conversion statistics object
 */
class ConversionStats {
  constructor() {
    this.conversions = 0;
    this.totalSize = 0;
    this.totalTime = 0;
    this.errors = 0;
    this.startTime = Date.now();
  }

  addConversion(originalSize, convertedSize, timeMs, success = true) {
    this.conversions++;
    this.totalSize += originalSize;
    this.totalTime += timeMs;

    if (!success) {
      this.errors++;
    }
  }

  getStats() {
    const uptime = Date.now() - this.startTime;
    return {
      conversions: this.conversions,
      errors: this.errors,
      averageSize: this.conversions > 0 ? Math.round(this.totalSize / this.conversions) : 0,
      averageTime: this.conversions > 0 ? Math.round(this.totalTime / this.conversions) : 0,
      successRate: this.conversions > 0 ? ((this.conversions - this.errors) / this.conversions * 100).toFixed(1) : 100,
      uptimeMs: uptime
    };
  }
}

module.exports = {
  HEIC_MIME_TYPES,
  HEIC_EXTENSIONS,
  DEFAULT_CONFIG,
  isHeicFile,
  getOutputExtension,
  getOutputMimeType,
  generateConvertedFilename,
  ConversionStats
};