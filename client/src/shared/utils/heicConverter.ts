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

import heic2any from 'heic2any';
import { ConversionConfig, ConversionResult } from './heicTypes';
import { isHeicFile } from './heicValidation';

/**
 * Converts HEIC file to JPEG or PNG using heic2any library (client-side)
 */
export const convertHeicToJpeg = async (
  file: File,
  config: ConversionConfig = { quality: 0.85, format: 'image/jpeg' },
  onProgress?: (progress: number) => void
): Promise<File> => {
  try {
    // Validate it's a HEIC file
    if (!isHeicFile(file)) {
      throw new Error('File is not a HEIC/HEIF format');
    }

    console.log('Starting client-side HEIC conversion:', {
      fileName: file.name,
      fileSize: file.size,
      config
    });

    if (onProgress) onProgress(10);

    // Convert HEIC to target format
    const conversionResult = await heic2any({
      blob: file,
      toType: config.format,
      quality: config.quality
    });

    if (onProgress) onProgress(80);

    // heic2any can return Blob or Blob[], we expect single Blob
    const resultBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;

    if (onProgress) onProgress(90);

    // Create new File object from the converted Blob
    const fileExtension = config.format === 'image/png' ? 'png' : 'jpg';
    const convertedFileName = file.name.replace(/\.(heic|heif)$/i, `.${fileExtension}`);

    const convertedFile = new File([resultBlob], convertedFileName, {
      type: config.format,
      lastModified: Date.now()
    });

    if (onProgress) onProgress(100);

    console.log('Client-side HEIC conversion completed:', {
      originalSize: file.size,
      convertedSize: convertedFile.size,
      originalName: file.name,
      convertedName: convertedFile.name
    });

    return convertedFile;

  } catch (error: any) {
    console.error('Client-side HEIC conversion failed:', error);
    throw new Error(`Client-side HEIC conversion failed: ${error.message}`);
  }
};

/**
 * Converts HEIC file on the server as fallback
 */
export const convertHeicOnServer = async (
  file: File,
  config: ConversionConfig = { quality: 0.85, format: 'image/jpeg' },
  onProgress?: (progress: number) => void
): Promise<File> => {
  try {
    console.log('Starting server-side HEIC conversion fallback:', {
      fileName: file.name,
      fileSize: file.size,
      config
    });

    if (onProgress) onProgress(10);

    // Create FormData for server upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', config.quality.toString());
    formData.append('format', config.format);

    if (onProgress) onProgress(30);

    // Call server endpoint for HEIC conversion (updated for car rental API)
    const response = await fetch('/api/heic/convert', {
      method: 'POST',
      body: formData
    });

    if (onProgress) onProgress(70);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server conversion failed' }));
      throw new Error(errorData.message || `Server responded with ${response.status}`);
    }

    // Get converted file data
    const blob = await response.blob();

    if (onProgress) onProgress(90);

    // Create new File object
    const fileExtension = config.format === 'image/png' ? 'png' : 'jpg';
    const convertedFileName = file.name.replace(/\.(heic|heif)$/i, `.${fileExtension}`);

    const convertedFile = new File([blob], convertedFileName, {
      type: config.format,
      lastModified: Date.now()
    });

    if (onProgress) onProgress(100);

    console.log('Server-side HEIC conversion completed:', {
      originalSize: file.size,
      convertedSize: convertedFile.size,
      originalName: file.name,
      convertedName: convertedFile.name
    });

    return convertedFile;

  } catch (error: any) {
    console.error('Server-side HEIC conversion failed:', error);
    throw new Error(`Server-side HEIC conversion failed: ${error.message}`);
  }
};

/**
 * Attempts to convert HEIC file with fallback strategy:
 * 1. Try client-side conversion first (faster, no server load)
 * 2. Fall back to server-side conversion if client fails
 * 3. Return original file if not HEIC
 */
export const convertHeicWithFallback = async (
  file: File,
  config: ConversionConfig = { quality: 0.85, format: 'image/jpeg' },
  onProgress?: (progress: number) => void,
  onMethodChange?: (method: 'client' | 'server') => void
): Promise<ConversionResult> => {
  try {
    // Return original file if not HEIC
    if (!isHeicFile(file)) {
      console.log('File is not HEIC, returning original');
      return {
        success: true,
        file,
        method: 'client' // Not actually converted, but treated as client-side
      };
    }

    // Try client-side conversion first
    try {
      if (onMethodChange) onMethodChange('client');
      const convertedFile = await convertHeicToJpeg(file, config, onProgress);

      return {
        success: true,
        file: convertedFile,
        method: 'client'
      };
    } catch (clientError) {
      console.log('Client-side conversion failed, trying server fallback:', clientError);

      // Reset progress for server attempt
      if (onProgress) onProgress(0);
      if (onMethodChange) onMethodChange('server');

      try {
        const convertedFile = await convertHeicOnServer(file, config, onProgress);

        return {
          success: true,
          file: convertedFile,
          method: 'server'
        };
      } catch (serverError) {
        console.error('Both client and server conversion failed:', { clientError, serverError });

        return {
          success: false,
          error: `HEIC conversion failed. Client error: ${(clientError as Error)?.message || clientError}. Server error: ${(serverError as Error)?.message || serverError}`
        };
      }
    }
  } catch (error: any) {
    console.error('Unexpected error in HEIC conversion:', error);
    return {
      success: false,
      error: `Unexpected conversion error: ${error.message}`
    };
  }
};