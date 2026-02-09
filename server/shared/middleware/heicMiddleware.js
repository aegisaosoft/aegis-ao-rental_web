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

const { convertHeicFile, validateHeicFile } = require('../services/heicConverter');
const { DEFAULT_CONFIG, ConversionStats, isHeicFile } = require('../utils/heicTypes');

// Global stats object (shared across all middleware instances)
const globalStats = new ConversionStats();

/**
 * Express middleware for automatic HEIC/HEIF to JPEG/PNG conversion
 */
function heicMiddleware(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  return async (req, res, next) => {
    const startTime = Date.now();

    try {
      // Skip if no file uploaded
      if (!req.file && !req.files) {
        return next();
      }

      // Handle single file (req.file)
      if (req.file) {
        const processed = await processFile(req.file, config, startTime);
        if (processed.converted) {
          req.file = processed.file;
        }
        return next();
      }

      // Handle multiple files (req.files)
      if (req.files) {
        // Handle array of files
        if (Array.isArray(req.files)) {
          for (let i = 0; i < req.files.length; i++) {
            const processed = await processFile(req.files[i], config, startTime);
            if (processed.converted) {
              req.files[i] = processed.file;
            }
          }
          return next();
        }

        // Handle object with field names
        for (const fieldName in req.files) {
          const files = req.files[fieldName];
          if (Array.isArray(files)) {
            for (let i = 0; i < files.length; i++) {
              const processed = await processFile(files[i], config, startTime);
              if (processed.converted) {
                files[i] = processed.file;
              }
            }
          } else if (files) {
            const processed = await processFile(files, config, startTime);
            if (processed.converted) {
              req.files[fieldName] = processed.file;
            }
          }
        }
        return next();
      }

      return next();

    } catch (error) {
      console.error('HEIC middleware error:', error);

      if (config.enableStats) {
        globalStats.addConversion(
          req.file?.size || 0,
          0,
          Date.now() - startTime,
          false
        );
      }

      // Call custom error handler if provided
      if (config.onError) {
        try {
          config.onError(error, req, res);
        } catch (handlerError) {
          console.error('Custom error handler failed:', handlerError);
        }
      }

      return res.status(422).json({
        success: false,
        message: 'Failed to process HEIC image. Please try uploading a JPEG or PNG image.',
        error: 'HEIC_PROCESSING_FAILED',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}

/**
 * Process individual file for HEIC conversion
 */
async function processFile(file, config, startTime) {
  try {
    // Skip if file doesn't exist or is empty
    if (!file || !file.buffer || file.buffer.length === 0) {
      return { converted: false, file };
    }

    // Skip if not a HEIC file
    if (!isHeicFile(file)) {
      console.log(`Skipping non-HEIC file: ${file.originalname || 'unknown'} (${file.mimetype || 'unknown type'})`);
      return { converted: false, file };
    }

    // Skip if file was already converted by client (optional optimization)
    if (config.skipClientConverted && file.mimetype === 'image/jpeg' && file.originalname?.includes('converted')) {
      console.log(`Skipping client-converted file: ${file.originalname}`);
      return { converted: false, file };
    }

    console.log(`Processing HEIC file: ${file.originalname || 'unknown'} (${file.size || file.buffer.length} bytes)`);

    // Validate file
    const validation = validateHeicFile(file, config.maxSize);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Convert HEIC to target format
    const conversionOptions = {
      format: config.outputFormat || 'jpeg',
      quality: config.quality || 85,
      progressive: true,
      optimise: true
    };

    const { file: convertedFile, stats } = await convertHeicFile(file, conversionOptions);

    // Log conversion success
    console.log(`HEIC conversion completed:`, {
      originalName: file.originalname,
      convertedName: convertedFile.originalname,
      originalSize: stats.originalSize,
      convertedSize: stats.convertedSize,
      compressionRatio: ((1 - stats.convertedSize / stats.originalSize) * 100).toFixed(1) + '%',
      conversionTime: `${stats.conversionTime}ms`
    });

    // Update global statistics
    if (config.enableStats) {
      globalStats.addConversion(
        stats.originalSize,
        stats.convertedSize,
        stats.conversionTime,
        true
      );
    }

    // Call custom success handler if provided
    if (config.onSuccess) {
      try {
        config.onSuccess(file, convertedFile, stats);
      } catch (handlerError) {
        console.warn('Custom success handler failed:', handlerError);
      }
    }

    return { converted: true, file: convertedFile };

  } catch (error) {
    console.error(`Failed to convert HEIC file ${file.originalname || 'unknown'}:`, error);
    throw error;
  }
}

/**
 * Express route handler for standalone HEIC conversion endpoint
 */
function heicConversionRoute(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  return async (req, res) => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided. Please upload a HEIC image.',
          error: 'NO_FILE_PROVIDED'
        });
      }

      // Get conversion options from request
      const quality = parseInt(req.body.quality) || config.quality;
      const format = req.body.format || config.outputFormat;

      // Validate file
      const validation = validateHeicFile(req.file, config.maxSize);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
          error: 'INVALID_FILE'
        });
      }

      // Convert HEIC file
      const conversionOptions = {
        format,
        quality,
        progressive: true,
        optimise: true
      };

      const { file: convertedFile, stats } = await convertHeicFile(req.file, conversionOptions);

      // Update statistics
      if (config.enableStats) {
        globalStats.addConversion(
          stats.originalSize,
          stats.convertedSize,
          stats.conversionTime,
          true
        );
      }

      // Set response headers
      res.set({
        'Content-Type': convertedFile.mimetype,
        'Content-Length': convertedFile.size,
        'Content-Disposition': `attachment; filename="${convertedFile.originalname}"`,
        'X-Conversion-Stats': JSON.stringify({
          originalSize: stats.originalSize,
          convertedSize: stats.convertedSize,
          conversionTime: stats.conversionTime,
          compressionRatio: ((1 - stats.convertedSize / stats.originalSize) * 100).toFixed(1) + '%'
        })
      });

      // Send converted file
      res.send(convertedFile.buffer);

    } catch (error) {
      console.error('HEIC conversion endpoint error:', error);

      if (config.enableStats) {
        globalStats.addConversion(
          req.file?.size || 0,
          0,
          Date.now() - startTime,
          false
        );
      }

      res.status(422).json({
        success: false,
        message: 'Failed to convert HEIC image. Please try uploading a JPEG or PNG image.',
        error: 'CONVERSION_FAILED',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}

/**
 * Express route handler for HEIC support check
 */
function heicSupportRoute() {
  return (req, res) => {
    const sharp = require('sharp');

    try {
      const formats = sharp.format;
      const supportsHeic = formats.heif && formats.heif.input;

      res.json({
        supported: supportsHeic,
        sharpVersion: sharp.versions?.sharp,
        libvipsVersion: sharp.versions?.vips,
        formats: {
          heif: formats.heif,
          jpeg: formats.jpeg,
          png: formats.png,
          webp: formats.webp
        }
      });
    } catch (error) {
      res.status(500).json({
        supported: false,
        error: 'Failed to check HEIC support',
        details: error.message
      });
    }
  };
}

/**
 * Express route handler for conversion statistics
 */
function heicStatsRoute() {
  return (req, res) => {
    const stats = globalStats.getStats();
    const serverLoad = getServerLoad(stats);

    res.json({
      ...stats,
      serverLoad,
      conversionsToday: stats.conversions, // Alias for compatibility
      averageConversionTime: stats.averageTime
    });
  };
}

/**
 * Determine server load based on conversion statistics
 */
function getServerLoad(stats) {
  if (stats.conversions === 0) return 'low';

  const avgTime = stats.averageTime;
  const errorRate = (stats.errors / stats.conversions) * 100;

  if (avgTime > 3000 || errorRate > 10) return 'high';
  if (avgTime > 1500 || errorRate > 5) return 'medium';
  return 'low';
}

module.exports = {
  heicMiddleware,
  heicConversionRoute,
  heicSupportRoute,
  heicStatsRoute,
  globalStats
};