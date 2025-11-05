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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import i18n from '../i18n/config';
import { getLanguageForCountry } from '../utils/countryLanguage';

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [companyConfig, setCompanyConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCompanyConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Log the API call details
        const apiBaseUrl = '/api';
        const endpoint = '/companies/config';
        console.log('[CompanyContext] Loading company config from:', `${apiBaseUrl}${endpoint}`);
        console.log('[CompanyContext] Current hostname:', window.location.hostname);
        
        // In development on localhost, proactively load miamilifecars as default
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isDevelopment && isLocalhost) {
          console.log('[CompanyContext] Development mode on localhost: Loading miamilifecars company as default');
          try {
            // Try to get all companies and find miamilifecars
            const companiesResponse = await apiService.getCompanies();
            const companies = companiesResponse.data?.result || companiesResponse.data || [];
            const miamiCompany = Array.isArray(companies) 
              ? companies.find(c => 
                  (c.subdomain && c.subdomain.toLowerCase() === 'miamilifecars') || 
                  (c.companyName && c.companyName.toLowerCase().includes('miami'))
                )
              : null;
            
            if (miamiCompany) {
              console.log('[CompanyContext] Found miamilifecars company, using as default:', miamiCompany.companyName || miamiCompany.CompanyName);
              // Map company data to config format (handle both snake_case and camelCase)
              const config = {
                id: miamiCompany.id || miamiCompany.CompanyId || miamiCompany.companyId,
                companyName: miamiCompany.companyName || miamiCompany.CompanyName || 'Miami Life Cars',
                subdomain: miamiCompany.subdomain || miamiCompany.Subdomain,
                fullDomain: miamiCompany.fullDomain || (miamiCompany.subdomain ? `${miamiCompany.subdomain}.aegis-rental.com` : null) || (miamiCompany.Subdomain ? `${miamiCompany.Subdomain}.aegis-rental.com` : null),
                email: miamiCompany.email || miamiCompany.Email || '',
                logoUrl: miamiCompany.logoUrl || miamiCompany.LogoUrl,
                faviconUrl: miamiCompany.faviconUrl || miamiCompany.FaviconUrl,
                primaryColor: miamiCompany.primaryColor || miamiCompany.PrimaryColor || '#007bff',
                secondaryColor: miamiCompany.secondaryColor || miamiCompany.SecondaryColor || '#6c757d',
                motto: miamiCompany.motto || miamiCompany.Motto,
                mottoDescription: miamiCompany.mottoDescription || miamiCompany.MottoDescription,
                about: miamiCompany.about || miamiCompany.About,
                videoLink: miamiCompany.videoLink || miamiCompany.VideoLink,
                bannerLink: miamiCompany.bannerLink || miamiCompany.BannerLink,
                backgroundLink: miamiCompany.backgroundLink || miamiCompany.BackgroundLink,
                website: miamiCompany.website || miamiCompany.Website,
                customCss: miamiCompany.customCss || miamiCompany.CustomCss,
                country: miamiCompany.country || miamiCompany.Country,
                bookingIntegrated: miamiCompany.bookingIntegrated || miamiCompany.BookingIntegrated || false,
                invitation: miamiCompany.invitation || miamiCompany.Invitation,
                texts: miamiCompany.texts || miamiCompany.Texts,
                language: miamiCompany.language || miamiCompany.Language || 'en',
              };
              
              setCompanyConfig(config);
              applyCompanyStyles(config);
              if (config.companyName) {
                document.title = `${config.companyName} - Premium Car Rental Services`;
              }
              if (config.faviconUrl) {
                updateFavicon(config.faviconUrl);
              }
              setCompanyLanguage(config);
              setLoading(false);
              return;
            } else {
              console.warn('[CompanyContext] Miamilifecars company not found in companies list');
            }
          } catch (fallbackErr) {
            console.error('[CompanyContext] Failed to load miamilifecars fallback:', fallbackErr);
            // Continue to try normal flow
          }
        }
        
        // Call the API endpoint which will automatically detect company from domain
        let response;
        try {
          response = await apiService.getCurrentCompanyConfig();
        } catch (err) {
          // If config fails and we're in development, the fallback above should have handled it
          // But if it didn't, try one more time
          if (isDevelopment && isLocalhost) {
            console.log('[CompanyContext] Config endpoint failed, trying miamilifecars fallback again');
            try {
              const companiesResponse = await apiService.getCompanies();
              const companies = companiesResponse.data?.result || companiesResponse.data || [];
              const miamiCompany = Array.isArray(companies) 
                ? companies.find(c => 
                    (c.subdomain && c.subdomain.toLowerCase() === 'miamilifecars') || 
                    (c.companyName && c.companyName.toLowerCase().includes('miami'))
                  )
                : null;
              
              if (miamiCompany) {
                console.log('[CompanyContext] Found miamilifecars company on error fallback');
                response = { data: miamiCompany };
              } else {
                throw err; // Re-throw original error
              }
            } catch (fallbackErr) {
              console.error('[CompanyContext] Fallback also failed:', fallbackErr);
              throw err; // Re-throw original error
            }
          } else {
            throw err; // Re-throw if not development or not localhost
          }
        }
        
        let config = response.data?.result || response.data;
        
        // If config is empty or has no ID, and we're in development, try miamilifecars
        if ((!config || !config.id) && isDevelopment && isLocalhost) {
          console.log('[CompanyContext] Config empty, trying miamilifecars fallback');
          try {
            const companiesResponse = await apiService.getCompanies();
            const companies = companiesResponse.data?.result || companiesResponse.data || [];
            const miamiCompany = Array.isArray(companies) 
              ? companies.find(c => 
                  (c.subdomain && c.subdomain.toLowerCase() === 'miamilifecars') || 
                  (c.companyName && c.companyName.toLowerCase().includes('miami'))
                )
              : null;
            
            if (miamiCompany) {
              console.log('[CompanyContext] Using miamilifecars as fallback for empty config');
              config = miamiCompany;
            }
          } catch (fallbackErr) {
            console.error('[CompanyContext] Fallback failed:', fallbackErr);
          }
        }
        
        if (config && config.id) {
          console.log('[CompanyContext] Loaded company config:', config.companyName, config.id);
          setCompanyConfig(config);
          
          // Apply company-specific styling
          applyCompanyStyles(config);
          
          // Update document title
          if (config.companyName) {
            document.title = `${config.companyName} - Premium Car Rental Services`;
          }
          
          // Update favicon if available
          if (config.faviconUrl) {
            updateFavicon(config.faviconUrl);
          }
          
          // Set language from company config
          setCompanyLanguage(config);
        } else {
          console.warn('[CompanyContext] No company config returned or invalid response:', config);
          setError('Company configuration not available');
        }
      } catch (err) {
        // If company config is not found, that's okay - app will continue without company-specific branding
        const errorMsg = err.response?.data?.error || err.message;
        const status = err.response?.status;
        
        // 404 (Company not found) is expected and not a critical error - log as warning
        if (status === 404 || err.response?.data?.error === 'COMPANY_NOT_FOUND') {
          console.warn('[CompanyContext] Company configuration not found for this domain. Continuing without company-specific branding.');
          console.warn('[CompanyContext] Hostname:', window.location.hostname);
          // Don't set error state for 404 - app can continue normally
          setError(null);
        } else {
          // For other errors (timeout, 500, etc.), log as error but still continue
          console.error('[CompanyContext] Could not load company configuration:', errorMsg);
          console.error('[CompanyContext] Page URL:', window.location.href);
          console.error('[CompanyContext] API Request URL:', err.config?.url || err.request?.responseURL || 'unknown');
          console.error('[CompanyContext] API Base URL:', err.config?.baseURL || 'unknown');
          console.error('[CompanyContext] Error details:', {
            status: status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            message: err.message
          });
          setError(errorMsg || 'Company configuration not available');
        }
      } finally {
        setLoading(false);
      }
    };

    loadCompanyConfig();
  }, []);

  // Apply company-specific CSS styles
  const applyCompanyStyles = (config) => {
    // Remove existing company style element if it exists
    const existingStyle = document.getElementById('company-custom-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create style element for company-specific CSS
    const styleElement = document.createElement('style');
    styleElement.id = 'company-custom-styles';
    
    let css = '';
    
    // Apply primary color
    if (config.primaryColor) {
      css += `
        :root {
          --company-primary-color: ${config.primaryColor};
          --company-secondary-color: ${config.secondaryColor || '#6c757d'};
        }
        .bg-primary { background-color: ${config.primaryColor} !important; }
        .text-primary { color: ${config.primaryColor} !important; }
        .border-primary { border-color: ${config.primaryColor} !important; }
        button.bg-primary, .btn-primary { background-color: ${config.primaryColor} !important; }
        a.text-primary { color: ${config.primaryColor} !important; }
      `;
    }

    // Apply secondary color
    if (config.secondaryColor) {
      css += `
        .bg-secondary { background-color: ${config.secondaryColor} !important; }
        .text-secondary { color: ${config.secondaryColor} !important; }
      `;
    }

    // Apply custom CSS if provided
    if (config.customCss) {
      css += config.customCss;
    }

    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  };

  // Update favicon
  const updateFavicon = (url) => {
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = url;
    document.getElementsByTagName('head')[0].appendChild(link);
  };

  // Set language from company config
  const setCompanyLanguage = (config) => {
    // Check if user has manually set a language preference
    const hasManualLanguagePreference = localStorage.getItem('languageManuallySet') === 'true';
    
    // If user manually set language, don't override
    if (hasManualLanguagePreference) {
      console.log('[CompanyContext] User has manual language preference, keeping current language');
      return;
    }
    
    let targetLanguage = null;
    
    // Priority 1: Use company's language field if set
    if (config.language) {
      targetLanguage = config.language;
      console.log('[CompanyContext] Using company language:', targetLanguage);
    } 
    // Priority 2: Fallback to country-based language
    else if (config.country) {
      targetLanguage = getLanguageForCountry(config.country);
      if (targetLanguage) {
        console.log('[CompanyContext] Using country-based language:', targetLanguage, 'for country:', config.country);
      }
    }
    
    // Set the language if we found one and it's different from current
    if (targetLanguage) {
      const currentLanguage = i18n.language || localStorage.getItem('i18nextLng') || 'en';
      
      // Special handling for Canada - don't change if already French or English
      if (config.country === 'Canada' && (currentLanguage === 'fr' || currentLanguage === 'en')) {
        console.log('[CompanyContext] Canada detected, keeping current language:', currentLanguage);
        return;
      }
      
      if (currentLanguage !== targetLanguage) {
        console.log('[CompanyContext] Changing language from', currentLanguage, 'to', targetLanguage);
        i18n.changeLanguage(targetLanguage);
      } else {
        console.log('[CompanyContext] Language already set to:', targetLanguage);
      }
    } else {
      console.log('[CompanyContext] No language determined from company config');
    }
  };

  const value = {
    companyConfig,
    loading,
    error,
    // Helper to check if company has booking integration
    hasBookingIntegration: companyConfig?.bookingIntegrated === true,
    // Helper to get company language
    language: companyConfig?.language || 'en',
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

