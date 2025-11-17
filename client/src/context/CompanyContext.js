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

        let response;
        try {
          response = await apiService.getCurrentCompanyConfig();
        } catch (err) {
          console.error('[CompanyContext] Could not load company configuration:', err);
          response = await loadFallbackCompany();
          if (!response) {
            setLoading(false);
            setError('Unable to load company configuration');
            return;
          }
        }

        let config = response.data?.result || response.data;

        if (!config || !config.id) {
          const fallbackResponse = await loadFallbackCompany();
          if (fallbackResponse?.data) {
            config = fallbackResponse.data;
          }
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
        console.error('[CompanyContext] Could not load company configuration:', err);
        setError('Failed to load company configuration');
      } finally {
        setLoading(false);
      }
    };

    const loadFallbackCompany = async () => {
      try {
        const companiesResponse = await apiService.getCompanies();
        const companies = companiesResponse.data?.result || companiesResponse.data || [];
        const fallbackCompany = Array.isArray(companies)
          ? companies.find((c) => {
              const subdomain = (c.subdomain || c.Subdomain || '').toString().toLowerCase();
              const name = (c.companyName || c.CompanyName || '').toString().toLowerCase();
              return subdomain === 'miamilifecars' || name.includes('miami life cars') || name.includes('miamilife');
            })
          : null;

        if (fallbackCompany) {
          return { data: fallbackCompany };
        }
      } catch (fallbackErr) {
        console.error('[CompanyContext] Fallback company load failed:', fallbackErr);
      }

      return {
        data: {
          id: '81ff1053-9988-4c0d-bcbe-3f44b9449f22',
          companyName: 'Miami Life Cars',
          email: 'miamilifecars@gmail.com',
          bookingIntegrated: true,
          videoLink: 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/public/81ff1053-9988-4c0d-bcbe-3f44b9449f22/video.mp4',
          bannerLink: 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/public/81ff1053-9988-4c0d-bcbe-3f44b9449f22/banner.png',
          motto: 'Meet our newest fleet yet',
          mottoDescription: "New rental cars. No lines. Let's go!",
          texts: [
            {
              title: {
                en: 'Why rent your car with Miami Life Cars in Florida?',
                es: '¿Por qué rentar tu auto con Miami Life Cars en Florida?',
                pt: 'Por que alugar seu carro com Miami Life Cars na Flórida?',
                fr: 'Pourquoi louer votre voiture avec Miami Life Cars en Floride ?',
                de: 'Warum sollten Sie Ihr Auto bei Miami Life Cars in Florida mieten?'
              },
              description: {
                en: 'Are you looking to navigate one of the most popular cities in the world, or set off on a road trip into the country? Miami Life Cars is here to help...'
              },
              notes: []
            }
          ],
          website: 'https://miamilifecars.aegis-rental.com',
          backgroundLink: 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/public/81ff1053-9988-4c0d-bcbe-3f44b9449f22/background.png',
          subdomain: 'miamilifecars',
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          logoUrl: 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/public/81ff1053-9988-4c0d-bcbe-3f44b9449f22/logo.jpg',
          faviconUrl: 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/public/81ff1053-9988-4c0d-bcbe-3f44b9449f22/favicon.png',
          country: 'United States',
          language: 'en',
          blinkKey: 'sRwCAB5taWFtaWxpZmVjYXJzLmFlZ2lzLXJlbnRhbC5jb20GbGV5SkRjbVZoZEdWa1QyNGlPakUzTmpJME1EZzRNVFl3TVRBc0lrTnlaV0YwWldSR2IzSWlPaUppTlRrMFpUazFZUzB6T0RFMkxUUXdNV1V0WW1JM055MHpaR1JsT0RRME1qQTBNVEVpZlE9Pbv1rgG/yLgd0nzSiRWxJK8kMSb26of5X9/vmuLBdCMHr4jrBzFRHprgqfnMf37yoaPzE+DXFL9zyGiDM9NRQTnWyY7xgNtACwQSOXA4bM6WdteuYOCVYPg0eAvwH7k=',
          currency: 'USD',
          aiIntegration: 'claude',
          securityDeposit: 1000
        }
      };
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
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

