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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { LayoutDashboard } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { PageContainer, PageHeader, EmptyState, LoadingSpinner } from '../components/common';
import {
  ReportsSection,
  ViolationsSection,
  VehiclesSection,
  ReservationsSection,
  EmployeesSection,
  AdditionalServicesSection,
  VehicleManagementSection,
  CompanySection,
  MetaSection,
  InstagramCampaignSection,
  DisputesSection,
  TerminalSection,
} from './dashboard';
import { AdminSidebar } from './dashboard/components';

const AdminDashboard = () => {
  const { t: i18nT } = useTranslation();
  const translate = useCallback(
    (key, fallback) => {
      if (!key) return String(fallback ?? '');
      
      try {
        const normalizedKey = key.startsWith('vehicles.') ? key.slice('vehicles.'.length) : key;

        let translation = i18nT(normalizedKey);

        if (!translation || translation === normalizedKey) {
          translation = i18nT(key);
        }

        // Check if translation is invalid
        if (!translation || translation === key || translation === normalizedKey) {
          return String(fallback ?? '');
        }

        // Ensure we always return a string, not an object
        if (typeof translation === 'object' || translation === null) {
          return String(fallback ?? '');
        }

        // Force string conversion
        const result = String(translation);
        
        // Validate the result is actually a string
        if (typeof result !== 'string' || result === '[object Object]') {
          return String(fallback ?? '');
        }

        return result;
      } catch (error) {
        return String(fallback ?? '');
      }
    },
    [i18nT]
  );

  const t = translate;
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isAdmin, isMainAdmin, canAccessDashboard, restoreUser } = useAuth();
  const { companyConfig, isSubdomainAccess } = useCompany();
  const queryClient = useQueryClient();
  
  // Check if company is in USA - violations are only available for USA companies
  const isUSCompany = useMemo(() => {
    const country = (companyConfig?.country || '').toLowerCase();
    return country === 'united states' || country === 'usa' || country === 'us';
  }, [companyConfig?.country]);
  
  // Company ID state - still needed for other sections
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  
  // Editing mode - now only for non-company sections
  const isEditing = false; // Company editing is now internal to CompanySection
  
  // Get initial tab from URL parameter, default to 'company' for activeSection
  const initialTab = searchParams.get('tab') || 'company';
  const [activeSection, setActiveSection] = useState(initialTab); // 'company', 'vehicles', 'reservations', 'additionalServices', 'employees', 'reports', etc.
  
  // Redirect away from violations section if company is not in USA
  useEffect(() => {
    const country = (companyConfig?.country || '').toLowerCase();
    const isUSA = country === 'united states' || country === 'usa' || country === 'us';
    if (activeSection === 'violations' && !isUSA) {
      setActiveSection('company');
    }
  }, [activeSection, companyConfig?.country]);

  // Handle Meta OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaSuccess = params.get('meta_success');
    const metaError = params.get('meta_error');

    if (metaSuccess === 'true') {
      queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
      setActiveSection('meta');
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (metaError) {
      toast.error(metaError);
      setActiveSection('meta');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentCompanyId, queryClient, t]);

  // Handle Stripe Checkout return (success/cancel)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isStripeReturn = urlParams.get('deposit_success') === 'true' || 
                          urlParams.get('deposit_cancelled') === 'true' ||
                          urlParams.get('session_id') !== null; // Stripe Checkout returns session_id
    
    // Also check if we have the stripeRedirect flag
    const wasStripeRedirect = sessionStorage.getItem('stripeRedirect') === 'true';
    
    if (isStripeReturn || wasStripeRedirect) {
      // Clear the flag
      sessionStorage.removeItem('stripeRedirect');
      sessionStorage.removeItem('stripeRedirectTime');
      
      // Always restore user data (including role) after Stripe redirect
      const restoreSession = async () => {
        try {
          // Always get profile to restore user data (including role) in AuthContext
          const profileResponse = await apiService.getProfile();
          const userData = profileResponse.data;
          
          // Restore user data in AuthContext - this ensures role and all user info is current
          if (userData) {
            restoreUser(userData);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            
            // Try to restore from sessionStorage backup
            const storedUserData = sessionStorage.getItem('stripeUserBackup');
            if (storedUserData) {
              try {
                const userData = JSON.parse(storedUserData);
                
                // Try to restore session using stored token if available
                const storedToken = sessionStorage.getItem('stripeTokenBackup');
                if (storedToken) {
                  try {
                    await apiService.setSessionToken(storedToken, userData.companyId, userData.id);
                    // After restoring token, get profile to restore full user data
                    const profileResponse = await apiService.getProfile();
                    restoreUser(profileResponse.data);
                    // Clean up backups
                    sessionStorage.removeItem('stripeUserBackup');
                    sessionStorage.removeItem('stripeTokenBackup');
                    return;
                  } catch (restoreError) {
                  }
                }
              } catch (parseError) {
              }
            }
            
            toast.error(t('admin.sessionExpired', 'Your session expired. Please log in again.'));
            // Redirect to login after a short delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
            return;
          }
        }
      };
      
      restoreSession();
    }
    
    if (urlParams.get('deposit_success') === 'true') {
      const depositBookingId = urlParams.get('booking_id');
      // Clean up URL
      window.history.replaceState({}, '', '/admin-dashboard?tab=reservations');
      // Sync payment from Stripe to ensure deposit status is updated in DB
      // (webhook may not have fired yet)
      if (depositBookingId) {
        apiService.syncPaymentFromStripe(depositBookingId)
          .then(() => {
            queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
          })
          .catch(() => {
            // Even if sync fails, refresh the list (webhook may have handled it)
            queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
          });
      } else {
        setTimeout(() => {
          queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
        }, 1000);
      }
    } else if (urlParams.get('deposit_cancelled') === 'true') {
      toast.warning(t('admin.securityDepositCancelled', 'Security deposit payment was cancelled.'));
      // Clean up URL
      window.history.replaceState({}, '', '/admin-dashboard?tab=reservations');
    }
  }, [t, queryClient, currentCompanyId, restoreUser]);

  // Get company ID - use only from domain context
  const getCompanyId = useCallback(() => {
    // Only use company from domain context
    return companyConfig?.id || null;
  }, [companyConfig]);

  // Initialize and sync with company from domain context
  // Prohibit company switching when accessing via subdomain
  useEffect(() => {
    const companyId = getCompanyId();
    
    // If accessing via subdomain, lock to this company only
    if (isSubdomainAccess && companyId) {
      setCurrentCompanyId(companyId);
    } else {
      // Otherwise allow normal company selection
      setCurrentCompanyId(companyId);
    }
    
    // Invalidate queries when company changes
    if (companyId) {
      queryClient.invalidateQueries(['company']);
      queryClient.invalidateQueries(['vehiclesCount']);
      queryClient.invalidateQueries(['modelsGroupedByCategory']);
    }
  }, [companyConfig?.id, queryClient, getCompanyId, isSubdomainAccess]);

  // Fetch current user's company data
  const { isLoading: isLoadingCompany } = useQuery(
    ['company', currentCompanyId],
    () => apiService.getCompany(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      onError: (error) => {
        toast.error(t('admin.companyLoadFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Fetch Stripe account status - using same pattern as admin app
  useQuery(
    ['stripeStatus', currentCompanyId],
    async () => {
      try {
        // Use EXACT same API function as admin app
        // Admin app uses: api.get(`/companies/${companyId}/stripe/status`)
        const response = await apiService.getStripeAccountStatus(currentCompanyId);
        
        // Match admin app's EXACT unwrapping logic: response.data.result || response.data
        // apiService methods return the axios response, so we need to unwrap it
        const responseData = response?.data || response;
        const statusData = responseData?.result || responseData;
        
        return statusData;
      } catch (error) {
        console.error('Stripe account check error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        // If 401, 404, or 503, the company might not have a Stripe account yet, user lacks permission, or service is unavailable
        // Handle these gracefully without losing auth
        if (error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 503) {
          return {
            stripeAccountId: undefined,
            StripeAccountId: undefined,
            chargesEnabled: false,
            ChargesEnabled: false,
            payoutsEnabled: false,
            PayoutsEnabled: false,
            detailsSubmitted: false,
            DetailsSubmitted: false,
            onboardingCompleted: false,
            OnboardingCompleted: false,
            accountStatus: 'not_started',
            AccountStatus: 'not_started',
            requirementsCurrentlyDue: [],
            RequirementsCurrentlyDue: [],
            requirementsPastDue: [],
            RequirementsPastDue: [],
          };
        }
        
        // Return default status for any other error
        return {
          stripeAccountId: undefined,
          StripeAccountId: undefined,
          chargesEnabled: false,
          ChargesEnabled: false,
          payoutsEnabled: false,
          PayoutsEnabled: false,
          detailsSubmitted: false,
          DetailsSubmitted: false,
          onboardingCompleted: false,
          OnboardingCompleted: false,
          accountStatus: 'not_started',
          AccountStatus: 'not_started',
          requirementsCurrentlyDue: [],
          RequirementsCurrentlyDue: [],
          requirementsPastDue: [],
          RequirementsPastDue: [],
        };
      }
    },
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      retry: false,
      refetchOnWindowFocus: false,
      onError: (error) => {
      },
      // Allow all authenticated users to see status, but backend will enforce admin privileges for actions
    }
  );

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.pleaseLogin')}
          message={t('admin.needLogin')}
        />
      </PageContainer>
    );
  }

  if (!canAccessDashboard) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.accessDenied')}
          message={t('admin.noPermission')}
        />
      </PageContainer>
    );
  }

  if (!currentCompanyId) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.noCompany')}
          message={t('admin.noCompanyMessage')}
        />
      </PageContainer>
    );
  }

  // Company-based access control: Admins and workers can only access their own company
  // Main admins can access all companies
  // Simply don't render dashboard if user is trying to access another company
  const userCompanyId = user?.companyId || user?.CompanyId;
  if (!isMainAdmin && userCompanyId && currentCompanyId && currentCompanyId !== userCompanyId) {
    return null;
  }

  if (isLoadingCompany) {
    return <LoadingSpinner fullScreen text={t('common.loading')} />;
  }

  return (
    <>
    <PageContainer>
      <PageHeader
        title={`${companyConfig?.companyName || 'Company'} Dashboard`}
        subtitle={
          isEditing 
            ? t('admin.editingMode') 
            : `${t('admin.welcome')}, ${user?.firstName}!`
        }
        icon={<LayoutDashboard className="h-8 w-8" />}
      />

      {/* Editing Overlay Notice */}
      {isEditing && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
        </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 font-medium">
                {t('admin.editingInProgress')}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {t('admin.editingNotice')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout (3/12 left, 9/12 right) */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Sidebar - Navigation (3/12 width) */}
        <AdminSidebar
          t={t}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          isAdmin={isAdmin}
          isMainAdmin={isMainAdmin}
          isUSCompany={isUSCompany}
          isEditing={isEditing}
        />

        {/* Right Side - Content (9/12 width) */}
        <div className="col-span-9">
          {/* Company Profile Section */}
          {activeSection === 'company' && (
            <CompanySection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
              canAccessDashboard={canAccessDashboard}
              isAdmin={isAdmin}
              isMainAdmin={isMainAdmin}
              companyConfig={companyConfig}
            />
          )}

          {/* Violations Section - Only show for USA companies */}
          {/* Violations Section - Only show for USA companies */}
          {activeSection === 'violations' && isUSCompany && (
            <ViolationsSection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
              companyConfig={companyConfig}
            />
          )}

          {/* Vehicles Section */}
          {/* Vehicles Section */}
          {activeSection === 'vehicles' && (
            <VehiclesSection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
              canAccessDashboard={canAccessDashboard}
            />
          )}

          {/* Reservations Section */}
          {activeSection === 'reservations' && (
            <ReservationsSection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Employees Section */}
          {activeSection === 'employees' && (
            <EmployeesSection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Additional Services Section */}
          {activeSection === 'additionalServices' && (
            <AdditionalServicesSection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Vehicle Management Section */}
          {activeSection === 'vehicleManagement' && (
            <VehicleManagementSection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
              isAdmin={isAdmin}
              isMainAdmin={isMainAdmin}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsSection t={t} />
          )}

          {/* Meta Integration Section */}
          {activeSection === 'meta' && (
            <MetaSection
              t={t}
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Instagram Campaign Section */}
          {activeSection === 'instagram' && (
            <InstagramCampaignSection
              t={t}
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Disputes Section */}
          {activeSection === 'disputes' && (
            <DisputesSection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Terminal Section */}
          {activeSection === 'terminal' && (
            <TerminalSection
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </div>

    </PageContainer>
    </>
  );
};

export default AdminDashboard;
