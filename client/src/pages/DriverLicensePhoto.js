import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiService } from '../services/api';

// Simple camera-only page to capture and upload driver license photos (no BlinkID)
const DriverLicensePhoto = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const wizardId = searchParams.get('wizardId') || '';
  const customerId = searchParams.get('customerId') || '';
  const returnTo = searchParams.get('returnTo') || '/';

  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);

  const canUpload = Boolean(wizardId || customerId);

  const upload = async (side, file) => {
    if (!canUpload) {
      toast.info('Photos captured. Returning to site...');
      setTimeout(() => navigate(returnTo), 800);
      return;
    }
    try {
      if (side === 'front') setIsUploadingFront(true);
      if (side === 'back') setIsUploadingBack(true);

      if (wizardId) {
        await apiService.uploadWizardLicenseImage(wizardId, side, file);
      } else if (customerId) {
        await apiService.uploadCustomerLicenseImage(customerId, side, file);
      }

      toast.success(`${side === 'front' ? 'Front' : 'Back'} photo uploaded`);
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
            {frontPreview ? (
              <img src={frontPreview} alt="Front preview" className="w-full h-full object-cover" />
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
            {backPreview ? (
              <img src={backPreview} alt="Back preview" className="w-full h-full object-cover" />
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

