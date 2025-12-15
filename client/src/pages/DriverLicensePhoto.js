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

import React, { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Camera, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DriverLicensePhoto = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  
  const [status, setStatus] = useState('ready'); // ready, preview, saving
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  const wizardId = searchParams.get('wizardId') || '';
  const returnTo = searchParams.get('returnTo') || '/';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('bookPage.invalidImageFile', 'Please upload an image file'));
      toast.error(t('bookPage.invalidImageFile', 'Please upload an image file'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('bookPage.fileTooLarge', 'File size must be less than 5MB'));
      toast.error(t('bookPage.fileTooLarge', 'File size must be less than 5MB'));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setStatus('preview');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!wizardId) {
      setError('Wizard ID is required');
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select an image first');
      return;
    }

    setStatus('saving');
    setError('');

    try {
      // Read file as data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        // Determine which side based on what's already saved
        const frontExists = sessionStorage.getItem(`wizardImage-${wizardId}-front`);
        const side = frontExists ? 'back' : 'front';
        
        // Save to sessionStorage
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
        
        // If both sides are done, navigate back after a delay
        if (side === 'back') {
          setTimeout(() => {
            navigate(returnTo);
          }, 2000);
        } else {
          // Reset to ready state for back side
          setTimeout(() => {
            setStatus('ready');
            setImagePreview('');
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            toast.info(t('bookPage.nowTakeBackSide', 'Now take a photo of the back side'));
          }, 1500);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error saving photo:', err);
      setError('Failed to save photo. Please try again.');
      setStatus('preview');
    }
  };

  const handleRetake = () => {
    setStatus('ready');
    setImagePreview('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        <div className="w-full max-w-md">
          {/* File input - always in DOM so file remains accessible */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {status === 'ready' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="mb-4">
                  <Camera className="h-16 w-16 text-blue-600 mx-auto" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('bookPage.takeDriverLicensePhoto', 'Take Photo of Your Driver License')}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t('bookPage.driverLicensePhotoInstruction', 'Take a clear photo of your driver license. You\'ll need to take photos of both the front and back sides.')}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  {t('bookPage.openCamera', 'Open Camera')}
                </button>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('bookPage.preview', 'Preview')}
                </h3>
                {imagePreview && (
                  <div className="mb-4">
                    <img
                      src={imagePreview}
                      alt="Driver license preview"
                      className="w-full rounded-lg border border-gray-300"
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleRetake}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    {t('bookPage.retake', 'Retake')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={status === 'saving'}
                    className="flex-1 btn-primary py-2 disabled:opacity-50"
                  >
                    {status === 'saving' 
                      ? t('bookPage.saving', 'Saving...') 
                      : t('bookPage.savePhoto', 'Save Photo')}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {status === 'saving' && (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="mb-4">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
              <p className="text-gray-600">
                {t('bookPage.savingPhoto', 'Saving photo...')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverLicensePhoto;
