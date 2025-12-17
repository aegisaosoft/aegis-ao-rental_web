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
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Camera, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DriverLicensePhoto = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [frontImage, setFrontImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [uploadingSide, setUploadingSide] = useState(null); // 'front' or 'back'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  
  const wizardId = searchParams.get('wizardId') || '';
  const customerIdParam = searchParams.get('customerId') || '';
  const returnTo = searchParams.get('returnTo') || '/';

  // Get customer ID from URL param, user context, or wizard data
  useEffect(() => {
    let foundCustomerId = customerIdParam;
    
    // Try from user context
    if (!foundCustomerId && user) {
      foundCustomerId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';
    }
    
    // Try from wizard data in sessionStorage
    if (!foundCustomerId && wizardId) {
      try {
        const wizardData = sessionStorage.getItem(`wizardData-${wizardId}`);
        if (wizardData) {
          const data = JSON.parse(wizardData);
          foundCustomerId = data.customerId || '';
        }
      } catch (e) {
        console.error('Error reading wizard data:', e);
      }
    }
    
    if (foundCustomerId) {
      setCustomerId(foundCustomerId);
    }
  }, [customerIdParam, wizardId, user]);

  // Helper to get current customer ID
  const getCurrentCustomerId = () => {
    return customerId || customerIdParam || user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';
  };

  const handleFileChange = (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('bookPage.invalidImageFile', 'Please upload an image file'));
      toast.error(t('bookPage.invalidImageFile', 'Please upload an image file'));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('bookPage.fileTooLarge', 'File size must be less than 10MB'));
      toast.error(t('bookPage.fileTooLarge', 'File size must be less than 10MB'));
      return;
    }

    // Create preview and upload/save
    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === 'front') {
        setFrontImage(file);
        setFrontPreview(reader.result);
      } else {
        setBackPreview(reader.result);
      }
      setError('');
      // Auto-upload/save after selecting (don't await, it's async)
      handleUpload(file, side).catch(err => {
        console.error('Error in handleUpload:', err);
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (file, side) => {
    // Get current customer ID
    const currentCustomerId = getCurrentCustomerId();
    
    // If no customer ID (new customer), store image in sessionStorage for wizard to pick up later
    if (!currentCustomerId) {
      if (!wizardId) {
        setError(t('bookPage.wizardIdRequired', 'Wizard ID is required. Please scan the QR code from the registration wizard.'));
        toast.error(t('bookPage.wizardIdRequired', 'Wizard ID is required. Please scan the QR code from the registration wizard.'));
        return;
      }

      // Store image temporarily in sessionStorage for the wizard to pick up after registration
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          sessionStorage.setItem(`wizardImage-${wizardId}-${side}`, JSON.stringify({
            side: side,
            dataUrl: reader.result,
            timestamp: Date.now()
          }));
          
          toast.success(
            side === 'front'
              ? t('bookPage.frontPhotoSaved', 'Front photo saved! Now take a photo of the back side.')
              : t('bookPage.backPhotoSaved', 'Back photo saved! You can now return to the wizard.')
          );
          
          // If both images are saved, navigate back after a delay
          if (side === 'back' && frontPreview) {
            setTimeout(() => {
              navigate(returnTo);
            }, 2000);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error(`Error saving ${side} image:`, err);
        setError(t('bookPage.saveError', 'Failed to save image. Please try again.'));
        toast.error(t('bookPage.saveError', 'Failed to save image. Please try again.'));
      }
      return;
    }

    // Customer ID exists, upload directly to server
    setUploadingSide(side);
    setUploadProgress(0);
    setError('');

    try {
      await apiService.uploadCustomerLicenseImage(
        currentCustomerId,
        side,
        file,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      toast.success(
        side === 'front'
          ? t('bookPage.frontPhotoSaved', 'Front photo saved!')
          : t('bookPage.backPhotoSaved', 'Back photo saved!')
      );

      // If both images are uploaded, navigate back after a delay
      if (side === 'back' && frontImage) {
        setTimeout(() => {
          navigate(returnTo);
        }, 2000);
      }
    } catch (err) {
      console.error(`Error uploading ${side} image:`, err);
      setError(err.response?.data?.message || t('bookPage.uploadError', 'Failed to upload image. Please try again.'));
      toast.error(err.response?.data?.message || t('bookPage.uploadError', 'Failed to upload image. Please try again.'));
    } finally {
      setUploadingSide(null);
      setUploadProgress(0);
    }
  };

  const handleRemove = (side) => {
    if (side === 'front') {
      setFrontImage(null);
      setFrontPreview(null);
      if (frontInputRef.current) {
        frontInputRef.current.value = '';
      }
    } else {
      setBackPreview(null);
      if (backInputRef.current) {
        backInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    navigate(returnTo);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with Close button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {t('bookPage.driverLicensePhotos', 'Driver License Photos')}
        </h1>
        <button
          onClick={handleClose}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <p className="text-center text-gray-600 mb-6">
            {t('bookPage.driverLicensePhotoInstruction', 'Take clear photos of both sides of your driver license.')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Front Image Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bookPage.driverLicenseFront', 'Driver License Front')} *
              </label>
              {frontPreview ? (
                <div className="relative">
                  <img
                    src={frontPreview}
                    alt="Driver license front"
                    className="w-full h-64 object-cover rounded-lg border border-gray-300"
                  />
                  {uploadingSide === 'front' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">{uploadProgress}%</p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove('front')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="block w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 flex items-center justify-center bg-gray-50">
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, 'front')}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">{t('bookPage.takePhoto', 'Take Photo')}</span>
                  </div>
                </label>
              )}
            </div>

            {/* Back Image Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bookPage.driverLicenseBack', 'Driver License Back')} *
              </label>
              {backPreview ? (
                <div className="relative">
                  <img
                    src={backPreview}
                    alt="Driver license back"
                    className="w-full h-64 object-cover rounded-lg border border-gray-300"
                  />
                  {uploadingSide === 'back' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">{uploadProgress}%</p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove('back')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="block w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 flex items-center justify-center bg-gray-50">
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, 'back')}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">{t('bookPage.takePhoto', 'Take Photo')}</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {frontPreview && backPreview && (
            <div className="mt-6 text-center">
              <button
                onClick={handleClose}
                className="btn-primary px-6 py-2"
              >
                {t('common.done', 'Done')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverLicensePhoto;
