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
 * Checks if a file is in HEIC/HEIF format based on MIME type and file extension
 */
export const isHeicFile = (file: File): boolean => {
  if (!file) return false;

  // Check MIME type first (most reliable)
  const heicMimeTypes = [
    'image/heic',
    'image/heif',
    'image/x-heic',
    'image/x-heif'
  ];

  if (heicMimeTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // Fallback to file extension check (for cases where MIME type is not set correctly)
  const fileName = file.name.toLowerCase();
  const heicExtensions = ['.heic', '.heif'];

  return heicExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Validates file size against the specified limit
 */
export const validateFileSize = (file: File, maxSize: number): { valid: boolean; error?: string } => {
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    };
  }
  return { valid: true };
};

/**
 * Validates that a file is an image
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Accept HEIC files and standard image types
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/tiff',
    'image/heic',
    'image/heif',
    'image/x-heic',
    'image/x-heif'
  ];

  if (!validTypes.includes(file.type.toLowerCase())) {
    // Also check file extension as fallback
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.heic', '.heif'];

    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      return {
        valid: false,
        error: 'Please upload a valid image file (JPEG, PNG, WebP, GIF, TIFF, HEIC)'
      };
    }
  }

  return { valid: true };
};

/**
 * Comprehensive file validation for HEIC-enabled file inputs
 */
export const validateHEICFile = (
  file: File,
  maxSize: number = 8 * 1024 * 1024 // 8MB default
): { valid: boolean; error?: string; isHeic?: boolean } => {
  // First validate it's an image
  const imageValidation = validateImageFile(file);
  if (!imageValidation.valid) {
    return imageValidation;
  }

  // Then validate size
  const sizeValidation = validateFileSize(file, maxSize);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Check if it's a HEIC file
  const isHeic = isHeicFile(file);

  return {
    valid: true,
    isHeic
  };
};