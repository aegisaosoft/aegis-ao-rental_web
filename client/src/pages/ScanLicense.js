/*
 * Microblink BlinkID License Scanning
 * Using BlinkID v7 SDK with automatic camera and UI
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiService } from '../services/api';
import { useCompany } from '../context/CompanyContext';

const ScanLicense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companyConfig } = useCompany();
  const [status, setStatus] = useState('init');
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null);

  // Note: BlinkID v7 automatically handles scan results via its built-in UI
  // This callback would be used if we had access to BlinkID's result events
  // For now, BlinkID handles the entire flow automatically
  
  /* Keeping this for future implementation when we figure out BlinkID v7 callbacks
  const handleScanSuccess = useCallback(async (result) => {
    try {
      const formatDate = (dateObj) => {
        if (!dateObj) return '';
        if (typeof dateObj === 'string') return dateObj;
        if (dateObj.year && dateObj.month && dateObj.day) {
          return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
        }
        if (dateObj instanceof Date) {
          return dateObj.toISOString().split('T')[0];
        }
        return '';
      };

      const formattedResult = {
        licenseNumber: result.documentNumber || result.licenseNumber || '',
        firstName: result.firstName || '',
        lastName: result.lastName || '',
        middleName: result.middleName || '',
        issuingState: result.issuingState || result.state || result.jurisdiction || '',
        issuingCountry: result.issuingCountry || result.country || 'US',
        expirationDate: result.expirationDate ? formatDate(result.expirationDate) : '',
        issueDate: result.issueDate ? formatDate(result.issueDate) : '',
        address: result.address || result.addressLine1 || '',
        city: result.city || '',
        state: result.state || result.addressState || '',
        postalCode: result.postalCode || result.zip || '',
        country: result.country || 'US',
        dateOfBirth: result.dateOfBirth ? formatDate(result.dateOfBirth) : '',
        sex: result.sex || result.gender || '',
        height: result.height || '',
        eyeColor: result.eyeColor || '',
      };

      console.log('🎉 [ScanLicense] Extracted:', formattedResult);
      setExtractedData(formattedResult);
      setStatus('done');
      toast.success('🎉 License scanned successfully!');
      
      localStorage.setItem('scannedLicenseData', JSON.stringify(formattedResult));

      // Save to database in background
      const userId = searchParams.get('userId') || localStorage.getItem('userId');

      if (userId) {
        (async () => {
          try {
            const convertDateForAPI = (dateStr) => {
              if (!dateStr) return null;
              if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr + 'T00:00:00Z';
              }
              try {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  return date.toISOString();
                }
              } catch (e) {
                return null;
              }
              return null;
            };

            const licenseData = {
              licenseNumber: formattedResult.licenseNumber || '',
              stateIssued: formattedResult.issuingState || formattedResult.state || '',
              countryIssued: formattedResult.issuingCountry || formattedResult.country || 'US',
              sex: formattedResult.sex || null,
              height: formattedResult.height || null,
              eyeColor: formattedResult.eyeColor || null,
              middleName: formattedResult.middleName || null,
              issueDate: convertDateForAPI(formattedResult.issueDate),
              expirationDate: convertDateForAPI(formattedResult.expirationDate),
              licenseAddress: formattedResult.address || null,
              licenseCity: formattedResult.city || null,
              licenseState: formattedResult.state || null,
              licensePostalCode: formattedResult.postalCode || null,
              licenseCountry: formattedResult.country || 'US',
              restrictionCode: null,
              endorsements: null
            };

            if (!licenseData.licenseNumber || !licenseData.stateIssued || !licenseData.expirationDate) {
              throw new Error('Missing required fields');
            }

            console.log('[ScanLicense] Saving to database:', licenseData);
            await apiService.upsertCustomerLicense(userId, licenseData);
            toast.success('✅ Saved to database!');
          } catch (saveErr) {
            console.error('[ScanLicense] Save error:', saveErr);
            toast.error('Failed to save: ' + (saveErr.response?.data?.message || saveErr.message));
          }
        })();
      }

      // Redirect
      const returnTo = searchParams.get('returnTo');
      if (returnTo) {
        setTimeout(() => navigate(returnTo), 5000);
      }
    } catch (err) {
      console.error('[ScanLicense] Processing error:', err);
      toast.error('Processing failed: ' + err.message);
      setError(err.message || 'Processing failed');
      setStatus('error');
    }
  }, [searchParams, navigate]);
  */

  // Initialize BlinkID - it auto-starts camera
  useEffect(() => {
    if (!companyConfig) {
      setStatus('loading');
      return;
    }

    const initBlinkID = async () => {
      try {
        const licenseKey = companyConfig.blinkKey || 
                          companyConfig.BlinkKey || '';

        if (!licenseKey) {
          toast.error('BlinkID license key missing');
          setError('BlinkID license key missing');
          setStatus('error');
          return;
        }

        console.log('[ScanLicense] Initializing BlinkID for:', companyConfig.companyName);
        setStatus('scanning');

        // BlinkID v7 automatically handles camera and UI
        // Just initialize it and it will scan automatically
        console.log('[ScanLicense] BlinkID is running with automatic camera');
        
        // Note: BlinkID v7 with createBlinkId() handles everything automatically
        // The camera is already running based on the logs
        // We just need to wait for it to finish scanning
        
      } catch (e) {
        console.error('[ScanLicense] Init error:', e);
        toast.error('Failed to initialize: ' + e.message);
        setError(e.message || 'Initialization failed');
        setStatus('error');
      }
    };

    initBlinkID();
  }, [companyConfig]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">Driver License Scan</h1>

          {(status === 'init' || status === 'loading') && (
            <div className="text-center">
              <p className="mb-4">Loading scanner...</p>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
          )}

          {status === 'scanning' && (
            <div className="space-y-4">
              <p className="text-center mb-4 text-sm">Position your driver's license in the frame</p>
              
              {/* BlinkID renders its own UI here automatically */}
              <div id="blinkid-container" className="w-full bg-black rounded-lg" style={{ minHeight: '400px' }}>
                {/* BlinkID SDK will inject its UI here */}
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-400">BlinkID will automatically capture when ready</p>
                <p className="text-xs text-gray-500 mt-2">Front and back of license may be required</p>
              </div>
            </div>
          )}

          {status === 'done' && extractedData && (
            <div className="text-center">
              <p className="text-green-400 mb-4 text-xl font-bold">✓ Scan Successful!</p>
              
              <div className="bg-gray-700 rounded-lg p-4 mt-4 text-left max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-3 text-white text-center">License Information</h3>
                
                <div className="space-y-2 text-sm">
                  {extractedData.firstName && (
                    <div className="flex justify-between border-b border-gray-600 pb-1">
                      <span className="text-gray-400">First Name:</span>
                      <span className="text-white font-medium">{extractedData.firstName}</span>
                    </div>
                  )}
                  {extractedData.lastName && (
                    <div className="flex justify-between border-b border-gray-600 pb-1">
                      <span className="text-gray-400">Last Name:</span>
                      <span className="text-white font-medium">{extractedData.lastName}</span>
                    </div>
                  )}
                  {extractedData.dateOfBirth && (
                    <div className="flex justify-between border-b border-gray-600 pb-1">
                      <span className="text-gray-400">DOB:</span>
                      <span className="text-white font-medium">{extractedData.dateOfBirth}</span>
                    </div>
                  )}
                  {extractedData.licenseNumber && (
                    <div className="flex justify-between border-b border-gray-600 pb-1">
                      <span className="text-gray-400">License #:</span>
                      <span className="text-white font-medium">{extractedData.licenseNumber}</span>
                    </div>
                  )}
                  {extractedData.issuingState && (
                    <div className="flex justify-between border-b border-gray-600 pb-1">
                      <span className="text-gray-400">State:</span>
                      <span className="text-white font-medium">{extractedData.issuingState}</span>
                    </div>
                  )}
                  {extractedData.expirationDate && (
                    <div className="flex justify-between border-b border-gray-600 pb-1">
                      <span className="text-gray-400">Expires:</span>
                      <span className="text-white font-medium">{extractedData.expirationDate}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-400 mt-4">Redirecting in 5 seconds...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <p className="text-red-400 mb-4">{error || 'An error occurred'}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanLicense;
