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
import { Link, useNavigate } from 'react-router-dom';
import { Car, QrCode, MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';
import axios from 'axios';

const Footer = () => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('All Rentals');
  const [locations, setLocations] = useState([]);
  
  // Get language-specific privacy/terms links
  const getPrivacyLink = () => {
    return '/privacy';
  };
  
  const getTermsLink = () => {
    return '/terms';
  };
  
  // Get company name - show "Unknown" if no company
  useEffect(() => {
    if (companyConfig?.companyName) {
      setCompanyName(companyConfig.companyName);
    } else {
      setCompanyName('Unknown');
    }
  }, [companyConfig]);

  // Fetch company locations (anonymous call - no auth required)
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        if (companyConfig?.id) {
          // Direct anonymous API call - no authentication needed
          const response = await axios.get('/api/CompanyLocations', {
            params: { 
              companyId: companyConfig.id,
              isActive: true 
            }
          });
          
          // Handle standardized API response wrapper
          const locationData = response.data?.result || response.data || [];
          // Get only active locations, limit to 4 for footer display
          const activeLocations = (Array.isArray(locationData) ? locationData : [])
            .slice(0, 4);
          setLocations(activeLocations);
        }
      } catch (error) {
        console.error('Error fetching locations for footer:', error);
        setLocations([]);
      }
    };
    
    fetchLocations();
  }, [companyConfig?.id]);

  return (
    <footer className="bg-gray-900 text-white relative">
      {/* QR Code Icon - Left side of footer */}
      <div className="absolute left-4 bottom-4 md:left-8 md:bottom-8">
        <button
          onClick={() => navigate('/qrcode')}
          className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl cursor-pointer group"
          title={t('footer.scanQRCode') || 'Scan QR Code'}
          aria-label={t('footer.scanQRCode') || 'Scan QR Code'}
        >
          <QrCode className="h-6 w-6 md:h-7 md:w-7 text-gray-900 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>

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
                <Link to="/locations" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.contactUs', 'Contact Us')}</h3>
            {locations.length > 0 ? (
              <ul className="space-y-3">
                {locations.map((location) => (
                  <li key={location.id} className="text-sm">
                    <div className="text-gray-300 font-medium">{location.locationName}</div>
                    {location.address && (
                      <div className="text-gray-400 text-xs flex items-start mt-1">
                        <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                        <span>{location.address}{location.city ? `, ${location.city}` : ''}</span>
                      </div>
                    )}
                    {location.phone && (
                      <div className="text-gray-400 text-xs flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                        <a href={`tel:${location.phone}`} className="hover:text-white transition-colors">
                          {location.phone}
                        </a>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                <li key="no-locations">
                  <span className="text-gray-300 text-sm">{t('footer.noLocations', 'No locations available')}</span>
                </li>
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 Aegis AP Soft. {t('footer.allRightsReserved')}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link key="privacy" to={getPrivacyLink()} className="text-gray-400 hover:text-white text-sm transition-colors">
                {t('footer.privacy')}
              </Link>
              <Link key="terms" to={getTermsLink()} className="text-gray-400 hover:text-white text-sm transition-colors">
                {t('footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
