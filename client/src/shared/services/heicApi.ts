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

import { ConversionConfig } from '../utils/heicTypes';

export interface HeicConversionApiResponse {
  success: boolean;
  message?: string;
  data?: {
    originalFileName: string;
    convertedFileName: string;
    originalSize: number;
    convertedSize: number;
    conversionMethod: 'server';
  };
  error?: string;
}

/**
 * API service for server-side HEIC conversion
 */
export class HeicApiService {
  private static readonly BASE_URL = '/api';

  /**
   * Convert HEIC file on server as fallback
   */
  static async convertHeicFile(
    file: File,
    config: ConversionConfig = { quality: 0.85, format: 'image/jpeg' }
  ): Promise<File> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', config.quality.toString());
    formData.append('format', config.format);

    try {
      const response = await fetch(`${this.BASE_URL}/heic/convert`, {
        method: 'POST',
        body: formData,
        headers: {
          // Let browser set Content-Type for multipart/form-data
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Server responded with ${response.status}: ${response.statusText}`
        }));
        throw new Error(errorData.message || `Server conversion failed with status ${response.status}`);
      }

      // Check if response is JSON (error) or blob (success)
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        // This is likely an error response
        const errorData = await response.json();
        throw new Error(errorData.message || 'Server conversion failed');
      }

      // Get converted file as blob
      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error('Server returned empty file');
      }

      // Create new File object
      const fileExtension = config.format === 'image/png' ? 'png' : 'jpg';
      const convertedFileName = file.name.replace(/\.(heic|heif)$/i, `.${fileExtension}`);

      return new File([blob], convertedFileName, {
        type: config.format,
        lastModified: Date.now()
      });

    } catch (error: any) {
      console.error('Server HEIC conversion failed:', error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to conversion server');
      }

      throw new Error(`Server conversion failed: ${error.message}`);
    }
  }

  /**
   * Check server support for HEIC conversion
   */
  static async checkServerSupport(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/heic/support`, {
        method: 'GET'
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.supported === true;

    } catch (error) {
      console.warn('Could not check server HEIC support:', error);
      return false;
    }
  }

  /**
   * Get server conversion status/statistics
   */
  static async getConversionStats(): Promise<{
    conversionsToday: number;
    averageConversionTime: number;
    serverLoad: 'low' | 'medium' | 'high';
  } | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/heic/stats`, {
        method: 'GET'
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();

    } catch (error) {
      console.warn('Could not fetch conversion stats:', error);
      return null;
    }
  }
}