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

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../services/api';
import i18n from '../i18n/config';
import { getLanguageForCountry } from '../utils/countryLanguage';
import { formatCurrency, normalizeCurrencyCode, getCurrencySymbol } from '../utils/currency';

const normalizeAiIntegration = (value) => {
  if (!value) return 'claude';
  const normalized = value.toString().trim().toLowerCase();
  return ['free', 'claude', 'premium'].includes(normalized) ? normalized : 'claude';
};

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

        // Check if we're on the main site (no subdomain) - skip API call
        const hostname = window.location.hostname.toLowerCase();
        const parts = hostname.split('.');
        
        // Main site detection:
        // - localhost, 127.0.0.1
        // - aegis-rental.com (2 parts)
        // - www.aegis-rental.com (3 parts but starts with www)
        const isMainSite = hostname === 'localhost' || 
                          hostname === '127.0.0.1' || 
                          (!hostname.includes('.') && !hostname.includes('localhost')) ||
                          (parts.length <= 2 && !hostname.includes('.localhost')) ||
                          (parts.length === 3 && parts[0] === 'www');
        
        if (isMainSite) {
          // Main site - no company config needed, show tenants grid
          setLoading(false);
          setError('Company configuration not available');
          return;
        }

        let response;
        try {
          response = await apiService.getCurrentCompanyConfig();
        } catch (err) {
          setLoading(false);
          setError('Unable to load company configuration');
          return;
        }

        let config = response.data?.result || response.data;

        if (!config || !config.id) {
          setLoading(false);
          setError('Company configuration not available');
          return;
        }

        if (config && config.id) {
          const normalizedConfig = {
            ...config,
            currency: normalizeCurrencyCode(config.currency || config.Currency || 'USD'),
            aiIntegration: normalizeAiIntegration(config.aiIntegration || config.AiIntegration),
            securityDeposit: Number(config.securityDeposit ?? config.SecurityDeposit ?? 1000)
          };
          setCompanyConfig(normalizedConfig);

          applyCompanyStyles(normalizedConfig);

          if (normalizedConfig.companyName) {
            document.title = `${normalizedConfig.companyName} - Premium Car Rental Services`;
          }

          if (normalizedConfig.faviconUrl) {
            updateFavicon(normalizedConfig.faviconUrl);
          }

          setCompanyLanguage(normalizedConfig);
        } else {
          setError('Company configuration not available');
        }
      } catch (err) {
        setError('Failed to load company configuration');
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
      return;
    }

    let targetLanguage = null;

    // Priority 1: Use company's language field if set
    if (config.language) {
      targetLanguage = config.language;
    }
    // Priority 2: Fallback to country-based language
    else if (config.country) {
      const derivedLanguage = getLanguageForCountry(config.country);
      if (derivedLanguage) {
        targetLanguage = derivedLanguage;
      }
    }

    // Set the language if we found one and it's different from current
    if (targetLanguage) {
      const currentLanguage = i18n.language || localStorage.getItem('i18nextLng') || 'en';

      // Special handling for Canada - don't change if already French or English
      if (config.country === 'Canada' && (currentLanguage === 'fr' || currentLanguage === 'en')) {
        return;
      }

      if (currentLanguage !== targetLanguage) {
        i18n.changeLanguage(targetLanguage);
      }
    }
  };

  const currencyCode = useMemo(() => normalizeCurrencyCode(companyConfig?.currency || 'USD'), [companyConfig?.currency]);
  const currencySymbol = useMemo(() => getCurrencySymbol(currencyCode), [currencyCode]);
  const formatPrice = useCallback(
    (amount, options = {}) => {
      const { currency: overrideCurrency, currencyCode: overrideCurrencyCode, ...rest } = options || {};
      const targetCurrency = normalizeCurrencyCode(overrideCurrencyCode || overrideCurrency || currencyCode);
      return formatCurrency(amount, targetCurrency, rest);
    },
    [currencyCode]
  );

  // Get company ID as a global parameter
  const companyId = companyConfig?.id || companyConfig?.companyId || companyConfig?.Id || companyConfig?.CompanyId;

  // Check if accessing via subdomain (not localhost or direct domain)
  const isSubdomainAccess = useMemo(() => {
    const hostname = window.location.hostname;
    const subdomain = companyConfig?.subdomain || companyConfig?.Subdomain;
    
    // If subdomain exists in config and hostname contains it, we're on subdomain
    if (subdomain && hostname.includes(subdomain)) {
      return true;
    }
    
    // If hostname has multiple parts (not just domain.com), it's likely a subdomain
    const parts = hostname.split('.');
    if (parts.length > 2 && !hostname.includes('localhost')) {
      return true;
    }
    
    return false;
  }, [companyConfig]);

  const value = {
    companyConfig,
    loading,
    error,
    currencyCode,
    currencySymbol,
    formatPrice,
    aiIntegration: normalizeAiIntegration(companyConfig?.aiIntegration),
    securityDeposit: companyConfig?.securityDeposit ?? 1000,
    // Helper to check if company has booking integration
    hasBookingIntegration: companyConfig?.bookingIntegrated === true,
    // Helper to get company language
    language: companyConfig?.language || 'en',
    // Global company ID parameter (like subdomain)
    companyId,
    subdomain: companyConfig?.subdomain || companyConfig?.Subdomain,
    // Flag to indicate if user is accessing via company subdomain (prohibit company switching)
    isSubdomainAccess,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

