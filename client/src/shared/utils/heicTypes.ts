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

export interface ConversionConfig {
  quality: number;
  format: 'image/jpeg' | 'image/png';
}

export interface HEICFileInputProps {
  onFileSelect: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number;
  conversionConfig?: ConversionConfig;
  className?: string;
  showEducation?: boolean;
  disabled?: boolean;
}

export interface HEICConverterProps {
  progress: number;
  conversionMethod: 'client' | 'server' | null;
  onCancel: () => void;
  error?: string | null;
}

export interface ConversionProgress {
  stage: 'detecting' | 'converting' | 'fallback' | 'complete';
  progress: number;
  message: string;
}

export interface HEICConverterHook {
  convertFile: (file: File) => Promise<File>;
  isConverting: boolean;
  error: string | null;
  progress: number;
  conversionMethod: 'client' | 'server' | null;
  cancelConversion: () => void;
}

export type ConversionMethod = 'client' | 'server';

export interface ConversionResult {
  success: boolean;
  file?: File;
  method?: ConversionMethod;
  error?: string;
}