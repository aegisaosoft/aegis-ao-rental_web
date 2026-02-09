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

const sharp = require('sharp');
const {
  isHeicFile,
  generateConvertedFilename,
  getOutputMimeType
} = require('../utils/heicTypes');

/**
 * Convert HEIC buffer to target format using Sharp
 */
async function convertHeicBuffer(buffer, options = {}) {
  const {
    format = 'jpeg',
    quality = 85,
    progressive = true,
    optimise = true
  } = options;

  const startTime = Date.now();

  try {
    console.log(`Starting HEIC conversion to ${format} with quality ${quality}`);

    let sharpInstance = sharp(buffer);

    // Apply format-specific options
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({
          quality: Math.max(10, Math.min(100, quality)),
          progressive,
          optimise
        });
        break;

      case 'png':
        sharpInstance = sharpInstance.png({
          quality: Math.max(10, Math.min(100, quality)),
          progressive,
          compressionLevel: 6
        });
        break;

      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality: Math.max(10, Math.min(100, quality)),
          effort: 4
        });
        break;

      default:
        throw new Error(`Unsupported output format: ${format}`);
    }

    const convertedBuffer = await sharpInstance.toBuffer();
    const conversionTime = Date.now() - startTime;

    console.log(`HEIC conversion completed successfully:`, {
      format,
      originalSize: buffer.length,
      convertedSize: convertedBuffer.length,
      compressionRatio: ((1 - convertedBuffer.length / buffer.length) * 100).toFixed(1) + '%',
      conversionTime: `${conversionTime}ms`
    });

    return {
      buffer: convertedBuffer,
      stats: {
        originalSize: buffer.length,
        convertedSize: convertedBuffer.length,
        conversionTime,
        format
      }
    };

  } catch (error) {
    const conversionTime = Date.now() - startTime;
    console.error('HEIC conversion failed:', {
      error: error.message,
      format,
      quality,
      originalSize: buffer.length,
      conversionTime: `${conversionTime}ms`
    });

    throw new Error(`HEIC conversion failed: ${error.message}`);
  }
}

/**
 * Convert HEIC file object (from multer) to target format
 */
async function convertHeicFile(file, options = {}) {
  if (!file || !file.buffer) {
    throw new Error('No file buffer provided for conversion');
  }

  if (!isHeicFile(file)) {
    throw new Error('File is not in HEIC/HEIF format');
  }

  try {
    const { buffer, stats } = await convertHeicBuffer(file.buffer, options);

    const format = options.format || 'jpeg';

    // Create new file object with converted data
    const convertedFile = {
      ...file,
      buffer,
      mimetype: getOutputMimeType(format),
      originalname: generateConvertedFilename(file.originalname, format),
      size: buffer.length
    };

    return {
      file: convertedFile,
      stats
    };

  } catch (error) {
    console.error('File conversion failed:', error);
    throw error;
  }
}

/**
 * Validate HEIC file before conversion
 */
function validateHeicFile(file, maxSize = 20 * 1024 * 1024) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!file.buffer || file.buffer.length === 0) {
    return { valid: false, error: 'File buffer is empty' };
  }

  if (file.size && file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  if (!isHeicFile(file)) {
    return { valid: false, error: 'File is not in HEIC/HEIF format' };
  }

  return { valid: true };
}

/**
 * Get Sharp library information
 */
function getSharpInfo() {
  try {
    return {
      version: sharp.versions.sharp,
      libvips: sharp.versions.vips,
      formats: sharp.format
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  convertHeicBuffer,
  convertHeicFile,
  validateHeicFile,
  getSharpInfo
};