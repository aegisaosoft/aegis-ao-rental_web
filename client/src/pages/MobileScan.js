/*
 * Mobile-friendly page to scan Driver License on this device (no QR).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const MobileScan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('ready');
  const [capturedDataUrl, setCapturedDataUrl] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleFile = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setStatus('processing');
      // Show a quick preview
      const previewUrl = URL.createObjectURL(file);
      setCapturedDataUrl(previewUrl);

      // Send to API for validation
      const formData = new FormData();
      formData.append('file', file, 'license.jpg');
      const resp = await fetch('/api/license/validate', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('API validation failed');
      const payload = await resp.json();
      if (payload && payload.data) {
        localStorage.setItem('scannedLicense', JSON.stringify(payload.data));
      }
      localStorage.setItem('scannedLicenseImage', previewUrl);
      toast.success('License validated');
      setStatus('captured');
    } catch (e) {
      console.error(e);
      toast.error('Failed to process');
      setStatus('ready');
    }
  };

  // Start native camera preview (no SDK)
  const startCamera = async () => {
    try {
      setStatus('loading');
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('camera');
    } catch (err) {
      console.error(err);
      setStatus('ready');
      // Fall back to file input
      toast.error('Camera permission denied. Use file capture.');
    }
  };

  // Capture a frame from the video and send to API for validation
  const captureFrame = async () => {
    try {
      if (!videoRef.current) return;
      setStatus('processing');
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      // Convert to Blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

      // Send to API
      const formData = new FormData();
      formData.append('file', blob, 'license.jpg');
      const resp = await fetch('/api/license/validate', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('API validation failed');
      const payload = await resp.json();

      // Save results
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedDataUrl(dataUrl);
      localStorage.setItem('scannedLicenseImage', dataUrl);
      if (payload && payload.data) {
        localStorage.setItem('scannedLicense', JSON.stringify(payload.data));
      }
      stopCamera();
      toast.success('License validated');
      setStatus('captured');
    } catch (e) {
      console.error(e);
      setStatus('camera');
      toast.error('Failed to capture');
    }
  };

  const stopCamera = () => {
    try {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    } catch {}
  };

  useEffect(() => () => stopCamera(), []);

  const continueWithoutCapture = () => {
    stopCamera();
    const from = (location.state && location.state.returnTo) || '/book';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Scan Driver License</h1>
        {(status === 'loading') && <p>Loading...</p>}
        {status === 'ready' && (
          <div>
            <p className="mb-4">Use your phone camera to capture the license.</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="block w-full text-sm"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={startCamera} className="flex-1 bg-blue-600 text-white py-2 rounded-md font-semibold">
                Capture
              </button>
              <button onClick={continueWithoutCapture} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-semibold">
                Continue
              </button>
            </div>
          </div>
        )}
        {status === 'camera' && (
          <div>
            <video ref={videoRef} playsInline autoPlay muted className="w-full rounded mb-3" />
            <div className="flex gap-2">
              <button onClick={captureFrame} className="flex-1 bg-blue-600 text-white py-2 rounded-md font-semibold">Capture</button>
              <button onClick={continueWithoutCapture} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-semibold">Continue</button>
            </div>
          </div>
        )}
        {status === 'captured' && (
          <div>
            {capturedDataUrl ? (
              <img src={capturedDataUrl} alt="Captured license" className="w-full rounded mb-3" />
            ) : null}
            <div className="flex gap-2">
              <button onClick={() => { setStatus('ready'); setCapturedDataUrl(''); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-semibold">Retake</button>
              <button onClick={() => { const from = (location.state && location.state.returnTo) || '/book'; navigate(from, { replace: true }); }} className="flex-1 bg-blue-600 text-white py-2 rounded-md font-semibold">Use Photo</button>
            </div>
          </div>
        )}
        {status === 'processing' && <p>Processing...</p>}
      </div>
    </div>
  );
};

export default MobileScan;


