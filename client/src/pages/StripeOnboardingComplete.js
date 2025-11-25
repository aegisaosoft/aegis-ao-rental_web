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

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useQueryClient } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';

const StripeOnboardingComplete = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState('loading');

  useEffect(() => {
    // Sync Stripe status when returning from onboarding
    const syncStatus = async () => {
      if (companyId) {
        try {
          // Sync account status from Stripe
          await apiService.syncStripeAccountStatus(companyId);
          // Invalidate queries to refresh status
          await queryClient.invalidateQueries(['stripeStatus', companyId]);
          await queryClient.invalidateQueries(['company', companyId]);
          setStatus('success');
        } catch (error) {
          console.error('[StripeOnboardingComplete] Error syncing status:', error);
          // Still show success even if sync fails - the webhook will update it
          setStatus('success');
        }
      }
    };

    syncStatus();

    // Wait a moment to show the success message, then redirect
    const timer = setTimeout(() => {
      // Redirect to admin dashboard (Stripe section is part of AdminDashboard in web app)
      navigate('/admin', { 
        replace: true
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [companyId, navigate, queryClient]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your Stripe account setup.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Onboarding Complete!
            </h2>
            <p className="text-gray-600 mb-6">
              Your Stripe account has been successfully set up. You will be redirected to the dashboard shortly.
            </p>
            <div className="text-sm text-gray-500">
              Redirecting in a few seconds...
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">✕</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Setup Incomplete
            </h2>
            <p className="text-gray-600 mb-6">
              There was an issue completing your Stripe account setup. Please try again or contact support.
            </p>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default StripeOnboardingComplete;

