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

  // License parsing state
  const [licenseParsingResults, setLicenseParsingResults] = useState({
    data: null,
    confidenceScore: 0,
    success: false,
    method: null,
    isAutoFilled: false,
    error: null
  });
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const [isParsingLicense, setIsParsingLicense] = useState(false);
  const [parsingRetryCount, setParsingRetryCount] = useState(0);

  // Debug useEffect to track component lifecycle
  useEffect(() => {
    console.log('🔥 DEBUG: BookingWizard mounted or props changed', {
      isOpen,
      userExists: !!user,
      hasInitialEmail: !!initialEmail
    });

    return () => {
      console.log('🔥 DEBUG: BookingWizard unmounting or props changing');
    };
  }, [isOpen, user, initialEmail]);

  // Debug useEffect to track isOpen changes specifically
  useEffect(() => {
    console.log('🔥 DEBUG: isOpen changed', {
      isOpen,
      from: !isOpen ? 'open' : 'closed',
      to: isOpen ? 'open' : 'closed'
    });
  }, [isOpen]);

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
      // Let the server check in fetchImagesForStep2 determine if images actually exist
      
      // If user already exists (authenticated with full profile), start from step 2 (license photos)
      // If user is new (not authenticated or incomplete profile), start from step 1 (welcome/registration)
      if (user && user.id && (user.firstName || user.lastName || user.email)) {
        // Truly existing user with full profile - start from step 2 (license photos)

        setWizardStep(2);
        // Pre-fill user data if available
        const resolvedCustomerId = user.id || user.customerId || user.customer_id;
        setWizardFormData(prev => ({
          ...prev,
          firstName: user.firstName || prev.firstName,
          lastName: user.lastName || prev.lastName,
          email: user.email || initialEmail || prev.email,
          phoneNumber: user.phone || user.phoneNumber || prev.phoneNumber,
          customerId: resolvedCustomerId || prev.customerId
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
          
          // Don't close wizard here - always show images on step 2 if they exist
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
  }, [isOpen, initialEmail, user]); // Remove uploadedLicenseImages dependencies to prevent cycles

  // Fetch and display existing images when on step 2 (license photos)
  // ONLY for truly existing users (not new users in creation process)
  useEffect(() => {
    // Only fetch images for existing users with full profile data
    // New users in creation process should upload images, not fetch them
    if (wizardStep === 2 && user && user.id && (user.firstName || user.lastName || user.email)) {
      const customerId = user.id || user.customerId || user.customer_id;
      if (!customerId) return;
      
      const fetchImagesForStep2 = async () => {
        
        try {
          // Use the new API endpoint to get actual image filenames and URLs
          const response = await apiService.getCustomerLicenseImages(customerId);
          const imageData = response?.data || response;
          
          
          // Construct frontend URLs using window.location.origin (frontend server)
          const frontendBaseUrl = window.location.origin;
          
          let frontUrl = null;
          let backUrl = null;
          
          if (imageData.frontUrl && imageData.front) {
            // Use API endpoint for reliable file serving: /api/Media/customers/.../licenses/file/front.png
            const apiUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.front}`;
            
            // Use API endpoint as it's more reliable (direct file serving)
            frontUrl = `${apiUrl}?t=${Date.now()}`;
          }
          
          if (imageData.backUrl && imageData.back) {
            // Use API endpoint for reliable file serving: /api/Media/customers/.../licenses/file/back.png
            const apiUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.back}`;
            
            // Use API endpoint as it's more reliable (direct file serving)
            backUrl = `${apiUrl}?t=${Date.now()}`;
          }
          
          // Update state with the correct URLs
          if (frontUrl || backUrl) {
            setUploadedLicenseImages(prev => {
              const newState = {
                front: frontUrl || prev.front,
                back: backUrl || prev.back
              };
              return newState;
            });
          } else {
            // No images found - clear state
            setUploadedLicenseImages(prev => {
              if (prev.front || prev.back) {
                return { front: null, back: null };
              }
              return prev;
            });
          }
          
        } catch (error) {
          // On error, don't clear existing state - might be a temporary network issue
        }
      };
      
      fetchImagesForStep2();
      
      // Refresh on focus/visibility or cross-tab signals
      const onFocus = () => fetchImagesForStep2();
      const onRefreshEvent = () => fetchImagesForStep2();
      const onStorage = (e) => {
        if (e.key === 'licenseImagesUploaded') {
          setTimeout(fetchImagesForStep2, 100);
        }
      };
      let channel = null;
      try {
        channel = new BroadcastChannel('license_images_channel');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'licenseImageUploaded') {
            setTimeout(fetchImagesForStep2, 100);
          }
        };
      } catch (e) {
        // BroadcastChannel not available
      }
      window.addEventListener('focus', onFocus);
      window.addEventListener('refreshLicenseImages', onRefreshEvent);
      window.addEventListener('storage', onStorage);
      
      return () => {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('refreshLicenseImages', onRefreshEvent);
        window.removeEventListener('storage', onStorage);
        if (channel) {
          try { channel.close(); } catch {}
        }
      };
    }
  }, [wizardStep, user]); // Remove uploadedLicenseImages dependencies

  // Polling mechanism: when QR code is shown, poll server every 3 seconds for new images
  // This is needed because phone and PC are different devices - localStorage/BroadcastChannel won't work
  useEffect(() => {
    if (!showWizardQRCode) return;
    
    const customerId = user?.id || user?.customerId || user?.customer_id || wizardFormData.customerId;
    if (!customerId) return;
    
    
    const pollForImages = async () => {
      try {
        const response = await apiService.getCustomerLicenseImages(customerId);
        const imageData = response?.data || response;
        
        const frontendBaseUrl = window.location.origin;
        let frontUrl = null;
        let backUrl = null;
        
        if (imageData.frontUrl && imageData.front) {
          const apiUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.front}`;
          frontUrl = `${apiUrl}?t=${Date.now()}`;
        }
        
        if (imageData.backUrl && imageData.back) {
          const apiUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.back}`;
          backUrl = `${apiUrl}?t=${Date.now()}`;
        }
        
        // Only update if we found new images
        if (frontUrl || backUrl) {
          setUploadedLicenseImages(prev => {
            const needsUpdate = 
              (frontUrl && !prev.front) || 
              (backUrl && !prev.back);
            
            if (needsUpdate) {
              return {
                front: frontUrl || prev.front,
                back: backUrl || prev.back
              };
            }
            return prev;
          });
        }
      } catch (error) {
        // Silently ignore polling errors
      }
    };
    
    // Poll immediately and then every 300ms for faster sync
    pollForImages();
    const intervalId = setInterval(pollForImages, 300);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [showWizardQRCode, user, wizardFormData.customerId, setUploadedLicenseImages]);

  // Handlers
  const handleWizardInputChange = (e) => {
    const { name, value } = e.target;
    setWizardFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Remove auto-filled indicator when user manually edits field
    if (autoFilledFields.has(name)) {
      setAutoFilledFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(name);
        return newSet;
      });
    }

    setWizardError('');
  };

  const handleWizardFileChange = async (e, fieldName) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        setWizardError(t('bookPage.invalidImageFile', 'Please upload an image file'));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setWizardError(t('bookPage.fileTooLarge', 'File size must be less than 10MB'));
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
        

        const response = await apiService.uploadCustomerLicenseImage(customerId, side, file);
        
        
        const imageUrl = response?.data?.imageUrl || response?.data?.result?.imageUrl;
        
        
        if (imageUrl) {
          // Check if imageUrl is already a full URL or just a relative path
          let fullImageUrl;
          if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            // Already a full URL (e.g., Azure Blob Storage URL)
            fullImageUrl = `${imageUrl}?t=${Date.now()}`;
          } else {
            // Relative path, add frontend base URL
            const frontendBaseUrl = window.location.origin;
            fullImageUrl = `${frontendBaseUrl}${imageUrl}?t=${Date.now()}`;
          }

          
          setUploadedLicenseImages(prev => {
            const newState = { ...prev, [side]: fullImageUrl };
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
          }

          try {
            localStorage.setItem('licenseImagesUploaded', Date.now().toString());
          } catch (e) {
          }

          if (customerId && dlImageCheckCache) {
            dlImageCheckCache.current?.delete(customerId);
          }

          // If this is back side image, try to parse license data automatically
          if (side === 'back') {
            setIsParsingLicense(true);
            try {
              // Set longer timeout for parsing operation (60 seconds)
              const parseResponse = await apiService.parseDriverLicenseBackSide(file, customerId);
              const parseResult = parseResponse?.data || parseResponse;

              if (parseResult?.success && parseResult?.data) {
                // Store successful parsing results
                setLicenseParsingResults({
                  data: parseResult.data,
                  confidenceScore: parseResult.confidenceScore || 0,
                  success: true,
                  method: 'pdf417_barcode',
                  isAutoFilled: true,
                  error: null
                });

                // Pre-fill form data
                setWizardFormData(prev => {
                  const newFormData = {
                    ...prev,
                    firstName: parseResult.data.firstName || prev.firstName,
                    lastName: parseResult.data.lastName || prev.lastName,
                    dateOfBirth: parseResult.data.dateOfBirth || prev.dateOfBirth,
                    address: parseResult.data.addressLine1 || prev.address,
                    city: parseResult.data.city || prev.city,
                    state: parseResult.data.state || prev.state,
                    postalCode: parseResult.data.zipCode || prev.postalCode
                  };


                  return newFormData;
                });

                // Track auto-filled fields
                const autoFilled = new Set();
                if (parseResult.data.firstName) autoFilled.add('firstName');
                if (parseResult.data.lastName) autoFilled.add('lastName');
                if (parseResult.data.dateOfBirth) autoFilled.add('dateOfBirth');
                if (parseResult.data.addressLine1) autoFilled.add('address');
                if (parseResult.data.city) autoFilled.add('city');
                if (parseResult.data.state) autoFilled.add('state');
                if (parseResult.data.zipCode) autoFilled.add('postalCode');
                setAutoFilledFields(autoFilled);

              } else {
                setLicenseParsingResults({
                  data: null,
                  confidenceScore: 0,
                  success: false,
                  method: 'pdf417_barcode',
                  isAutoFilled: false,
                  error: parseResult?.Error || 'Parsing failed'
                });
              }
            } catch (parseError) {
              setLicenseParsingResults({
                data: null,
                confidenceScore: 0,
                success: false,
                method: 'pdf417_barcode',
                isAutoFilled: false,
                error: parseError.message || 'Network error'
              });
            } finally {
              setIsParsingLicense(false);
            }
          }

        }

        e.target.value = '';
      } catch (err) {
        console.error('License upload error:', {
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

    console.log('🔥 DEBUG: handleDeleteWizardImage START', {
      side,
      customerId,
      wizardStep,
      isOpen,
      userExists: !!user,
      uploadedLicenseImages: { front: !!uploadedLicenseImages.front, back: !!uploadedLicenseImages.back }
    });

    const isServerImage = side === 'front' ? uploadedLicenseImages.front : uploadedLicenseImages.back;
    const isLocalPreview = side === 'front' ? wizardImagePreviews.driverLicenseFront : wizardImagePreviews.driverLicenseBack;

    console.log('🔥 DEBUG: Image source detection', {
      side,
      isServerImage: !!isServerImage,
      isLocalPreview: !!isLocalPreview,
      customerId: !!customerId,
      serverImageUrl: isServerImage || 'null',
      localPreviewUrl: isLocalPreview ? 'has preview' : 'null',
      uploadedLicenseImages,
      wizardImagePreviews: {
        front: !!wizardImagePreviews.driverLicenseFront,
        back: !!wizardImagePreviews.driverLicenseBack
      }
    });

    try {
      // Always clear local preview first to ensure immediate UI feedback
      if (isLocalPreview) {
        console.log('🔥 DEBUG: Clearing local preview', { side });
        const fieldName = side === 'front' ? 'driverLicenseFront' : 'driverLicenseBack';
        removeWizardImage(fieldName);
      }

      // Then delete from server if it exists
      if (isServerImage && customerId) {
        console.log('🔥 DEBUG: Calling API to delete server image', { side, customerId });
        await apiService.deleteCustomerLicenseImage(customerId, side);
        console.log('🔥 DEBUG: API delete successful');

        try {
          const channel = new BroadcastChannel('license_images_channel');
          channel.postMessage({ type: 'licenseImageDeleted', side, customerId });
          channel.close();
          console.log('🔥 DEBUG: BroadcastChannel message sent', { type: 'licenseImageDeleted', side, customerId });
        } catch (e) {
          console.log('🔥 DEBUG: BroadcastChannel failed', e);
        }

        console.log('🔥 DEBUG: Updating uploadedLicenseImages state - BEFORE', uploadedLicenseImages);
        setUploadedLicenseImages(prev => {
          const newState = {
            ...prev,
            [side]: null
          };
          console.log('🔥 DEBUG: Updating uploadedLicenseImages state - AFTER', newState);
          return newState;
        });
        console.log('🔥 DEBUG: State update queued');
      }

      // If neither exists, log for debugging
      if (!isLocalPreview && !isServerImage) {
        console.log('🔥 DEBUG: No image to delete', { isServerImage, isLocalPreview, customerId });
      }

      console.log('🔥 DEBUG: handleDeleteWizardImage COMPLETED successfully');
    } catch (err) {
      console.log('🔥 DEBUG: handleDeleteWizardImage ERROR', {
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      const errorMessage = err.response?.data?.message || err.response?.data?.result?.message || err.message || t('bookPage.deleteError', 'Failed to delete image. Please try again.');
      toast.error(errorMessage);
    }
  };

  const handleWizardNext = async () => {
    if (wizardStep === 1) {
      // Step 1: Create temporary customer for new users to enable license upload
      if (!user || !user.id) {
        setWizardLoading(true);

        // Declare variables in outer scope for error handling
        const tempEmail = wizardFormData.email || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@placeholder.local`;
        const tempPassword = `Temp${Date.now()}!`; // Known temporary password

        try {
          const tempCustomerData = {
            firstName: 'Temporary',
            lastName: 'Customer',
            email: tempEmail,
            phoneNumber: '0000000000',
            password: tempPassword, // Set known temporary password
            isTemporary: true
          };


          const customerResponse = await apiService.createCustomer(tempCustomerData);

          const customerId = customerResponse?.data?.customerId || customerResponse?.data?.id || customerResponse?.data?.customer_id || customerResponse?.id;
          console.log('Customer ID extraction:', {
            'response.data.customerId': customerResponse?.data?.customerId,
            'response.data.id': customerResponse?.data?.id,
            'response.data.customer_id': customerResponse?.data?.customer_id,
            'response.id': customerResponse?.id
          });

          if (customerId) {
            setWizardFormData(prev => ({
              ...prev,
              customerId: customerId,
              email: wizardFormData.email || '', // Preserve any pre-filled email
              tempPassword: tempPassword // Store temporary password for later use
            }));

          } else {
            setWizardError('Failed to create temporary customer - no ID returned.');
            setWizardLoading(false);
            return;
          }

          setWizardLoading(false);
          setWizardStep(2);
          setWizardError('');
          return;
        } catch (error) {
          console.error('Customer registration error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url
          });

          // Check if this is the "Email already registered" error
          if (error.response?.data?.message?.includes('already exists') ||
              error.response?.data?.includes('already exists') ||
              error.message?.includes('already registered')) {
            setWizardError(`Email conflict during user creation: ${tempEmail}. This shouldn't happen if wizard was properly opened.`);
          } else {
            setWizardError(error?.response?.data?.message || error?.message || 'Failed to initialize session. Please try again.');
          }
          setWizardLoading(false);
          return;
        }
      } else {
        // User already exists, proceed directly to license scanning
        setWizardStep(2);
        return;
      }
    }

    if (wizardStep === 3) {
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

        // In booking wizard, always check if customer exists (we created one in step 1)
        try {
          existingCustomer = await apiService.getCustomerByEmail(email);
        } catch (error) {
          if (error.response?.status !== 404) {
          }
        }


        let userData = null;
        let customerId = '';

        if (existingCustomer) {
          // This is the customer we created in step 1 - update with real data and password
          customerId = wizardFormData.customerId || existingCustomer?.id || existingCustomer?.customerId;

          if (customerId) {
            try {
              // First, login with temporary password to get auth token
              const tempPassword = wizardFormData.tempPassword;
              if (!tempPassword) {
                throw new Error('Temporary password not found - please restart the wizard');
              }

              const loginResponse = await loginUser({
                email: email,
                password: tempPassword
              });

              userData = loginResponse?.result?.user || loginResponse?.user || loginResponse?.data || null;
              if (!userData) {
                throw new Error('Login failed with temporary password');
              }

              // Now update customer basic info
              await apiService.updateCustomer(customerId, {
                firstName: wizardFormData.firstName.trim(),
                lastName: wizardFormData.lastName.trim(),
                phoneNumber: wizardFormData.phoneNumber.trim()
              });

              // Then, update password using the profile API (now we're authenticated)
              await apiService.updateProfile({
                currentPassword: tempPassword,
                newPassword: wizardFormData.password
              });

            } catch (updateError) {
              console.error('Customer update error:', {
                message: updateError.message,
                response: updateError.response?.data,
                status: updateError.response?.status,
                url: updateError.config?.url,
                email: email,
                customerId: customerId
              });

              // Check if this is the "Email already registered" error
              if (updateError.response?.data?.message?.includes('already exists') ||
                  updateError.response?.data?.includes('already registered') ||
                  updateError.message?.includes('already registered')) {
                setWizardError(`Email conflict during update: ${email}. Customer ID: ${customerId}`);
              } else {
                setWizardError(`Unable to complete registration: ${updateError.response?.data?.message || updateError.message}`);
              }
              setWizardLoading(false);
              return;
            }
          } else {
            setWizardError('Customer ID not found. Please try again.');
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
            }
          }
        }

        if (customerId) {
          setWizardFormData(prev => ({
            ...prev,
            customerId: customerId
          }));
        }

        setWizardStep(4);
        setWizardError('');
      } catch (error) {
        setWizardError(error.response?.data?.message || error.message || t('auth.registrationFailed') || 'Unable to process account.');
      } finally {
        setWizardLoading(false);
      }
      return;
    }
    
    if (wizardStep === 2) {
      // Get customerId for server check
      const customerId = wizardFormData.customerId || user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';

      // DEBUG: Log customerId sources
      console.log('Customer ID sources:', {
        'wizardFormData.customerId': wizardFormData.customerId,
        'user?.customerId': user?.customerId,
        'user?.id': user?.id,
        'user object': user,
        'final customerId': customerId
      });

      if (!customerId) {
        setWizardError(t('bookPage.mustCompletePersonalInfo', 'Please complete personal information first'));
        return;
      }
      
      try {
        setWizardLoading(true);
        setWizardError('');
        
        // First, check if there are local files to upload
        // Upload front image if it's a local file (not already uploaded)
        if (wizardFormData.driverLicenseFront && !uploadedLicenseImages.front) {
          const frontFile = wizardFormData.driverLicenseFront;
          const frontResponse = await apiService.uploadCustomerLicenseImage(customerId, 'front', frontFile);
          
          const frontImageUrl = frontResponse?.data?.imageUrl || frontResponse?.data?.result?.imageUrl;
          if (frontImageUrl) {
            const frontendBaseUrl = window.location.origin;
            const fullFrontImageUrl = `${frontendBaseUrl}${frontImageUrl}?t=${Date.now()}`;
            setUploadedLicenseImages(prev => ({ ...prev, front: fullFrontImageUrl }));
            
            if (wizardImagePreviews.driverLicenseFront) {
              URL.revokeObjectURL(wizardImagePreviews.driverLicenseFront);
            }
            setWizardFormData(prev => ({ ...prev, driverLicenseFront: null }));
            setWizardImagePreviews(prev => ({ ...prev, driverLicenseFront: null }));
            
            if (dlImageCheckCache) {
              dlImageCheckCache.current?.delete(customerId);
            }
          }
        }
        
        // Upload back image if it's a local file (not already uploaded)
        if (wizardFormData.driverLicenseBack && !uploadedLicenseImages.back) {
          const backFile = wizardFormData.driverLicenseBack;

          // PARSE FIRST - while we still have the local file
          try {
            const parseResponse = await apiService.parseDriverLicenseBackSide(backFile, customerId);
            const parseResult = parseResponse?.data || parseResponse;

            if (parseResult?.success && parseResult?.data) {
              // Store successful parsing results
              setLicenseParsingResults({
                data: parseResult.data,
                confidenceScore: parseResult.confidenceScore || 0,
                success: true,
                method: 'pdf417_barcode',
                isAutoFilled: true,
                error: null
              });

              // Pre-fill form data
              setWizardFormData(prev => ({
                ...prev,
                firstName: parseResult.data.firstName || prev.firstName,
                lastName: parseResult.data.lastName || prev.lastName,
                dateOfBirth: parseResult.data.dateOfBirth || prev.dateOfBirth,
                address: parseResult.data.addressLine1 || prev.address,
                city: parseResult.data.city || prev.city,
                state: parseResult.data.state || prev.state,
                postalCode: parseResult.data.zipCode || prev.postalCode
              }));

              // Track auto-filled fields
              const autoFilled = new Set();
              if (parseResult.data.firstName) autoFilled.add('firstName');
              if (parseResult.data.lastName) autoFilled.add('lastName');
              if (parseResult.data.dateOfBirth) autoFilled.add('dateOfBirth');
              if (parseResult.data.addressLine1) autoFilled.add('address');
              if (parseResult.data.city) autoFilled.add('city');
              if (parseResult.data.state) autoFilled.add('state');
              if (parseResult.data.zipCode) autoFilled.add('postalCode');
              setAutoFilledFields(autoFilled);

            } else {
              setLicenseParsingResults({
                data: null,
                confidenceScore: 0,
                success: false,
                method: 'pdf417_barcode',
                isAutoFilled: false,
                error: parseResult?.Error || 'Parsing failed'
              });
            }
          } catch (parseError) {
            setLicenseParsingResults({
              data: null,
              confidenceScore: 0,
              success: false,
              method: 'pdf417_barcode',
              isAutoFilled: false,
              error: parseError.message || 'Network error'
            });
          }

          // Now upload the file
          const backResponse = await apiService.uploadCustomerLicenseImage(customerId, 'back', backFile);

          const backImageUrl = backResponse?.data?.imageUrl || backResponse?.data?.result?.imageUrl;
          if (backImageUrl) {
            const frontendBaseUrl = window.location.origin;
            const fullBackImageUrl = `${frontendBaseUrl}${backImageUrl}?t=${Date.now()}`;
            setUploadedLicenseImages(prev => ({ ...prev, back: fullBackImageUrl }));

            if (wizardImagePreviews.driverLicenseBack) {
              URL.revokeObjectURL(wizardImagePreviews.driverLicenseBack);
            }
            setWizardFormData(prev => ({ ...prev, driverLicenseBack: null }));
            setWizardImagePreviews(prev => ({ ...prev, driverLicenseBack: null }));

            if (dlImageCheckCache) {
              dlImageCheckCache.current?.delete(customerId);
            }
          }
        }
        
        // NOW CHECK SERVER for actual images (not local state)
        const response = await apiService.getCustomerLicenseImages(customerId);
        const imageData = response?.data || response;
        
        
        const hasFrontOnServer = !!(imageData.front && imageData.frontUrl);
        const hasBackOnServer = !!(imageData.back && imageData.backUrl);
        
        if (!hasFrontOnServer) {
          setWizardError(t('bookPage.driverLicenseFrontRequired', 'Driver License Front Image is required'));
          setWizardLoading(false);
          return;
        }
        
        if (!hasBackOnServer) {
          setWizardError(t('bookPage.driverLicenseBackRequired', 'Driver License Back Image is required'));
          setWizardLoading(false);
          return;
        }
        
        // Update local state with server URLs
        const frontendBaseUrl = window.location.origin;
        if (hasFrontOnServer) {
          const apiUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.front}`;
          setUploadedLicenseImages(prev => ({ ...prev, front: `${apiUrl}?t=${Date.now()}` }));
        }
        if (hasBackOnServer) {
          const apiUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.back}`;
          setUploadedLicenseImages(prev => ({ ...prev, back: `${apiUrl}?t=${Date.now()}` }));
        }
        

        // Skip attemptLicenseParsing since we parse during upload now

        setWizardLoading(false);
        setWizardStep(3);
        return;
        
      } catch (error) {
        setWizardError(error?.response?.data?.message || t('bookPage.uploadError', 'Error uploading images. Please try again.'));
        setWizardLoading(false);
        return;
      }
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

  // Old attemptLicenseParsing function removed - parsing now happens during upload

  const retryLicenseParsing = async () => {
    const customerId = wizardFormData.customerId || user?.customerId || user?.id;
    if (!customerId) return;

    setIsParsingLicense(true);

    try {
      // Try to download the back image from blob storage and re-parse it
      const backImageUrl = uploadedLicenseImages.back;
      if (!backImageUrl) {
        setLicenseParsingResults({
          data: null,
          confidenceScore: 0,
          success: false,
          method: 'pdf417_barcode',
          isAutoFilled: false,
          error: 'No back image found to retry parsing'
        });
        return;
      }

      // Convert image URL to File object for parsing
      const response = await fetch(backImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'back.jpg', { type: 'image/jpeg' });

      const parseResponse = await apiService.parseDriverLicenseBackSide(file, customerId);
      const parseResult = parseResponse?.data || parseResponse;

      if (parseResult?.success && parseResult?.data) {
        // Store successful parsing results
        setLicenseParsingResults({
          data: parseResult.data,
          confidenceScore: parseResult.confidenceScore || 0,
          success: true,
          method: 'pdf417_barcode',
          isAutoFilled: true,
          error: null
        });

        // Pre-fill form data
        setWizardFormData(prev => ({
          ...prev,
          firstName: parseResult.data.firstName || prev.firstName,
          lastName: parseResult.data.lastName || prev.lastName,
          dateOfBirth: parseResult.data.dateOfBirth || prev.dateOfBirth,
          address: parseResult.data.addressLine1 || prev.address,
          city: parseResult.data.city || prev.city,
          state: parseResult.data.state || prev.state,
          postalCode: parseResult.data.zipCode || prev.postalCode
        }));

        // Track auto-filled fields
        const autoFilled = new Set();
        if (parseResult.data.firstName) autoFilled.add('firstName');
        if (parseResult.data.lastName) autoFilled.add('lastName');
        if (parseResult.data.dateOfBirth) autoFilled.add('dateOfBirth');
        if (parseResult.data.addressLine1) autoFilled.add('address');
        if (parseResult.data.city) autoFilled.add('city');
        if (parseResult.data.state) autoFilled.add('state');
        if (parseResult.data.zipCode) autoFilled.add('postalCode');
        setAutoFilledFields(autoFilled);

      } else {
        setLicenseParsingResults({
          data: null,
          confidenceScore: 0,
          success: false,
          method: 'pdf417_barcode',
          isAutoFilled: false,
          error: parseResult?.Error || 'Retry parsing failed'
        });
      }
    } catch (error) {
      setLicenseParsingResults({
        data: null,
        confidenceScore: 0,
        success: false,
        method: 'pdf417_barcode',
        isAutoFilled: false,
        error: error.message || 'Network error during retry'
      });
    } finally {
      setIsParsingLicense(false);
    }
  };

  const handleCloseWizard = () => {
    console.log('🔥 DEBUG: handleCloseWizard called', {
      wizardLoading,
      wizardStep,
      caller: new Error().stack?.split('\n')[1]?.trim() || 'unknown'
    });

    if (wizardLoading) {
      console.log('🔥 DEBUG: handleCloseWizard blocked - wizard loading');
      return;
    }

    console.log('🔥 DEBUG: handleCloseWizard executing - resetting state');

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
    // Reset parsing state
    setLicenseParsingResults({
      data: null,
      confidenceScore: 0,
      success: false,
      method: null,
      isAutoFilled: false,
      error: null
    });
    setAutoFilledFields(new Set());
    setIsParsingLicense(false);
    setParsingRetryCount(0);

    if (onClose) {
      console.log('🔥 DEBUG: Calling onClose callback from handleCloseWizard');
      onClose();
    }
  };

  const handleShowWizardQRCode = async () => {
    if (wizardLoading) return;
    setWizardError('');
    setWizardLoading(true);
    try {
      const origin = window.location.origin;
      
      // Always resolve a real Customers.id by email
      const emailFromState = (wizardFormData.email || '').trim().toLowerCase();
      const emailFromUser = (user?.email || '').trim().toLowerCase();
      const emailToUse = emailFromState || emailFromUser;
      
      if (!emailToUse) {
        setWizardError(t('bookPage.emailRequiredForScan', 'Please enter your email before scanning your driver license.'));
        return;
      }
      
      let resolvedCustomerId = '';
      try {
        const resp = await apiService.getCustomerByEmail(emailToUse);
        const data = resp?.data || resp;
        resolvedCustomerId = data?.id || data?.customerId || data?.CustomerId || '';
      } catch (e) {
        // If customer not found by email, block QR until registration/login is complete
        resolvedCustomerId = '';
      }
      
      if (!resolvedCustomerId) {
        setWizardError(
          t(
            'bookPage.customerNotFoundForEmail',
            'Customer was not found for this email. Please complete registration and login first.'
          )
        );
        return;
      }
      
      // Build QR only with a real Customers.id
      const returnTo = window.location.pathname + window.location.search;
      const url = `${origin}/driver-license-photo?customerId=${encodeURIComponent(resolvedCustomerId)}&returnTo=${encodeURIComponent(returnTo)}`;
      
      setWizardQRUrl(url);
      setShowWizardQRCode(true);
    } finally {
      setWizardLoading(false);
    }
  };

  if (!isOpen) return null;

  // DEBUG: Log current wizard step

  return (
    <>
      {/* Wizard Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/50" />
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
                       step === 2 ? t('bookPage.wizardStep2', 'License Photos') :
                       step === 3 ? t('bookPage.wizardStep3', 'Personal Info') :
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
                  {t('bookPage.wizardWelcomeInstruction', 'In the next step, you\'ll scan your driver\'s license. We\'ll then use this information to help fill out your personal details.')}
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

            {/* Step 3: Personal Information */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t('bookPage.personalInformation', 'Personal Information')}
                  </h3>
                  {licenseParsingResults.success && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      {t('bookPage.licenseDataParsed', 'License data auto-filled')}
                    </div>
                  )}
                </div>

                {/* Parsing status display */}
                {licenseParsingResults.success && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">
                        {t('bookPage.licenseDataExtracted', 'License information automatically extracted')}
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      {t('bookPage.confidenceScore', 'Confidence')}: {Math.round(licenseParsingResults.confidenceScore * 100)}% |
                      {t('bookPage.method', 'Method')}: {licenseParsingResults.method} |
                      <span className="text-blue-600">
                        {t('bookPage.reviewAndEdit', 'Please review and edit as needed')}
                      </span>
                    </div>
                  </div>
                )}

                {!licenseParsingResults.success && !isParsingLicense && wizardStep === 3 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-yellow-800">
                        {licenseParsingResults.error ?
                          t('bookPage.parsingFailed', 'License parsing failed') :
                          t('bookPage.manualEntryRequired', 'Manual entry required')
                        }
                      </span>
                    </div>
                    <div className="text-xs text-yellow-700 mb-3">
                      {licenseParsingResults.error ?
                        `${t('bookPage.parsingErrorDetails', 'Error details')}: ${licenseParsingResults.error}` :
                        t('bookPage.licenseParsingFailed', 'Unable to automatically extract license information. Please fill in your details manually.')
                      }
                    </div>

                    {licenseParsingResults.error && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={retryLicenseParsing}
                          className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                          disabled={isParsingLicense}
                        >
                          {isParsingLicense ? t('bookPage.retrying', 'Retrying...') : t('bookPage.retryParsing', 'Retry Parsing')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          {t('bookPage.retakePhotos', 'Retake Photos')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isParsingLicense && wizardStep === 3 && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-semibold text-blue-800">
                        {parsingRetryCount > 0 ?
                          t('bookPage.retryingParsing', `Retrying license parsing (${parsingRetryCount}/2)...`) :
                          t('bookPage.parsingLicenseData', 'Parsing license data...')
                        }
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      {t('bookPage.pleaseWait', 'Please wait while we extract information from your license images.')}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {t('bookPage.firstName', 'First Name')} *
                      {autoFilledFields.has('firstName') && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          <Check className="h-3 w-3 mr-1" />
                          Auto-filled
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={wizardFormData.firstName}
                      onChange={handleWizardInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        autoFilledFields.has('firstName')
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300'
                      }`}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {t('bookPage.lastName', 'Last Name')} *
                      {autoFilledFields.has('lastName') && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          <Check className="h-3 w-3 mr-1" />
                          Auto-filled
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={wizardFormData.lastName}
                      onChange={handleWizardInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        autoFilledFields.has('lastName')
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {t('bookPage.phoneNumber', 'Phone Number')} *
                      {autoFilledFields.has('phoneNumber') && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          <Check className="h-3 w-3 mr-1" />
                          Auto-filled
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={wizardFormData.phoneNumber}
                      onChange={handleWizardInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        autoFilledFields.has('phoneNumber')
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300'
                      }`}
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

            {/* Step 2: Driver License Photos */}
            {wizardStep === 2 && (
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

                {/* Always display license images grid */}
                <div className={`mb-6 p-4 rounded-lg ${
                  (uploadedLicenseImages.front || uploadedLicenseImages.back || wizardImagePreviews.driverLicenseFront || wizardImagePreviews.driverLicenseBack)
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <h4 className={`text-sm font-semibold mb-3 ${
                    (uploadedLicenseImages.front || uploadedLicenseImages.back || wizardImagePreviews.driverLicenseFront || wizardImagePreviews.driverLicenseBack)
                      ? 'text-green-800'
                      : 'text-gray-800'
                  }`}>
                    {(uploadedLicenseImages.front || uploadedLicenseImages.back || wizardImagePreviews.driverLicenseFront || wizardImagePreviews.driverLicenseBack)
                      ? t('bookPage.uploadedImages', 'Uploaded Images')
                      : t('bookPage.licenseImages', 'Driver License Images')
                    }
                  </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Front image - always in first position (left column) */}
                      <div className="md:col-start-1">
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
                              }}
                              onError={(e) => {
                                setUploadedLicenseImages(prev => ({ ...prev, front: null }));
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              ✓ {t('bookPage.uploaded', 'Uploaded')}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteWizardImage('front')}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                              title={t('bookPage.deletePhoto', 'Delete photo')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                            </div>
                          </div>
                        ) : (
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
                      </div>

                      {/* Back image - always in second position (right column) */}
                      <div className="md:col-start-2">
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
                                setUploadedLicenseImages(prev => ({ ...prev, back: null }));
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              ✓ {t('bookPage.uploaded', 'Uploaded')}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteWizardImage('back')}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                              title={t('bookPage.deletePhoto', 'Delete photo')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                            </div>
                          </div>
                        ) : (
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
                    </div>
                  </div>

                {/* Parsing Status - Show on Step 2 */}
                {uploadedLicenseImages.back && (
                  <>
                    {isParsingLicense && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-semibold text-blue-800">
                            {t('bookPage.parsingLicenseData', 'Parsing license data...')}
                          </span>
                        </div>
                        <div className="text-xs text-blue-700">
                          {t('bookPage.pleaseWait', 'Please wait while we extract information from your license images.')}
                        </div>
                      </div>
                    )}

                    {!isParsingLicense && licenseParsingResults.success && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-800">
                            {t('bookPage.licenseDataExtracted', 'License information automatically extracted')}
                          </span>
                        </div>
                        <div className="text-xs text-green-700">
                          {t('bookPage.confidenceScore', 'Confidence')}: {Math.round(licenseParsingResults.confidenceScore * 100)}% |
                          {t('bookPage.method', 'Method')}: {licenseParsingResults.method} |
                          <span className="text-green-600 ml-1">
                            {t('bookPage.dataWillBePrefilled', 'Data will be pre-filled on next step')}
                          </span>
                        </div>
                      </div>
                    )}

                    {!isParsingLicense && !licenseParsingResults.success && licenseParsingResults.error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-red-800">
                            {t('bookPage.parsingFailed', 'License parsing failed')}
                          </span>
                        </div>
                        <div className="text-xs text-red-700 mb-3">
                          {t('bookPage.parsingErrorDetails', 'Error details')}: {licenseParsingResults.error}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={retryLicenseParsing}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            disabled={isParsingLicense}
                          >
                            {t('bookPage.retryParsing', 'Retry Parsing')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWizardImage('back')}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            {t('bookPage.retakeBackPhoto', 'Retake Back Photo')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}


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
                    disabled={wizardLoading || isParsingLicense}
                  >
                    <ArrowLeft className="h-4 w-4 inline mr-2" />
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    type="button"
                    onClick={handleWizardNext}
                    className="flex-1 btn-primary py-2"
                    disabled={wizardLoading || isParsingLicense}
                  >
                    {wizardLoading || isParsingLicense ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isParsingLicense ? (
                          parsingRetryCount > 0 ?
                            t('bookPage.retryingParse', `Retrying... (${parsingRetryCount}/2)`) :
                            t('bookPage.parsingLicense', 'Parsing License...')
                        ) : t('common.loading', 'Loading...')}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        {t('common.next', 'Next')}
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
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

