/*
 * License Photos Step Component
 * Reusable component for uploading driver's license photos with QR code support
 * Used in: AdminCustomerWizard, BookingWizard
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Camera, QrCode, Upload, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { useTranslation } from 'react-i18next';

const LicensePhotosStep = ({
  customerId,
  customerEmail,
  // Uploaded images state (from parent)
  uploadedImages = { front: null, back: null },
  setUploadedImages,
  // Local file previews (optional, for files not yet on server)
  localPreviews = { front: null, back: null },
  setLocalPreviews,
  // Loading state
  loading = false,
  setLoading,
  // Error handling
  onError,
  // Options
  required = false,
  showSkipButton = true,
  onSkip,
  // Style
  className = '',
}) => {
  const { t } = useTranslation();
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  
  // Detect mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Use internal or external loading state
  const isLoading = loading !== undefined ? loading : internalLoading;
  const setIsLoading = setLoading || setInternalLoading;
  
  // Fetch existing images on mount and when customerId changes
  useEffect(() => {
    if (!customerId) return;
    
    const fetchExistingImages = async () => {
      try {
        const response = await apiService.getCustomerLicenseImages(customerId);
        const imageData = response?.data || response;
        
        if (imageData) {
          const newImages = { front: null, back: null };
          
          if (imageData.frontUrl) {
            // Handle relative URLs
            const frontUrl = imageData.frontUrl.startsWith('http') 
              ? imageData.frontUrl 
              : `${window.location.origin}${imageData.frontUrl}`;
            newImages.front = frontUrl;
          }
          
          if (imageData.backUrl) {
            const backUrl = imageData.backUrl.startsWith('http') 
              ? imageData.backUrl 
              : `${window.location.origin}${imageData.backUrl}`;
            newImages.back = backUrl;
          }
          
          if (setUploadedImages && (newImages.front || newImages.back)) {
            console.log('🔥 DEBUG: fetchExistingImages - restoring images', {
              newImages,
              from: 'fetchExistingImages useEffect'
            });
            setUploadedImages(prev => ({
              ...prev,
              ...newImages
            }));
          }
        }
      } catch (error) {
      }
    };
    
    fetchExistingImages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]); // Remove setUploadedImages dependency to avoid circular updates
  
  // Listen for storage events (when license is scanned on phone)
  useEffect(() => {
    if (!showQRCode || !customerId) return;
    
    const checkForNewImages = async () => {
      try {
        const response = await apiService.getCustomerLicenseImages(customerId);
        const imageData = response?.data || response;
        
        if (imageData && setUploadedImages) {
          const newImages = {};
          
          if (imageData.frontUrl) {
            const frontUrl = imageData.frontUrl.startsWith('http') 
              ? imageData.frontUrl 
              : `${window.location.origin}${imageData.frontUrl}`;
            newImages.front = frontUrl;
          }
          
          if (imageData.backUrl) {
            const backUrl = imageData.backUrl.startsWith('http') 
              ? imageData.backUrl 
              : `${window.location.origin}${imageData.backUrl}`;
            newImages.back = backUrl;
          }
          
          if (newImages.front || newImages.back) {
            console.log('🔥 DEBUG: checkForNewImages - restoring images', {
              newImages,
              from: 'QR polling useEffect'
            });
            setUploadedImages(prev => ({ ...prev, ...newImages }));
          }
        }
      } catch (error) {
        // Silently ignore
      }
    };
    
    // Poll for new images every 3 seconds while QR modal is open
    const interval = setInterval(checkForNewImages, 3000);
    
    // Also listen for focus events
    const handleFocus = () => checkForNewImages();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQRCode, customerId]); // Remove setUploadedImages dependency
  
  // Handle file upload
  const handleFileChange = useCallback(async (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.(t('license.invalidImageType', 'Please select an image file'));
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError?.(t('license.imageTooLarge', 'Image must be less than 10MB'));
      return;
    }
    
    // Create local preview
    const previewUrl = URL.createObjectURL(file);
    if (setLocalPreviews) {
      setLocalPreviews(prev => ({ ...prev, [side]: previewUrl }));
    }
    
    // If we have customerId, upload immediately
    if (customerId) {
      setIsLoading(true);
      try {
        const response = await apiService.uploadCustomerLicenseImage(customerId, side, file);
        const imageUrl = response?.data?.url || response?.data?.imageUrl || response?.url || response?.imageUrl;
        
        if (imageUrl && setUploadedImages) {
          const fullUrl = imageUrl.startsWith('http') 
            ? imageUrl 
            : `${window.location.origin}${imageUrl}`;
          setUploadedImages(prev => ({ ...prev, [side]: fullUrl }));
        }
        
        // Clear local preview since we have server URL
        if (setLocalPreviews) {
          URL.revokeObjectURL(previewUrl);
          setLocalPreviews(prev => ({ ...prev, [side]: null }));
        }
      } catch (error) {
        onError?.(t('license.uploadError', 'Failed to upload image. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    }
    
    // Reset input
    e.target.value = '';
  }, [customerId, setUploadedImages, setLocalPreviews, setIsLoading, onError, t]);
  
  // Handle delete image
  const handleDeleteImage = useCallback(async (side) => {
    console.log('🔥 DEBUG: handleDeleteImage START', { side, customerId });

    if (!customerId) {
      console.log('🔥 DEBUG: No customerId, clearing local only');
      // Just clear local state
      if (setLocalPreviews) {
        setLocalPreviews(prev => {
          if (prev[side]) URL.revokeObjectURL(prev[side]);
          return { ...prev, [side]: null };
        });
      }
      if (setUploadedImages) {
        setUploadedImages(prev => ({ ...prev, [side]: null }));
      }
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔥 DEBUG: Making API delete call');
      await apiService.deleteCustomerLicenseImage(customerId, side);
      console.log('🔥 DEBUG: API delete successful, clearing state');
      if (setUploadedImages) {
        setUploadedImages(prev => ({ ...prev, [side]: null }));
      }
      if (setLocalPreviews) {
        setLocalPreviews(prev => {
          if (prev[side]) URL.revokeObjectURL(prev[side]);
          return { ...prev, [side]: null };
        });
      }
    } catch (error) {
      onError?.(t('license.deleteError', 'Failed to delete image'));
    } finally {
      setIsLoading(false);
    }
  }, [customerId, setUploadedImages, setLocalPreviews, setIsLoading, onError, t]);
  
  // Show QR Code
  const handleShowQRCode = useCallback(async () => {
    if (!customerId && !customerEmail) {
      onError?.(t('license.customerRequired', 'Customer information is required to generate QR code'));
      return;
    }
    
    setIsLoading(true);
    try {
      let resolvedCustomerId = customerId;
      
      // If we don't have customerId, try to get it by email
      if (!resolvedCustomerId && customerEmail) {
        try {
          const resp = await apiService.getCustomerByEmail(customerEmail);
          const data = resp?.data || resp;
          resolvedCustomerId = data?.id || data?.customerId || data?.CustomerId || '';
        } catch (e) {
          // Customer not found
        }
      }
      
      if (!resolvedCustomerId) {
        onError?.(t('license.customerNotFound', 'Customer not found. Please complete registration first.'));
        return;
      }
      
      const origin = window.location.origin;
      const returnTo = window.location.pathname + window.location.search;
      const url = `${origin}/driver-license-photo?customerId=${encodeURIComponent(resolvedCustomerId)}&returnTo=${encodeURIComponent(returnTo)}`;
      
      setQrUrl(url);
      setShowQRCode(true);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, customerEmail, setIsLoading, onError, t]);
  
  // Get display URLs (prefer server URLs, fall back to local previews)
  const frontUrl = uploadedImages?.front || localPreviews?.front;
  const backUrl = uploadedImages?.back || localPreviews?.back;
  const hasFront = !!frontUrl;
  const hasBack = !!backUrl;
  
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('license.photos', 'Driver License Photos')}
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        {isMobile 
          ? t('license.uploadBothSides', 'Please upload clear photos of both sides of your driver\'s license')
          : t('license.uploadOrScan', 'Upload photos or scan QR code with your phone to take pictures')
        }
        {!required && ` (${t('common.optional', 'optional')})`}
      </p>
      
      {/* Uploaded Images Display */}
      {(hasFront || hasBack) && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {t('license.uploadedImages', 'Uploaded Images')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasFront && (
              <div>
                <label className="block text-xs font-medium text-green-700 mb-2">
                  {t('license.front', 'Driver License Front')}
                </label>
                <div className="relative">
                  <img
                    src={frontUrl}
                    alt="Driver license front"
                    className="w-full h-48 object-contain rounded-lg border-2 border-green-500 bg-gray-50"
                    onError={(e) => {
                      if (setUploadedImages) {
                        setUploadedImages(prev => ({ ...prev, front: null }));
                      }
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {t('license.uploaded', 'Uploaded')}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage('front')}
                    disabled={isLoading}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                    title={t('license.deletePhoto', 'Delete photo')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            {hasBack && (
              <div>
                <label className="block text-xs font-medium text-green-700 mb-2">
                  {t('license.back', 'Driver License Back')}
                </label>
                <div className="relative">
                  <img
                    src={backUrl}
                    alt="Driver license back"
                    className="w-full h-48 object-contain rounded-lg border-2 border-green-500 bg-gray-50"
                    onError={(e) => {
                      if (setUploadedImages) {
                        setUploadedImages(prev => ({ ...prev, back: null }));
                      }
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {t('license.uploaded', 'Uploaded')}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage('back')}
                    disabled={isLoading}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                    title={t('license.deletePhoto', 'Delete photo')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Upload Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!hasFront && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('license.front', 'Driver License Front')} {required && <span className="text-red-500">*</span>}
            </label>
            <label className={`block w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-50 flex items-center justify-center transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*"
                capture={isMobile ? "environment" : undefined}
                onChange={(e) => handleFileChange(e, 'front')}
                disabled={isLoading}
                className="hidden"
              />
              <div className="text-center p-4">
                {isMobile ? (
                  <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                ) : (
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                )}
                <span className="text-sm text-gray-600 block">
                  {isMobile ? t('license.takePhoto', 'Take Photo') : t('license.chooseFile', 'Choose File')}
                </span>
                <span className="text-xs text-gray-400 mt-1 block">
                  {t('license.maxSize', 'Max 10MB')}
                </span>
              </div>
            </label>
          </div>
        )}
        
        {!hasBack && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('license.back', 'Driver License Back')} {required && <span className="text-red-500">*</span>}
            </label>
            <label className={`block w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-50 flex items-center justify-center transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*"
                capture={isMobile ? "environment" : undefined}
                onChange={(e) => handleFileChange(e, 'back')}
                disabled={isLoading}
                className="hidden"
              />
              <div className="text-center p-4">
                {isMobile ? (
                  <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                ) : (
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                )}
                <span className="text-sm text-gray-600 block">
                  {isMobile ? t('license.takePhoto', 'Take Photo') : t('license.chooseFile', 'Choose File')}
                </span>
                <span className="text-xs text-gray-400 mt-1 block">
                  {t('license.maxSize', 'Max 10MB')}
                </span>
              </div>
            </label>
          </div>
        )}
      </div>
      
      {/* QR Code Button (Desktop only) */}
      {!isMobile && (!hasFront || !hasBack) && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <button
            type="button"
            onClick={handleShowQRCode}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
          >
            <QrCode className="h-5 w-5" />
            {t('license.usePhoneCamera', 'Use Phone Camera')}
          </button>
          <p className="text-xs text-gray-600 mt-2 text-center">
            {t('license.qrCodeHelper', 'Scan QR code with your phone to take photos with your camera')}
          </p>
        </div>
      )}
      
      {/* Skip Button */}
      {showSkipButton && !required && onSkip && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onSkip}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            {t('license.skipForNow', 'Skip for now')}
          </button>
        </div>
      )}
      
      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowQRCode(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <button
              type="button"
              onClick={() => setShowQRCode(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('license.scanQRCode', 'Scan QR Code')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('license.scanQRCodeHelper', 'Scan this QR code with your phone to take photos')}
              </p>
              
              <div className="flex justify-center mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <QRCodeSVG value={qrUrl} size={256} level="M" includeMargin={true} />
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                {t('license.qrCodeNote', 'Open your phone camera and point it at the QR code')}
              </p>
              
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {t('license.openLinkDirectly', 'Or open link directly')}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicensePhotosStep;
