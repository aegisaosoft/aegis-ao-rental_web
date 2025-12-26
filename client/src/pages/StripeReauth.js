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

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useAuth } from '../context/AuthContext';

const StripeReauth = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleReauth = async () => {
      // If not authenticated, redirect to login with return URL
      if (!isAuthenticated) {
        const returnUrl = `/companies/${companyId}/stripe/reauth`;
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, { replace: true });
        return;
      }

      try {
        // Get new onboarding link
        const response = await apiService.getStripeOnboardingLink(companyId);
        const onboardingUrl = response?.data?.url || response?.data?.onboardingUrl;
        
        if (onboardingUrl) {
          // Redirect to Stripe onboarding
          window.location.href = onboardingUrl;
        } else {
          setStatus('error');
          setError('Could not get Stripe onboarding URL');
        }
      } catch (err) {
        console.error('[StripeReauth] Error getting onboarding link:', err);
        setStatus('error');
        setError(err.response?.data?.message || 'Failed to continue Stripe setup');
      }
    };

    handleReauth();
  }, [companyId, isAuthenticated, navigate]);

  const handleRetry = () => {
    setStatus('loading');
    setError(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Resuming Setup...
            </h2>
            <p className="text-gray-600">
              Please wait while we redirect you back to Stripe.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">✕</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Unable to Continue
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'There was an issue resuming your Stripe setup.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StripeReauth;
