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

import React from 'react';
import { useQuery } from 'react-query';
import { Building2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiService from '../services/api';
import LoadingSpinner from './common/LoadingSpinner';
import LanguageSwitcher from './LanguageSwitcher';

const TenantsGrid = () => {
  const { t } = useTranslation();
  const { data: companiesResponse, isLoading, error } = useQuery(
    'allCompanies',
    async () => {
      try {
        const response = await apiService.getCompanies({ isActive: true });
        return response;
      } catch (err) {
        // If API requires auth, return empty array
        return { data: [] };
      }
    },
    {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (err) => {
      },
    }
  );

  // Extract companies from response - handle different response formats
  let companies = [];
  if (companiesResponse) {
    if (Array.isArray(companiesResponse)) {
      companies = companiesResponse;
    } else if (companiesResponse.data && Array.isArray(companiesResponse.data)) {
      companies = companiesResponse.data;
    } else if (companiesResponse.items && Array.isArray(companiesResponse.items)) {
      companies = companiesResponse.items;
    } else if (companiesResponse.Items && Array.isArray(companiesResponse.Items)) {
      companies = companiesResponse.Items;
    }
  }
  
  // Filter active companies - handle both camelCase and PascalCase
  const activeCompanies = Array.isArray(companies) 
    ? companies.filter(c => {
        if (!c) return false;
        const isActive = c.isActive ?? c.IsActive;
        return isActive !== false && isActive !== undefined;
      })
    : [];

  const getCompanyUrl = (company) => {
    // Use subdomain if available, otherwise use company path
    const subdomain = company.subdomain || company.Subdomain;
    const companyPath = company.companyPath || company.CompanyPath;
    
    if (subdomain) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      
      // Handle localhost development
      if (hostname === 'localhost' || hostname.includes('localhost')) {
        return `${protocol}//${subdomain}.localhost:${window.location.port}`;
      }
      
      // For production: if we're on aegis-rental.com or a subdomain of it, use aegis-rental.com as base
      if (hostname === 'aegis-rental.com' || hostname.endsWith('.aegis-rental.com')) {
        return `${protocol}//${subdomain}.aegis-rental.com`;
      }
      
      // For other domains, extract base host and construct subdomain URL
      const baseHost = hostname.replace(/^[^.]+\./, '');
      return `${protocol}//${subdomain}.${baseHost}`;
    }
    if (companyPath) {
      return `${window.location.origin}/${companyPath}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <img
                  src="/logo03.png"
                  alt="Aegis AO Soft"
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <h1 className="text-xl font-semibold text-gray-900">Aegis AO Soft</h1>
              </div>
              <div className="flex items-center">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
          <LoadingSpinner size="lg" text={t('main.loadingCompanies', 'Loading rental companies...')} />
        </div>
      </div>
    );
  }

  if (error && (!companiesResponse || !activeCompanies || activeCompanies.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <img
                  src="/logo03.png"
                  alt="Aegis AO Soft"
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <h1 className="text-xl font-semibold text-gray-900">Aegis AO Soft</h1>
              </div>
              <div className="flex items-center">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 text-center">
          <Building2 className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('main.noCompaniesAvailable', 'No rental companies available')}</h2>
          <p className="text-gray-600 max-w-md">
            {t('main.unableToLoadCompanies', 'Unable to load rental companies. Please try accessing a specific company site directly.')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!activeCompanies || activeCompanies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <img
                  src="/logo03.png"
                  alt="Aegis AO Soft"
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <h1 className="text-xl font-semibold text-gray-900">Aegis AO Soft</h1>
              </div>
              <div className="flex items-center">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 text-center">
          <Building2 className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('main.noCompaniesAvailable', 'No rental companies available')}</h2>
          <p className="text-gray-600 max-w-md">
            {t('main.noActiveCompanies', 'No active rental companies found. Please contact the administrator.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Company Name */}
            <div className="flex items-center gap-4">
              <img
                src="/logo03.png"
                alt="Aegis AO Soft"
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  // Fallback if logo doesn't exist
                  e.target.style.display = 'none';
                }}
              />
              <h1 className="text-xl font-semibold text-gray-900">Aegis AO Soft</h1>
            </div>
            
            {/* Language Switcher */}
            <div className="flex items-center">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('main.selectRentalCompany', 'Select Rental Company')}</h2>
            <p className="text-lg text-gray-600">{t('main.chooseCompanyToVisit', 'Choose a company to visit their site')}</p>
          </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {activeCompanies.map((company, index) => {
            const companyUrl = getCompanyUrl(company);
            const companyName = company.companyName || company.name || company.CompanyName || 'Unnamed Company';
            const logoUrl = company.logoUrl || company.logo_link || company.logoLink || company.LogoUrl || company.LogoLink || company.LogoLink;
            const companyId = company.id || company.Id || company.companyId || company.CompanyId || `company-${index}`;
            
            return (
              <a
                key={companyId}
                href={companyUrl || '#'}
                className="group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-200 hover:border-blue-500"
              >
                <div className="p-6 flex flex-col items-center text-center min-h-[200px] justify-center">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={companyName}
                      className="h-16 w-auto mb-4 object-contain max-w-full"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`${logoUrl ? 'hidden' : 'flex'} items-center justify-center h-16 w-16 mb-4 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors`}
                  >
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {companyName}
                  </h3>
                  {companyUrl && (
                    <div className="flex items-center text-sm text-gray-500 group-hover:text-blue-600 transition-colors">
                      <span>{t('main.visitSite', 'Visit Site')}</span>
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};

export default TenantsGrid;
