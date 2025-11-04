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
        
        // Call the API endpoint which will automatically detect company from domain
        const response = await apiService.getCurrentCompanyConfig();
        const config = response.data?.result || response.data;
        
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
        console.error('[CompanyContext] Could not load company configuration:', errorMsg);
        console.error('[CompanyContext] Page URL:', window.location.href);
        console.error('[CompanyContext] API Request URL:', err.config?.url || err.request?.responseURL || 'unknown');
        console.error('[CompanyContext] API Base URL:', err.config?.baseURL || 'unknown');
        console.error('[CompanyContext] Full Request Config:', err.config);
        console.error('[CompanyContext] Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message
        });
        setError(errorMsg || 'Company configuration not available');
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

