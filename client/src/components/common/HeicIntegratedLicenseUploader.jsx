/*
 * HEIC-Integrated License Photo Uploader Component
 * Enhanced version with automatic HEIC/HEIF conversion support
 * Copyright (c) 2025 Alexander Orlov.
 */

import React, { useRef, useCallback, useState } from 'react';
import { Camera, Upload, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { convertHeicWithFallback } from '../../shared/utils/heicConverter';
import { validateHEICFile, isHeicFile } from '../../shared/utils/heicValidation';

/**
 * Enhanced License Photo Uploader with HEIC conversion support
 */
export const HeicIntegratedLicenseUploader = ({
  side, // 'front' | 'back'
  imageUrl, // Current image URL (from server or preview)
  onUpload, // (file: File) => void
  onDelete, // () => void
  disabled = false,
  required = false,
  showDeleteButton = true,
  height = 'h-48',
  maxSize = 8 * 1024 * 1024, // 8MB default
  conversionConfig = { quality: 0.85, format: 'image/jpeg' }
}) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  // Component state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionMethod, setConversionMethod] = useState(null);
  const [conversionError, setConversionError] = useState(null);

  // Detect mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConversionError(null);
    setImageError(false);

    try {
      // Validate file
      const validation = validateHEICFile(file, maxSize);
      if (!validation.valid) {
        setConversionError(validation.error);
        return;
      }

      // Check if it's a HEIC file
      const isHeic = isHeicFile(file);
      let finalFile = file;

      if (isHeic) {
        console.log(`Detected HEIC file: ${file.name}, starting conversion...`);
        setIsConverting(true);
        setConversionProgress(0);

        // Convert HEIC file with fallback strategy
        const conversionResult = await convertHeicWithFallback(
          file,
          conversionConfig,
          (progress) => setConversionProgress(progress),
          (method) => setConversionMethod(method)
        );

        if (!conversionResult.success) {
          throw new Error(conversionResult.error || 'HEIC conversion failed');
        }

        finalFile = conversionResult.file;
        console.log(`HEIC conversion completed via ${conversionResult.method}:`, {
          originalName: file.name,
          convertedName: finalFile.name,
          originalSize: file.size,
          convertedSize: finalFile.size
        });
      }

      // Validate final file type (should be standard image now)
      if (!finalFile.type.startsWith('image/')) {
        throw new Error('File is not a valid image');
      }

      // Create preview
      const url = URL.createObjectURL(finalFile);
      setPreviewUrl(url);
      setIsConverting(false);

      // Call parent upload handler
      onUpload(finalFile);

    } catch (error) {
      console.error('File upload/conversion error:', error);
      setConversionError(error.message || 'Failed to process image file');
      setIsConverting(false);
      setConversionProgress(0);
    }

    // Clear input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [maxSize, conversionConfig, onUpload]);

  const handleDelete = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setImageError(false);
    setConversionError(null);
    onDelete();
  }, [previewUrl, onDelete]);

  const handleClick = useCallback(() => {
    if (disabled || isConverting) return;
    inputRef.current?.click();
  }, [disabled, isConverting]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Determine what to show
  const currentImageUrl = previewUrl || imageUrl;
  const showImage = currentImageUrl && !imageError && !isConverting;
  const showPlaceholder = !showImage && !isConverting;

  return (
    <div className="space-y-2">
      {/* Photo Container */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all
          ${height} w-full
          ${disabled || isConverting
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${conversionError ? 'border-red-300 bg-red-50' : ''}
          ${showImage ? 'border-solid border-gray-200' : ''}
        `}
        onClick={handleClick}
      >
        {/* Converting State */}
        {isConverting && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-10">
            <div className="flex items-center space-x-2 mb-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {t('heic.converting', 'Converting HEIC...')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${conversionProgress}%` }}
              />
            </div>

            {/* Conversion Method */}
            {conversionMethod && (
              <div className="text-xs text-gray-500 mt-1">
                {conversionMethod === 'client' ? t('heic.clientSide', 'Client-side') : t('heic.serverSide', 'Server-side')}
              </div>
            )}
          </div>
        )}

        {/* Image Display */}
        {showImage && (
          <>
            <img
              src={currentImageUrl}
              alt={`${t('bookPage.driverLicense', 'Driver License')} ${side}`}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />

            {/* Delete Button */}
            {showDeleteButton && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Success Indicator */}
            <div className="absolute top-2 left-2 p-1 bg-green-500 text-white rounded-full shadow-lg">
              <Check className="h-4 w-4" />
            </div>
          </>
        )}

        {/* Placeholder */}
        {showPlaceholder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            {isMobile ? (
              <>
                <Camera className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">
                  {t('bookPage.takePhoto', 'Take Photo')}
                </span>
                <span className="text-xs text-center px-2 mt-1">
                  {side === 'front'
                    ? t('bookPage.frontSide', 'Front Side')
                    : t('bookPage.backSide', 'Back Side')
                  }
                </span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">
                  {t('bookPage.uploadPhoto', 'Upload Photo')}
                </span>
                <span className="text-xs text-center px-2 mt-1">
                  {side === 'front'
                    ? t('bookPage.frontSide', 'Front Side')
                    : t('bookPage.backSide', 'Back Side')
                  }
                </span>
              </>
            )}

            {/* HEIC Support Notice */}
            <div className="text-xs text-blue-600 mt-2 text-center px-2">
              {t('heic.supportNotice', 'HEIC/HEIF files automatically converted')}
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,.heic,.heif"
          onChange={handleFileChange}
          disabled={disabled || isConverting}
        />
      </div>

      {/* Error Message */}
      {conversionError && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-red-800">
              {t('heic.conversionFailed', 'Image Processing Failed')}
            </div>
            <div className="text-sm text-red-700 mt-1">
              {conversionError}
            </div>
            <button
              type="button"
              onClick={handleClick}
              className="text-sm text-red-800 underline mt-1 hover:no-underline"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      )}

      {/* Required Field Indicator */}
      {required && !showImage && (
        <div className="text-sm text-gray-600">
          <span className="text-red-500">*</span> {t('common.required', 'Required')}
        </div>
      )}
    </div>
  );
};

export default HeicIntegratedLicenseUploader;