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

import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';

// Fallback import if named export doesn't work
// import QRCodeSVG from 'qrcode.react';

const QRCodePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { companyConfig } = useCompany();
  const qrRef = useRef(null);
  const [websiteUrl, setWebsiteUrl] = useState('');

  useEffect(() => {
    // Get company website URL
    const url = companyConfig?.website || 
                companyConfig?.Website || 
                window.location.origin;
    
    // Ensure URL has protocol
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = `https://${url}`;
    }
    
    setWebsiteUrl(finalUrl);
  }, [companyConfig]);

  const handleDownload = () => {
    if (!qrRef.current) return;

    // Get the SVG element
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Set canvas size (high resolution for good quality)
          const size = 2000;
          canvas.width = size;
          canvas.height = size;
          
          // Draw white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw QR code
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert to blob and download
          canvas.toBlob((blob) => {
            if (!blob) {
              console.error('Failed to create blob');
              return;
            }
            
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const fileName = `qrcode-${(companyConfig?.companyName || 'company').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            URL.revokeObjectURL(url);
          }, 'image/png', 1.0);
        } catch (error) {
          console.error('Error drawing image:', error);
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = () => {
        console.error('Error loading SVG image');
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('common.back') || 'Back'}</span>
          </button>
        </div>

        {/* QR Code Display */}
        <div className="flex flex-col items-center space-y-6">
          <div 
            ref={qrRef}
            className="bg-white p-8 rounded-lg border-2 border-gray-200"
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              minHeight: '500px',
              minWidth: '500px'
            }}
          >
            {websiteUrl && (
              <QRCodeSVG
                value={websiteUrl}
                size={500}
                level="H"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            )}
          </div>

          {/* Company Info */}
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">
              {companyConfig?.companyName || 'Company Name'}
            </p>
            <p className="text-sm text-gray-600 break-all">
              {websiteUrl}
            </p>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
          >
            <Download className="h-5 w-5" />
            <span>{t('qrCode.download') || 'Download'}</span>
          </button>

          {/* Instructions */}
          <p className="text-sm text-gray-500 text-center max-w-md">
            {t('qrCode.description') || 'Scan this QR code with your phone to visit our website'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;

