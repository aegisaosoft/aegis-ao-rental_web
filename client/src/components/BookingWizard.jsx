/*
 * Booking Wizard Component
 * Copyright (c) 2025 Alexander Orlov.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, UserPlus, Check, ArrowLeft, ArrowRight, QrCode, Camera, CreditCard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const BookingWizard = ({
  isOpen,
  onClose,
  onComplete, // Callback when wizard is successfully completed (user registered/authenticated)
  user,
  loginUser,
  registerUser,
  handleAuthSuccess, // Function to handle successful authentication and proceed to checkout
  isMobile,
  dlImageCheckCache, // Cache for driver license image checks
  agreementSignature, // Passed from BookPage state
  setAgreementSignature, // Passed from BookPage state
  agreementConsents, // Passed from BookPage state
  setAgreementConsents, // Passed from BookPage state
  uploadedLicenseImages, // Passed from BookPage state
  setUploadedLicenseImages, // Passed from BookPage state
  initialEmail, // Email to pre-fill when wizard opens from auth modal
}) => {
  const { t } = useTranslation();
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardFormData, setWizardFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    driverLicenseFront: null,
    driverLicenseBack: null,
    customerId: '',
  });
  const [wizardImagePreviews, setWizardImagePreviews] = useState({
    driverLicenseFront: null,
    driverLicenseBack: null,
  });
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [showWizardQRCode, setShowWizardQRCode] = useState(false);
  const [wizardQRUrl, setWizardQRUrl] = useState('');

  // Reset wizard state when it first opens (transitions from closed to open)
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Wizard just opened
      setWizardError('');
      setShowWizardQRCode(false);
      
      // Safety check: If DL images already exist in state, close wizard immediately
      // (This should not happen as we check before opening, but it's a safety net)
      // Don't auto-close based on state alone - state might have invalid URLs
      // Let the server check in fetchImagesForStep3 determine if images actually exist
      
      // If user already exists (authenticated), start from step 3 (license photos)
      // If user is new (not authenticated), start from step 1 (welcome/registration)
      if (user && (user.id || user.customerId || user.customer_id)) {
        // User exists - start from step 3 (license photos)
        setWizardStep(3);
        // Pre-fill user data if available
        setWizardFormData(prev => ({
          ...prev,
          firstName: user.firstName || prev.firstName,
          lastName: user.lastName || prev.lastName,
          email: user.email || initialEmail || prev.email,
          phoneNumber: user.phone || user.phoneNumber || prev.phoneNumber,
          customerId: user.id || user.customerId || user.customer_id || prev.customerId
        }));
        
        // Fetch existing images if they exist on server but not in state
        const fetchExistingImages = async () => {
          const customerId = user.id || user.customerId || user.customer_id;
          if (!customerId) return;
          
          const apiBaseUrl = window.location.origin;
          const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
          
          const checkImageExists = async (url) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 1000);
              const response = await fetch(url + '?t=' + Date.now(), {
                method: 'HEAD',
                cache: 'no-cache',
                signal: controller.signal,
                credentials: 'include'
              });
              clearTimeout(timeoutId);
              return response.ok ? url : null;
            } catch (error) {
              return null;
            }
          };
          
          let frontUrl = null;
          let backUrl = null;
          
          // Check for front image - static files are served from /customers/ (not /api/customers/)
          if (!uploadedLicenseImages.front) {
            for (const ext of extensions) {
              const url = `${apiBaseUrl}/customers/${customerId}/licenses/front${ext}`;
              frontUrl = await checkImageExists(url);
              if (frontUrl) break;
            }
            if (frontUrl) {
              setUploadedLicenseImages(prev => ({ ...prev, front: frontUrl }));
            }
          } else {
            frontUrl = uploadedLicenseImages.front;
          }
          
          // Check for back image - static files are served from /customers/ (not /api/customers/)
          if (!uploadedLicenseImages.back) {
            for (const ext of extensions) {
              const url = `${apiBaseUrl}/customers/${customerId}/licenses/back${ext}`;
              backUrl = await checkImageExists(url);
              if (backUrl) break;
            }
            if (backUrl) {
              setUploadedLicenseImages(prev => ({ ...prev, back: backUrl }));
            }
          } else {
            backUrl = uploadedLicenseImages.back;
          }
          
          // Don't close wizard here - always show images on step 3 if they exist
          // User might want to see or replace them
        };
        
        fetchExistingImages();
      } else {
        // New user - start from step 1 (welcome/registration)
        setWizardStep(1);
        // Pre-fill email if provided (from auth modal)
        if (initialEmail) {
          setWizardFormData(prev => ({
            ...prev,
            email: initialEmail
          }));
        }
      }
      // Don't reset other form data here - it might have been pre-filled from parent
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialEmail, user, uploadedLicenseImages.front, uploadedLicenseImages.back, onClose, setUploadedLicenseImages]);

  // Always fetch and display existing images when on step 3 (license photos)
  useEffect(() => {
    if (wizardStep === 3 && user && (user.id || user.customerId || user.customer_id)) {
      const customerId = user.id || user.customerId || user.customer_id;
      if (!customerId) return;
      
      const fetchImagesForStep3 = async () => {
        console.log(`[BookingWizard] Step 3: Fetching images for customer ${customerId}`);
        console.log(`[BookingWizard] Current state - front: ${uploadedLicenseImages.front || 'missing'}, back: ${uploadedLicenseImages.back || 'missing'}`);
        
        try {
          // Use the new API endpoint to get actual image filenames and URLs
          const response = await apiService.getCustomerLicenseImages(customerId);
          const imageData = response?.data || response;
          
          console.log(`[BookingWizard] API response:`, imageData);
          
          // Construct frontend URLs using window.location.origin (frontend server)
          const frontendBaseUrl = window.location.origin;
          
          let frontUrl = null;
          let backUrl = null;
          
          if (imageData.frontUrl && imageData.front) {
            // Try static file URL first: /customers/.../licenses/front.png
            // If that doesn't work, fallback to API endpoint: /api/Media/customers/.../licenses/file/front.png
            const staticUrl = `${frontendBaseUrl}${imageData.frontUrl}`;
            const apiUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.front}`;
            
            // Use API endpoint as it's more reliable (direct file serving)
            frontUrl = apiUrl;
            console.log(`[BookingWizard] ✅ Front image URL (API endpoint): ${frontUrl}`);
            console.log(`[BookingWizard] Static URL (fallback): ${staticUrl}`);
          }
          
          if (imageData.backUrl && imageData.back) {
            // Try static file URL first: /customers/.../licenses/back.png
            // If that doesn't work, fallback to API endpoint: /api/Media/customers/.../licenses/file/back.png
            const staticUrl = `${frontendBaseUrl}${imageData.backUrl}`;
            const apiUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.back}`;
            
            // Use API endpoint as it's more reliable (direct file serving)
            backUrl = apiUrl;
            console.log(`[BookingWizard] Static URL (fallback): ${staticUrl}`);
          }
          
          // Update state with the correct URLs
          if (frontUrl || backUrl) {
            setUploadedLicenseImages(prev => {
              const newState = {
                front: frontUrl || prev.front,
                back: backUrl || prev.back
              };
              console.log(`[BookingWizard] Updated state:`, newState);
              return newState;
            });
          } else {
            // No images found - clear state
            console.log(`[BookingWizard] ❌ No images found for customer ${customerId}`);
            setUploadedLicenseImages(prev => {
              if (prev.front || prev.back) {
                console.log(`[BookingWizard] Clearing image URLs from state`);
                return { front: null, back: null };
              }
              return prev;
            });
          }
          
          console.log(`[BookingWizard] Step 3 fetch complete - front: ${frontUrl || 'NOT FOUND'}, back: ${backUrl || 'NOT FOUND'}`);
        } catch (error) {
          console.error(`[BookingWizard] Error fetching images:`, error);
          // On error, don't clear existing state - might be a temporary network issue
        }
      };
      
      fetchImagesForStep3();
    }
  }, [wizardStep, user, uploadedLicenseImages.front, uploadedLicenseImages.back, setUploadedLicenseImages]);

  // Handlers
  const handleWizardInputChange = (e) => {
    const { name, value } = e.target;
    setWizardFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setWizardError('');
  };

  const handleWizardFileChange = async (e, fieldName) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        setWizardError(t('bookPage.invalidImageFile', 'Please upload an image file'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setWizardError(t('bookPage.fileTooLarge', 'File size must be less than 5MB'));
        return;
      }

      // Store file in form data for later upload if needed
      setWizardFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      const previewKey = fieldName === 'driverLicenseFront' ? 'driverLicenseFront' : 'driverLicenseBack';
      setWizardImagePreviews(prev => ({
        ...prev,
        [previewKey]: previewUrl
      }));

      const customerId = wizardFormData.customerId || user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';
      
      if (!customerId) {
        // Don't upload yet if customerId is missing - will upload on Next click
        setWizardError('');
        return;
      }

      const side = fieldName === 'driverLicenseFront' ? 'front' : 'back';
      
      try {
        setWizardLoading(true);
        setWizardError('');
        
        console.log(`[BookingWizard] handleWizardFileChange - Uploading ${side} image for customer:`, customerId);
        console.log(`[BookingWizard] handleWizardFileChange - File:`, { name: file.name, size: file.size, type: file.type });

        const response = await apiService.uploadCustomerLicenseImage(customerId, side, file);
        
        console.log(`[BookingWizard] handleWizardFileChange - Upload response:`, response);
        
        const imageUrl = response?.data?.imageUrl || response?.data?.result?.imageUrl;
        
        console.log(`[BookingWizard] handleWizardFileChange - Image URL from response:`, imageUrl);
        
        if (imageUrl) {
          // Backend returns path like /customers/.../licenses/front.png
          // Convert to full frontend URL (use window.location.origin for frontend server)
          const frontendBaseUrl = window.location.origin;
          const fullImageUrl = `${frontendBaseUrl}${imageUrl}`;
          
          console.log(`[BookingWizard] handleWizardFileChange - Full image URL (frontend):`, fullImageUrl);
          console.log(`[BookingWizard] handleWizardFileChange - Setting ${side} image in state`);
          
          setUploadedLicenseImages(prev => {
            const newState = { ...prev, [side]: fullImageUrl };
            console.log(`[BookingWizard] handleWizardFileChange - Updated state:`, newState);
            return newState;
          });

          // Clear local file and preview since it's now uploaded
          setWizardFormData(prev => ({
            ...prev,
            [fieldName]: null
          }));
          URL.revokeObjectURL(previewUrl);
          setWizardImagePreviews(prev => ({
            ...prev,
            [previewKey]: null
          }));

          // Trigger refresh event for other tabs
          try {
            const channel = new BroadcastChannel('license_images_channel');
            channel.postMessage({ type: 'licenseImageUploaded', side, customerId, imageUrl: fullImageUrl });
            channel.close();
          } catch (e) {
            console.log('BroadcastChannel not available:', e);
          }

          try {
            localStorage.setItem('licenseImagesUploaded', Date.now().toString());
          } catch (e) {
            console.log('localStorage not available:', e);
          }

          if (customerId && dlImageCheckCache) {
            dlImageCheckCache.current?.delete(customerId);
          }
          
        }

        e.target.value = '';
      } catch (err) {
        console.error(`[BookingWizard] handleWizardFileChange - ❌ Error uploading ${side} image:`, err);
        console.error(`[BookingWizard] handleWizardFileChange - Error details:`, {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        const errorMessage = err.response?.data?.message || err.response?.data?.result?.message || err.message || t('bookPage.uploadError', 'Failed to upload image. Please try again.');
        setWizardError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setWizardLoading(false);
      }
    }
  };

  const removeWizardImage = (fieldName) => {
    setWizardFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
    const previewKey = fieldName === 'driverLicenseFront' ? 'driverLicenseFront' : 'driverLicenseBack';
    if (wizardImagePreviews[previewKey]) {
      URL.revokeObjectURL(wizardImagePreviews[previewKey]);
    }
    setWizardImagePreviews(prev => ({
      ...prev,
      [previewKey]: null
    }));
  };

  const handleDeleteWizardImage = async (side) => {
    const customerId = wizardFormData.customerId || user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';
    
    const isServerImage = side === 'front' ? uploadedLicenseImages.front : uploadedLicenseImages.back;
    const isLocalPreview = side === 'front' ? wizardImagePreviews.driverLicenseFront : wizardImagePreviews.driverLicenseBack;
    
    try {
      if (isServerImage && customerId) {
        await apiService.deleteCustomerLicenseImage(customerId, side);
        
        try {
          const channel = new BroadcastChannel('license_images_channel');
          channel.postMessage({ type: 'licenseImageDeleted', side, customerId });
          channel.close();
        } catch (e) {
          console.log('BroadcastChannel not available:', e);
        }
        
        setUploadedLicenseImages(prev => ({
          ...prev,
          [side]: null
        }));
        
        toast.success(
          side === 'front'
            ? t('bookPage.frontPhotoDeleted', 'Front photo deleted successfully')
            : t('bookPage.backPhotoDeleted', 'Back photo deleted successfully')
        );
      } else if (isLocalPreview) {
        const fieldName = side === 'front' ? 'driverLicenseFront' : 'driverLicenseBack';
        removeWizardImage(fieldName);
      }
    } catch (err) {
      console.error(`Error deleting ${side} image:`, err);
      const errorMessage = err.response?.data?.message || err.response?.data?.result?.message || err.message || t('bookPage.deleteError', 'Failed to delete image. Please try again.');
      toast.error(errorMessage);
    }
  };

  const handleWizardNext = async () => {
    if (wizardStep === 2) {
      // Validate personal information
      if (!wizardFormData.firstName.trim()) {
        setWizardError(t('bookPage.firstNameRequired', 'First Name is required'));
        return;
      }
      if (!wizardFormData.lastName.trim()) {
        setWizardError(t('bookPage.lastNameRequired', 'Last Name is required'));
        return;
      }
      if (!wizardFormData.email.trim()) {
        setWizardError(t('bookPage.emailRequired', 'Email is required'));
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(wizardFormData.email)) {
        setWizardError(t('bookPage.invalidEmail', 'Please enter a valid email address'));
        return;
      }
      if (!wizardFormData.phoneNumber.trim()) {
        setWizardError(t('bookPage.phoneRequired', 'Phone Number is required'));
        return;
      }
      if (!wizardFormData.password) {
        setWizardError(t('bookPage.passwordRequired', 'Password is required'));
        return;
      }
      if (wizardFormData.password !== wizardFormData.confirmPassword) {
        setWizardError(t('bookPage.passwordMismatch', 'Passwords do not match'));
        return;
      }

      // Authenticate/Register user at this step
      try {
        setWizardLoading(true);
        setWizardError('');

        const email = wizardFormData.email.trim().toLowerCase();
        
        // Check if customer with this email already exists
        // Skip check if email matches initialEmail (already checked in auth modal, customer doesn't exist)
        let existingCustomer = null;
        if (initialEmail && email === initialEmail.toLowerCase()) {
          // Email was already checked in auth modal and customer doesn't exist (404)
          // Skip duplicate API call
          existingCustomer = null;
        } else {
          try {
            existingCustomer = await apiService.getCustomerByEmail(email);
          } catch (error) {
            if (error.response?.status !== 404) {
              console.error('Error checking for existing customer:', error);
            }
          }
        }

        let userData = null;
        let customerId = '';

        if (existingCustomer) {
          // Customer already exists - verify password and update info
          try {
            const loginResponse = await loginUser({
              email: email,
              password: wizardFormData.password
            });
            
            userData = loginResponse?.result?.user || loginResponse?.user || loginResponse?.data || null;
            if (!userData) {
              throw new Error('Login failed - invalid credentials');
            }
            
            customerId = userData?.customerId || userData?.id || userData?.userId || userData?.Id || userData?.UserId || userData?.sub || userData?.nameidentifier || '';
            
            if (customerId) {
              try {
                await apiService.updateCustomer(customerId, {
                  firstName: wizardFormData.firstName.trim(),
                  lastName: wizardFormData.lastName.trim(),
                  phoneNumber: wizardFormData.phoneNumber.trim()
                });
              } catch (updateError) {
                console.error('Error updating customer info:', updateError);
              }
            }
          } catch (loginError) {
            setWizardError(t('bookPage.wrongPassword', 'Wrong Password'));
            setWizardLoading(false);
            return;
          }
        } else {
          // Customer doesn't exist - register new account
          const registerResponse = await registerUser({
            email: email,
            password: wizardFormData.password,
            firstName: wizardFormData.firstName.trim(),
            lastName: wizardFormData.lastName.trim()
          });

          userData = registerResponse?.result?.user || registerResponse?.user || null;
          if (!userData) {
            throw new Error('Register response missing user data');
          }

          customerId = userData?.customerId || userData?.id || userData?.userId || userData?.Id || userData?.UserId || userData?.sub || userData?.nameidentifier || '';
          
          if (customerId) {
            try {
              await apiService.updateCustomer(customerId, {
                phoneNumber: wizardFormData.phoneNumber.trim()
              });
            } catch (updateError) {
              console.error('Error updating customer phone:', updateError);
            }
          }
        }

        if (customerId) {
          setWizardFormData(prev => ({
            ...prev,
            customerId: customerId
          }));
        }

        setWizardStep(3);
        setWizardError('');
      } catch (error) {
        setWizardError(error.response?.data?.message || error.message || t('auth.registrationFailed') || 'Unable to process account.');
      } finally {
        setWizardLoading(false);
      }
      return;
    }
    
    if (wizardStep === 3) {
      // Validate driver license images
      if (!wizardFormData.driverLicenseFront && !uploadedLicenseImages.front) {
        setWizardError(t('bookPage.driverLicenseFrontRequired', 'Driver License Front Image is required'));
        return;
      }
      if (!wizardFormData.driverLicenseBack && !uploadedLicenseImages.back) {
        setWizardError(t('bookPage.driverLicenseBackRequired', 'Driver License Back Image is required'));
        return;
      }
      
      // Upload any local files that haven't been uploaded yet
      const customerId = wizardFormData.customerId || user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';
      
      if (!customerId) {
        setWizardError(t('bookPage.mustCompletePersonalInfo', 'Please complete personal information first'));
        return;
      }
      
      try {
        setWizardLoading(true);
        setWizardError('');
        
        // Upload front image if it's a local file (not already uploaded)
        if (wizardFormData.driverLicenseFront && !uploadedLicenseImages.front) {
          console.log('[BookingWizard] handleWizardNext - Uploading front image on Next click');
          const frontFile = wizardFormData.driverLicenseFront;
          const frontResponse = await apiService.uploadCustomerLicenseImage(customerId, 'front', frontFile);
          console.log('[BookingWizard] handleWizardNext - Front upload response:', frontResponse);
          
          const frontImageUrl = frontResponse?.data?.imageUrl || frontResponse?.data?.result?.imageUrl;
          console.log('[BookingWizard] handleWizardNext - Front image URL:', frontImageUrl);
          
          if (frontImageUrl) {
            // Backend returns path like /customers/.../licenses/front.png
            // Convert to full frontend URL
            const frontendBaseUrl = window.location.origin;
            const fullFrontImageUrl = `${frontendBaseUrl}${frontImageUrl}`;
            
            console.log('[BookingWizard] handleWizardNext - Full front image URL (frontend):', fullFrontImageUrl);
            console.log('[BookingWizard] handleWizardNext - Setting front image in state');
            
            setUploadedLicenseImages(prev => {
              const newState = { ...prev, front: fullFrontImageUrl };
              console.log('[BookingWizard] handleWizardNext - Updated state:', newState);
              return newState;
            });
            
            // Clean up local file and preview
            if (wizardImagePreviews.driverLicenseFront) {
              URL.revokeObjectURL(wizardImagePreviews.driverLicenseFront);
            }
            setWizardFormData(prev => ({
              ...prev,
              driverLicenseFront: null
            }));
            setWizardImagePreviews(prev => ({
              ...prev,
              driverLicenseFront: null
            }));
            
            // Clear cache
            if (dlImageCheckCache) {
              dlImageCheckCache.current?.delete(customerId);
            }
            
            // Trigger refresh event for other tabs
            try {
              const channel = new BroadcastChannel('license_images_channel');
              channel.postMessage({ type: 'licenseImageUploaded', side: 'front', customerId, imageUrl: fullFrontImageUrl });
              channel.close();
            } catch (e) {
              console.log('BroadcastChannel not available:', e);
            }
            
            try {
              localStorage.setItem('licenseImagesUploaded', Date.now().toString());
            } catch (e) {
              console.log('localStorage not available:', e);
            }
          }
        }
        
        // Upload back image if it's a local file (not already uploaded)
        if (wizardFormData.driverLicenseBack && !uploadedLicenseImages.back) {
          console.log('[BookingWizard] handleWizardNext - Uploading back image on Next click');
          const backFile = wizardFormData.driverLicenseBack;
          const backResponse = await apiService.uploadCustomerLicenseImage(customerId, 'back', backFile);
          console.log('[BookingWizard] handleWizardNext - Back upload response:', backResponse);
          
          const backImageUrl = backResponse?.data?.imageUrl || backResponse?.data?.result?.imageUrl;
          console.log('[BookingWizard] handleWizardNext - Back image URL:', backImageUrl);
          
          if (backImageUrl) {
            // Backend returns path like /customers/.../licenses/back.png
            // Convert to full frontend URL
            const frontendBaseUrl = window.location.origin;
            const fullBackImageUrl = `${frontendBaseUrl}${backImageUrl}`;
            
            console.log('[BookingWizard] handleWizardNext - Full back image URL (frontend):', fullBackImageUrl);
            console.log('[BookingWizard] handleWizardNext - Setting back image in state');
            
            setUploadedLicenseImages(prev => {
              const newState = { ...prev, back: fullBackImageUrl };
              console.log('[BookingWizard] handleWizardNext - Updated state:', newState);
              return newState;
            });
            
            // Clean up local file and preview
            if (wizardImagePreviews.driverLicenseBack) {
              URL.revokeObjectURL(wizardImagePreviews.driverLicenseBack);
            }
            setWizardFormData(prev => ({
              ...prev,
              driverLicenseBack: null
            }));
            setWizardImagePreviews(prev => ({
              ...prev,
              driverLicenseBack: null
            }));
            
            // Clear cache
            if (dlImageCheckCache) {
              dlImageCheckCache.current?.delete(customerId);
            }
            
            // Trigger refresh event for other tabs
            try {
              const channel = new BroadcastChannel('license_images_channel');
              channel.postMessage({ type: 'licenseImageUploaded', side: 'back', customerId, imageUrl: fullBackImageUrl });
              channel.close();
            } catch (e) {
              console.log('BroadcastChannel not available:', e);
            }
            
            try {
              localStorage.setItem('licenseImagesUploaded', Date.now().toString());
            } catch (e) {
              console.log('localStorage not available:', e);
            }
          }
        }
        
        // After license photos are saved, go to confirmation (skip agreement step)
        setWizardStep(4);
        setWizardError('');
      } catch (error) {
        setWizardError(error.response?.data?.message || error.message || t('bookPage.uploadError', 'Failed to upload images. Please try again.'));
      } finally {
        setWizardLoading(false);
      }
      return;
    } else {
      setWizardStep(wizardStep + 1);
    }
    setWizardError('');
  };

  const handleWizardPrevious = () => {
    setWizardStep(wizardStep - 1);
    setWizardError('');
  };

  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    try {
      setWizardLoading(true);
      setWizardError('');

      const customerId = wizardFormData.customerId || user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';
      
      if (customerId && user) {
        await handleAuthSuccess(user);
      }
      
      // Call onComplete callback first (before closing)
      if (onComplete) {
        onComplete();
      }
      
      // Reset wizard state
      setWizardStep(1);
      setWizardFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        driverLicenseFront: null,
        driverLicenseBack: null,
        customerId: '',
      });
      
      // Clean up image previews
      if (wizardImagePreviews.driverLicenseFront) {
        URL.revokeObjectURL(wizardImagePreviews.driverLicenseFront);
      }
      if (wizardImagePreviews.driverLicenseBack) {
        URL.revokeObjectURL(wizardImagePreviews.driverLicenseBack);
      }
      setWizardImagePreviews({
        driverLicenseFront: null,
        driverLicenseBack: null,
      });
      
      // Don't clear uploadedLicenseImages on successful completion - they're needed for proceedToCheckout
      // The images will be cleared when the booking is completed or wizard is cancelled
      
      // Close the wizard after successful completion
      if (onClose) {
        onClose();
      }
    } catch (error) {
      setWizardError(error.response?.data?.message || error.message || t('bookPage.wizardError', 'An error occurred. Please try again.'));
    } finally {
      setWizardLoading(false);
    }
  };

  const handleCloseWizard = () => {
    if (wizardLoading) return;
    setWizardStep(1);
    setWizardError('');
    setShowWizardQRCode(false);
    setWizardFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      driverLicenseFront: null,
      driverLicenseBack: null,
      customerId: '',
    });
    // Clean up image previews
    if (wizardImagePreviews.driverLicenseFront) {
      URL.revokeObjectURL(wizardImagePreviews.driverLicenseFront);
    }
    if (wizardImagePreviews.driverLicenseBack) {
      URL.revokeObjectURL(wizardImagePreviews.driverLicenseBack);
    }
    setWizardImagePreviews({
      driverLicenseFront: null,
      driverLicenseBack: null,
    });
    if (onClose) {
      onClose();
    }
  };

  const handleShowWizardQRCode = () => {
    const origin = window.location.origin;
    const wizardId = `wizard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const customerId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';
    
    // Store wizard form data temporarily in sessionStorage for mobile page to retrieve
    const wizardData = {
      wizardId,
      customerId,
      email: wizardFormData.email,
      firstName: wizardFormData.firstName,
      lastName: wizardFormData.lastName,
    };
    sessionStorage.setItem(`wizardData-${wizardId}`, JSON.stringify(wizardData));
    
    const returnTo = window.location.pathname + window.location.search;
    const url = `${origin}/scan-native?wizardId=${encodeURIComponent(wizardId)}&returnTo=${encodeURIComponent(returnTo)}`;
    
    setWizardQRUrl(url);
    setShowWizardQRCode(true);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Wizard Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/50" onClick={handleCloseWizard} />
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <button
            type="button"
            onClick={handleCloseWizard}
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            disabled={wizardLoading}
            title={t('common.close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Progress Indicator */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      wizardStep === step 
                        ? 'bg-blue-600 text-white' 
                        : wizardStep > step 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {wizardStep > step ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        step
                      )}
                    </div>
                    <span className="mt-2 text-xs text-gray-600">
                      {step === 1 ? t('bookPage.wizardStep1', 'Welcome') :
                       step === 2 ? t('bookPage.wizardStep2', 'Personal Info') :
                       step === 3 ? t('bookPage.wizardStep3', 'License Photos') :
                       t('bookPage.wizardStep4', 'Confirm')}
                    </span>
                  </div>
                  {step < 4 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      wizardStep > step ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleWizardSubmit} className="p-6">
            {wizardError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {wizardError}
              </div>
            )}

            {/* Step 1: Welcome */}
            {wizardStep === 1 && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <UserPlus className="h-16 w-16 text-blue-600 mx-auto" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t('bookPage.wizardWelcome', 'Welcome!')}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t('bookPage.wizardWelcomeText', 'Thank you for choosing our service. We\'re excited to have you on board!')}
                </p>
                <p className="text-gray-700 mb-6">
                  {t('bookPage.wizardWelcomeInstruction', 'Before you start, please prepare your driver\'s license. You\'ll need to take photos of both the front and back sides.')}
                </p>
                <div className="space-y-3 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-3 text-gray-700">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t('bookPage.wizardCheck1', 'Have your driver\'s license ready')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t('bookPage.wizardCheck2', 'Ensure good lighting for photos')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t('bookPage.wizardCheck3', 'This will only take 2-3 minutes')}</span>
                  </div>
                </div>
                <div className="flex gap-3 justify-center mt-8">
                  <button
                    type="button"
                    onClick={handleCloseWizard}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    disabled={wizardLoading}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleWizardNext}
                    className="btn-primary px-8 py-3 flex items-center gap-2"
                    disabled={wizardLoading}
                  >
                    {t('bookPage.getStarted', 'Get Started')}
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {t('bookPage.personalInformation', 'Personal Information')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('bookPage.firstName', 'First Name')} *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={wizardFormData.firstName}
                      onChange={handleWizardInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('bookPage.lastName', 'Last Name')} *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={wizardFormData.lastName}
                      onChange={handleWizardInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('bookPage.phoneNumber', 'Phone Number')} *
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={wizardFormData.phoneNumber}
                      onChange={handleWizardInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(123) 456-7890"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('bookPage.email', 'Email')} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={wizardFormData.email}
                      onChange={handleWizardInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('bookPage.password', 'Password')} *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={wizardFormData.password}
                    onChange={handleWizardInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('bookPage.confirmPassword', 'Confirm Password')} *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={wizardFormData.confirmPassword}
                    onChange={handleWizardInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleWizardPrevious}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={wizardLoading}
                  >
                    <ArrowLeft className="h-4 w-4 inline mr-2" />
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    type="button"
                    onClick={handleWizardNext}
                    className="flex-1 btn-primary py-2"
                    disabled={wizardLoading}
                  >
                    {t('common.next', 'Next')}
                    <ArrowRight className="h-4 w-4 inline ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Driver License Photos */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('bookPage.driverLicensePhotos', 'Driver License Photos')}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {isMobile 
                    ? t('bookPage.driverLicensePhotosHelper', 'Please upload clear photos of both sides of your driver\'s license')
                    : t('bookPage.driverLicensePhotosHelperDesktop', 'Use your phone to take photos. Scan the QR code below or use the button to upload from your computer.')
                  }
                </p>

                {/* Always display existing images on step 3 if they exist */}
                {(uploadedLicenseImages.front || uploadedLicenseImages.back || wizardImagePreviews.driverLicenseFront || wizardImagePreviews.driverLicenseBack) && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-800 mb-3">
                      {t('bookPage.uploadedImages', 'Uploaded Images')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Always show front image if it exists AND loads successfully */}
                      {(uploadedLicenseImages.front || wizardImagePreviews.driverLicenseFront) ? (
                        <div>
                          <label className="block text-xs font-medium text-green-700 mb-2">
                            {t('bookPage.driverLicenseFront', 'Driver License Front')} ({t('bookPage.uploaded', 'Uploaded')})
                          </label>
                          <div className="relative">
                            <img 
                              src={uploadedLicenseImages.front || wizardImagePreviews.driverLicenseFront} 
                              alt="Uploaded driver license front" 
                              className="w-full h-48 object-contain rounded-lg border-2 border-green-500 bg-gray-50"
                              onLoad={() => {
                                console.log('[BookingWizard] ✅ Front image loaded successfully:', uploadedLicenseImages.front || wizardImagePreviews.driverLicenseFront);
                              }}
                              onError={(e) => {
                                const failedUrl = uploadedLicenseImages.front || wizardImagePreviews.driverLicenseFront;
                                console.error('[BookingWizard] ❌ Front image failed to load:', failedUrl);
                                console.error('[BookingWizard] Image error details:', e);
                                setUploadedLicenseImages(prev => ({ ...prev, front: null }));
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              ✓ {t('bookPage.uploaded', 'Uploaded')}
                            </div>
                            <button
                              onClick={() => handleDeleteWizardImage('front')}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                              title={t('bookPage.deletePhoto', 'Delete photo')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {/* Always show back image if it exists AND loads successfully */}
                      {(uploadedLicenseImages.back || wizardImagePreviews.driverLicenseBack) ? (
                        <div>
                          <label className="block text-xs font-medium text-green-700 mb-2">
                            {t('bookPage.driverLicenseBack', 'Driver License Back')} ({t('bookPage.uploaded', 'Uploaded')})
                          </label>
                          <div className="relative">
                            <img 
                              src={uploadedLicenseImages.back || wizardImagePreviews.driverLicenseBack} 
                              alt="Uploaded driver license back" 
                              className="w-full h-48 object-contain rounded-lg border-2 border-green-500 bg-gray-50"
                              onLoad={() => {
                              }}
                              onError={(e) => {
                                const failedUrl = uploadedLicenseImages.back || wizardImagePreviews.driverLicenseBack;
                                console.error('[BookingWizard] ❌ Back image failed to load:', failedUrl);
                                console.error('[BookingWizard] Image error details:', e);
                                setUploadedLicenseImages(prev => ({ ...prev, back: null }));
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              ✓ {t('bookPage.uploaded', 'Uploaded')}
                            </div>
                            <button
                              onClick={() => handleDeleteWizardImage('back')}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                              title={t('bookPage.deletePhoto', 'Delete photo')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* File inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!(uploadedLicenseImages.front || wizardImagePreviews.driverLicenseFront) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookPage.driverLicenseFront', 'Driver License Front')} *
                      </label>
                      <label className={`block w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 flex items-center justify-center ${!isMobile ? 'bg-gray-50' : ''}`}>
                        <input
                          type="file"
                          accept="image/*"
                          capture={isMobile ? "environment" : undefined}
                          onChange={(e) => handleWizardFileChange(e, 'driverLicenseFront')}
                          className="hidden"
                        />
                        <div className="text-center">
                          {isMobile ? (
                            <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          ) : (
                            <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          )}
                          <span className="text-sm text-gray-600">{isMobile ? t('bookPage.takePhoto', 'Take Photo') : t('bookPage.chooseFile', 'Choose File')}</span>
                        </div>
                      </label>
                    </div>
                  )}

                  {!(uploadedLicenseImages.back || wizardImagePreviews.driverLicenseBack) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookPage.driverLicenseBack', 'Driver License Back')} *
                      </label>
                      <label className={`block w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 flex items-center justify-center ${!isMobile ? 'bg-gray-50' : ''}`}>
                        <input
                          type="file"
                          accept="image/*"
                          capture={isMobile ? "environment" : undefined}
                          onChange={(e) => handleWizardFileChange(e, 'driverLicenseBack')}
                          className="hidden"
                        />
                        <div className="text-center">
                          {isMobile ? (
                            <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          ) : (
                            <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          )}
                          <span className="text-sm text-gray-600">{isMobile ? t('bookPage.takePhoto', 'Take Photo') : t('bookPage.chooseFile', 'Choose File')}</span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Desktop QR Code Button */}
                {!isMobile && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <button
                      type="button"
                      onClick={handleShowWizardQRCode}
                      className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                    >
                      <QrCode className="h-5 w-5" />
                      {t('bookPage.usePhoneCamera', 'Use Phone Camera')}
                    </button>
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      {t('bookPage.qrCodeHelper', 'Scan QR code with your phone to take photos with your camera')}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleWizardPrevious}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={wizardLoading}
                  >
                    <ArrowLeft className="h-4 w-4 inline mr-2" />
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    type="button"
                    onClick={handleWizardNext}
                    className="flex-1 btn-primary py-2"
                    disabled={wizardLoading}
                  >
                    {t('common.next', 'Next')}
                    <ArrowRight className="h-4 w-4 inline ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {t('bookPage.confirmRegistration', 'Confirm Your Registration')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('bookPage.confirmRegistrationText', 'Please review your information before submitting.')}
                </p>

                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('bookPage.firstName', 'First Name')}:</span>
                    <p className="text-gray-900">{wizardFormData.firstName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('bookPage.lastName', 'Last Name')}:</span>
                    <p className="text-gray-900">{wizardFormData.lastName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('bookPage.email', 'Email')}:</span>
                    <p className="text-gray-900">{wizardFormData.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('bookPage.phoneNumber', 'Phone Number')}:</span>
                    <p className="text-gray-900">{wizardFormData.phoneNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('bookPage.driverLicenseFront', 'Driver License Front')}:</span>
                    {wizardImagePreviews.driverLicenseFront && (
                      <img 
                        src={wizardImagePreviews.driverLicenseFront} 
                        alt="Driver license front" 
                        className="mt-2 w-32 h-20 object-contain rounded border border-gray-300 bg-gray-50"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('bookPage.driverLicenseBack', 'Driver License Back')}:</span>
                    {wizardImagePreviews.driverLicenseBack && (
                      <img 
                        src={wizardImagePreviews.driverLicenseBack} 
                        alt="Driver license back" 
                        className="mt-2 w-32 h-20 object-contain rounded border border-gray-300 bg-gray-50"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseWizard}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    disabled={wizardLoading}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleWizardPrevious}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={wizardLoading}
                  >
                    <ArrowLeft className="h-4 w-4 inline mr-2" />
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-2"
                    disabled={wizardLoading}
                  >
                    {wizardLoading ? (
                      <>
                        <span className="animate-spin inline-block mr-2">⟳</span>
                        {t('bookPage.creatingAccount', 'Creating Account...')}
                      </>
                    ) : (
                      <>
                        {t('bookPage.submitRegistration', 'Submit Registration')}
                        <Check className="h-4 w-4 inline ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Wizard QR Code Modal */}
      {showWizardQRCode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWizardQRCode(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <button
              type="button"
              onClick={() => setShowWizardQRCode(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('bookPage.scanQRCode', 'Scan QR Code')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('bookPage.scanQRCodeHelper', 'Scan this QR code with your phone to take photos with your camera')}
              </p>
              
              <div className="flex justify-center mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <QRCodeSVG value={wizardQRUrl} size={256} level="M" includeMargin={true} />
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                {t('bookPage.qrCodeNote', 'Open your phone camera and point it at the QR code, or use a QR code scanner app')}
              </p>
              
              <a
                href={wizardQRUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {t('bookPage.openLinkDirectly', 'Or open link directly')}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingWizard;

