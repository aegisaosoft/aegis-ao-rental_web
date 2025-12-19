import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiService } from '../services/api';

// Simple camera-only page to capture and upload driver license photos (no BlinkID)
const DriverLicensePhoto = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const customerId = searchParams.get('customerId') || '';
  const returnTo = searchParams.get('returnTo') || '/';

  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [serverFrontUrl, setServerFrontUrl] = useState(null);
  const [serverBackUrl, setServerBackUrl] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const canUpload = Boolean(customerId);

  // Auto-load existing server images on mount (so phone shows what wizard already uploaded)
  useEffect(() => {
    if (customerId) {
      fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const fetchStatus = async () => {
    if (!customerId) {
      toast.info('No customerId in URL. Status check works after login/registration.');
      return;
    }
    try {
      const res = await apiService.getCustomerLicenseImages(customerId);
      const imageData = res?.data || res;
      const origin = window.location.origin;
      let f = null;
      let b = null;

      // Prefer server-provided URLs (usually /customers/.../licenses/*.ext)
      if (imageData?.frontUrl) {
        f = `${origin}${imageData.frontUrl}?t=${Date.now()}`;
      }
      if (imageData?.backUrl) {
        b = `${origin}${imageData.backUrl}?t=${Date.now()}`;
      }

      // Fallback to direct API file endpoint if URLs not provided
      if (!f && imageData?.front) {
        f = `${origin}/api/Media/customers/${customerId}/licenses/file/${imageData.front}?t=${Date.now()}`;
      }
      if (!b && imageData?.back) {
        b = `${origin}/api/Media/customers/${customerId}/licenses/file/${imageData.back}?t=${Date.now()}`;
      }

      setServerFrontUrl(f);
      setServerBackUrl(b);
      setLastChecked(new Date());
      if (!f && !b) {
        toast.info('No server images found yet for this customer.');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to check status');
    }
  };

  const upload = async (side, file) => {
    if (!canUpload) {
      toast.error('Login required. QR must include customerId to upload.');
      return;
    }
    try {
      if (side === 'front') setIsUploadingFront(true);
      if (side === 'back') setIsUploadingBack(true);

      if (customerId) {
        await apiService.uploadCustomerLicenseImage(customerId, side, file);
      }

      toast.success(`${side === 'front' ? 'Front' : 'Back'} photo uploaded`);

      // Notify opener to refresh images
      try {
        const channel = new BroadcastChannel('license_images_channel');
        channel.postMessage({ type: 'licenseImageUploaded', side, customerId: customerId || null });
        channel.close();
      } catch (e) {
        // Ignore if BroadcastChannel unsupported
      }
      try {
        localStorage.setItem('licenseImagesUploaded', Date.now().toString());
      } catch (e) {
        // Ignore storage errors
      }
      try {
        window.dispatchEvent(new Event('refreshLicenseImages'));
      } catch (e) {
        // Ignore
      }

      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Upload failed');
    } finally {
      if (side === 'front') setIsUploadingFront(false);
      if (side === 'back') setIsUploadingBack(false);
    }
  };

  const handleChange = (side) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === 'front') setFrontPreview(url);
    else setBackPreview(url);
    upload(side, file);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-6">
      <h1 className="text-2xl font-semibold mb-6">Take Driver License Photos</h1>

      <div className="w-full max-w-md space-y-6">
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="mb-3 font-medium">Front side</div>
          <div className="aspect-[16/9] bg-gray-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
            {frontPreview || serverFrontUrl ? (
              <img src={frontPreview || serverFrontUrl} alt="Front preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400">No photo yet</span>
            )}
          </div>
          <label className="block">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleChange('front')}
            />
            <span className="inline-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded cursor-pointer">
              {isUploadingFront ? 'Uploading...' : (frontPreview ? 'Retake photo' : 'Capture photo')}
            </span>
          </label>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="mb-3 font-medium">Back side</div>
          <div className="aspect-[16/9] bg-gray-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
            {backPreview || serverBackUrl ? (
              <img src={backPreview || serverBackUrl} alt="Back preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400">No photo yet</span>
            )}
          </div>
          <label className="block">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleChange('back')}
            />
            <span className="inline-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded cursor-pointer">
              {isUploadingBack ? 'Uploading...' : (backPreview ? 'Retake photo' : 'Capture photo')}
            </span>
          </label>
        </div>

        <button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg mt-2"
          onClick={() => navigate(returnTo)}
        >
          Done
        </button>

        <div className="bg-gray-900 rounded-lg p-4 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Server status</div>
            <button
              onClick={fetchStatus}
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-3 py-1.5 rounded"
              disabled={!customerId}
              title={!customerId ? 'Status check requires customerId' : 'Refresh status'}
            >
              {customerId ? 'Refresh' : 'Login required'}
            </button>
          </div>
          {lastChecked && (
            <div className="text-xs text-gray-400">Checked at {lastChecked.toLocaleTimeString()}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-400 mb-1">Front (server)</div>
              <div className="aspect-[16/9] bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                {serverFrontUrl ? (
                  <img src={serverFrontUrl} alt="Front (server)" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500 text-xs">Not found</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Back (server)</div>
              <div className="aspect-[16/9] bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                {serverBackUrl ? (
                  <img src={serverBackUrl} alt="Back (server)" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500 text-xs">Not found</span>
                )}
              </div>
            </div>
          </div>
          {customerId && (
            <div className="text-xs break-all text-gray-500">
              API: /api/Media/customers/{customerId}/licenses
            </div>
          )}
        </div>

        {!canUpload && (
          <p className="text-sm text-gray-400 text-center">
            Tip: Pass either wizardId or customerId in the URL to auto-upload.
          </p>
        )}
      </div>
    </div>
  );
};

export default DriverLicensePhoto;

