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

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Phone, Mail, MapPin } from 'lucide-react';
import { useQuery } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';

const Footer = () => {
  const { t, i18n } = useTranslation();
  const { companyConfig } = useCompany();
  const [companyName, setCompanyName] = useState('All Rentals');
  
  // Get language-specific privacy/terms links
  const getPrivacyLink = () => {
    const lang = i18n.language || 'en';
    if (lang === 'en') return '/privacy.html';
    return `/privacy-${lang}.html`;
  };
  
  const getTermsLink = () => {
    const lang = i18n.language || 'en';
    if (lang === 'en') return '/terms.html';
    return `/terms-${lang}.html`;
  };
  
  // Fetch companies
  const { data: companiesResponse } = useQuery('companies', () => apiService.getCompanies({ isActive: true, pageSize: 100 }));
  const companiesData = companiesResponse?.data || companiesResponse;
  
  // Get company name - prioritize domain-based company config
  useEffect(() => {
    // If accessed via subdomain, use company config from domain
    if (companyConfig && companyConfig.companyName) {
      setCompanyName(companyConfig.companyName);
      return;
    }
    
    // Otherwise, get from localStorage selection
    const selectedCompanyId = localStorage.getItem('selectedCompanyId');
    const companies = Array.isArray(companiesData) ? companiesData : [];
    
    if (selectedCompanyId && companies.length > 0) {
      const selectedCompany = companies.find(c => 
        String(c.company_id || c.companyId) === String(selectedCompanyId)
      );
      if (selectedCompany) {
        setCompanyName(selectedCompany.company_name || selectedCompany.companyName || 'All Rentals');
      } else {
        setCompanyName('All Rentals');
      }
    } else {
      setCompanyName('All Rentals');
    }
  }, [companyConfig, companiesData]);

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Car className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold">{companyName}</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              {t('footer.description')}
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-300">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail className="h-4 w-4" />
                <span>info@currentcompany.com</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <MapPin className="h-4 w-4" />
                <span>123 Main St, City, State 12345</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.home')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.services')}</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-gray-300">{t('footer.economyCars')}</span>
              </li>
              <li>
                <span className="text-gray-300">{t('footer.luxuryVehicles')}</span>
              </li>
              <li>
                <span className="text-gray-300">{t('footer.suvRentals')}</span>
              </li>
              <li>
                <span className="text-gray-300">{t('footer.longTermRentals')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 Aegis AP Soft. {t('footer.allRightsReserved')}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href={getPrivacyLink()} className="text-gray-400 hover:text-white text-sm transition-colors">
                {t('footer.privacy')}
              </a>
              <a href={getTermsLink()} className="text-gray-400 hover:text-white text-sm transition-colors">
                {t('footer.terms')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
