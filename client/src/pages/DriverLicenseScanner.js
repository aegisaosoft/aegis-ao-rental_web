import React, { useRef, useState, useEffect } from 'react';

function DriverLicenseScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Разрешите доступ к камере в настройках браузера');
      } else if (err.name === 'NotFoundError') {
        setError('Камера не найдена на устройстве');
      } else {
        setError('Ошибка доступа к камере: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        stopCamera();
        await processWithBlinkID(blob);
      }, 'image/jpeg', 0.95);
    }
  };

  const processWithBlinkID = async (imageBlob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'license.jpg');
      // Use existing validation endpoint
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Ошибка обработки изображения');
      const result = await response.json();
      console.log('Распознанные данные:', result);
      // Optionally navigate or store
      localStorage.setItem('scannedLicense', JSON.stringify(result.data || {}));
      localStorage.setItem('scannedLicenseImage', capturedImage || '');
    } catch (err) {
      console.error('Processing error:', err);
      setError('Ошибка обработки изображения: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: '#000', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        padding: '15px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', textAlign: 'center',
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Сканирование водительского удостоверения</h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.8 }}>Наведите камеру на лицевую сторону прав</p>
      </div>

      {error && (
        <div style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(220, 53, 69, 0.95)', color: 'white', padding: '15px 20px', borderRadius: '8px', zIndex: 1000, maxWidth: '90%', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {isProcessing && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '20px 30px', borderRadius: '12px', zIndex: 1000, textAlign: 'center' }}>
          <div style={{ border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          Обработка изображения...
        </div>
      )}

      {!capturedImage ? (
        <>
          <video ref={videoRef} autoPlay playsInline muted style={{ flex: 1, width: '100%', objectFit: 'cover' }} />
          {isCameraActive && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '85%', maxWidth: '400px', aspectRatio: '1.586', border: '3px solid rgba(255,255,255,0.8)', borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '30px', height: '30px', borderTop: '5px solid #4CAF50', borderLeft: '5px solid #4CAF50', borderRadius: '12px 0 0 0' }} />
              <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '30px', height: '30px', borderTop: '5px solid #4CAF50', borderRight: '5px solid #4CAF50', borderRadius: '0 12px 0 0' }} />
              <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '30px', height: '30px', borderBottom: '5px solid #4CAF50', borderLeft: '5px solid #4CAF50', borderRadius: '0 0 0 12px' }} />
              <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '30px', height: '30px', borderBottom: '5px solid #4CAF50', borderRight: '5px solid #4CAF50', borderRadius: '0 0 12px 0' }} />
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '30px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <button onClick={captureImage} disabled={!isCameraActive} style={{ width: '70px', height: '70px', backgroundColor: 'white', border: '5px solid rgba(76, 175, 80, 0.8)', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 8px rgba(0,0,0,0.3)', opacity: isCameraActive ? 1 : 0.5 }} />
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <img src={capturedImage} alt="Captured License" style={{ flex: 1, width: '100%', objectFit: 'contain', backgroundColor: '#000' }} />
          <div style={{ display: 'flex', gap: '10px', padding: '20px', backgroundColor: '#000' }}>
            <button onClick={() => { URL.revokeObjectURL(capturedImage); setCapturedImage(null); setError(null); startCamera(); }} style={{ flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Переснять
            </button>
            <button onClick={() => { /* keep image; maybe navigate */ }} disabled={isProcessing} style={{ flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', opacity: isProcessing ? 0.6 : 1 }}>
              {isProcessing ? 'Обработка...' : 'Подтвердить'}
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default DriverLicenseScanner;


