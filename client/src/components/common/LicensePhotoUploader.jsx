/*
 * License Photo Uploader Component
 * Reusable component for uploading driver's license photos (front/back)
 * Used in: AdminCustomerWizard, BookingWizard, BookPage
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useRef, useCallback, useState } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Single side photo uploader (front or back)
 */
export const LicensePhotoSingle = ({
  side, // 'front' | 'back'
  imageUrl, // Current image URL (from server or preview)
  onUpload, // (file: File) => void
  onDelete, // () => void
  disabled = false,
  required = false,
  showDeleteButton = true,
  height = 'h-48',
}) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  
  // Detect mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    
    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setImageError(false);
    
    // Call parent handler
    onUpload?.(file);
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onUpload]);
  
  const handleDelete = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setImageError(false);
    onDelete?.();
  }, [previewUrl, onDelete]);
  
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);
  
  const displayUrl = previewUrl || imageUrl;
  const hasValidImage = displayUrl && !imageError;
  
  const label = side === 'front' 
    ? t('license.front', 'Driver License Front')
    : t('license.back', 'Driver License Back');
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {hasValidImage ? (
        // Show uploaded image
        <div className={`relative ${height} border-2 border-green-500 rounded-lg overflow-hidden bg-gray-50`}>
          <img
            src={displayUrl}
            alt={label}
            className="w-full h-full object-contain"
            onError={handleImageError}
          />
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Check className="h-3 w-3" />
            {t('license.uploaded', 'Uploaded')}
          </div>
          {showDeleteButton && !disabled && (
            <button
              type="button"
              onClick={handleDelete}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
              title={t('license.deletePhoto', 'Delete photo')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        // Show upload area
        <label className={`block w-full ${height} border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-50 flex items-center justify-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture={isMobile ? "environment" : undefined}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
          <div className="text-center p-4">
            {isMobile ? (
              <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            ) : (
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            )}
            <span className="text-sm text-gray-600 block">
              {isMobile 
                ? t('license.takePhoto', 'Take Photo')
                : t('license.chooseFile', 'Choose File')
              }
            </span>
            <span className="text-xs text-gray-400 mt-1 block">
              {t('license.maxSize', 'Max 10MB')}
            </span>
          </div>
        </label>
      )}
    </div>
  );
};

/**
 * Both sides photo uploader (front and back together)
 */
const LicensePhotoUploader = ({
  frontUrl,
  backUrl,
  onUploadFront,
  onUploadBack,
  onDeleteFront,
  onDeleteBack,
  disabled = false,
  required = false,
  showLabels = true,
  className = '',
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={className}>
      {showLabels && (
        <p className="text-sm text-gray-600 mb-4">
          {t('license.uploadBothSides', 'Please upload clear photos of both sides of your driver\'s license')}
        </p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LicensePhotoSingle
          side="front"
          imageUrl={frontUrl}
          onUpload={onUploadFront}
          onDelete={onDeleteFront}
          disabled={disabled}
          required={required}
        />
        <LicensePhotoSingle
          side="back"
          imageUrl={backUrl}
          onUpload={onUploadBack}
          onDelete={onDeleteBack}
          disabled={disabled}
          required={required}
        />
      </div>
    </div>
  );
};

export default LicensePhotoUploader;
