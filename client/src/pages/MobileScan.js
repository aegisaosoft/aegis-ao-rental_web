/*
 * Mobile-friendly page to upload Driver License image.
 */
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiService } from '../services/api';

const MobileScan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('ready'); // ready, preview, uploading, success
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  // Extract auth token from URL and store it in localStorage
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      // Store the token from the QR code URL
      localStorage.setItem('token', tokenFromUrl);
      console.log('Auth token imported from QR code URL');
      toast.success('Authentication imported from QR code');
    }
  }, [searchParams]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      toast.error('File size must be less than 10MB');
      return;
    }

    // Create preview directly from File object (in memory)
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setStatus('preview');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    // Read file directly from input (already in browser memory)
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      const errorMsg = 'Please select an image first';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setStatus('uploading');
    setError('');

    try {
      // Send file directly from memory (File object)
      await apiService.uploadDriverLicense(file, (progress) => {
        setUploadProgress(progress);
      });

      toast.success('Driver license uploaded successfully!');
      setStatus('success');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate(-1); // Go back to previous page
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      
      // Extract detailed error information
      let errorMessage = 'Failed to upload driver license';
      let errorDetails = '';
      
      if (err.response) {
        // Server responded with error
        const status = err.response.status;
        const data = err.response.data;
        
        errorMessage = data?.message || data?.error || `Server error (${status})`;
        
        // Add status code details
        if (status === 400) {
          errorDetails = 'Bad request - Please check your file and try again';
        } else if (status === 401) {
          const hasAuthHeader = data?.hasAuthHeader;
          errorDetails = hasAuthHeader 
            ? 'Your session has expired. Please log in again.'
            : 'You are not logged in. Please log in and try again.';
        } else if (status === 403) {
          errorDetails = 'Forbidden - You do not have permission to upload';
        } else if (status === 413) {
          errorDetails = 'File too large - Maximum size is 10MB';
        } else if (status === 500) {
          errorDetails = 'Server error - Please try again later';
        } else {
          errorDetails = `HTTP ${status}: ${data?.message || 'Unknown error'}`;
        }
        
        // Include additional error details if available
        if (data?.reason) {
          errorDetails += ` (Reason: ${data.reason})`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'Network error - Unable to connect to server';
        errorDetails = 'Please check your internet connection and try again';
      } else {
        // Error setting up the request
        errorMessage = err.message || 'Failed to upload driver license';
        errorDetails = 'Please check the file and try again';
      }
      
      const fullError = errorDetails ? `${errorMessage}. ${errorDetails}` : errorMessage;
      setError(fullError);
      toast.error(errorMessage);
      setStatus('preview');
    }
  };

  const handleRetake = () => {
    setStatus('ready');
    setImagePreview('');
    setError('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Upload Driver License</h1>

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
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg"
            >
              Open Camera
            </button>
            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {status === 'preview' && (
          <div className="space-y-4">
            {imagePreview && (
              <div className="bg-gray-800 rounded-lg p-4">
                <img
                  src={imagePreview}
                  alt="License preview"
                  className="w-full rounded-lg"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
              >
                Retake
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                Upload
              </button>
            </div>
            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {status === 'uploading' && (
          <div className="space-y-4 text-center">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="mb-4">
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-300">Uploading... {uploadProgress}%</p>
              </div>
            </div>
            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 text-center">
            <div className="bg-green-900 text-green-100 p-6 rounded-lg">
              <p className="text-lg font-bold">✓ Upload Successful!</p>
              <p className="text-sm mt-2">Redirecting back...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileScan;
