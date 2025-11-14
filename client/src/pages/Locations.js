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
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';
import { translatedApiService as apiService } from '../services/translatedApi';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { LoadingSpinner } from '../components/common';

const Locations = () => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  
  const currentCompanyId = companyConfig?.id || null;

  // Fetch company locations
  const { data: companyLocationsData, isLoading: isLoadingCompanyLocations } = useQuery(
    ['companyLocations', currentCompanyId],
    () => apiService.getCompanyLocations({ companyId: currentCompanyId, isActive: true }),
    {
      enabled: !!currentCompanyId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Ensure locations are always arrays
  const companyLocations = Array.isArray(companyLocationsData) ? companyLocationsData : [];

  if (isLoadingCompanyLocations) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (!companyLocations || companyLocations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('locations.noLocations', 'No locations available')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('locations.checkBackLater', 'Please check back later')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('locations.title', 'Our Locations')}</h1>
          <p className="mt-2 text-lg text-gray-600">
            {t('locations.subtitle', 'Find us at any of our convenient locations')}
          </p>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companyLocations.map((location) => {
            const locationId = location.locationId || location.id || location.Id || location.LocationId;
            const locationName = location.locationName || location.LocationName || 'Location';
            const address = location.address || location.Address || '';
            const city = location.city || location.City || '';
            const state = location.state || location.State || '';
            const postalCode = location.postalCode || location.PostalCode || '';
            const country = location.country || location.Country || '';
            const phone = location.phone || location.Phone || '';
            const email = location.email || location.Email || '';
            const openingHours = location.openingHours || location.OpeningHours || '';
            const isPickup = location.isPickupLocation || location.IsPickupLocation;
            const isReturn = location.isReturnLocation || location.IsReturnLocation;
            const isOffice = location.isOffice || location.IsOffice;
            
            const fullAddress = [address, city, state, postalCode, country].filter(Boolean).join(', ');
            
            return (
              <div key={locationId} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Location Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{locationName}</h3>
                      
                      {/* Location Type Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {isPickup && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {t('locations.pickup', 'Pickup')}
                          </span>
                        )}
                        {isReturn && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t('locations.return', 'Return')}
                          </span>
                        )}
                        {isOffice && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {t('locations.office', 'Office')}
                          </span>
                        )}
                      </div>
                    </div>
                    <MapPin className="h-6 w-6 text-gray-400 flex-shrink-0 ml-2" />
                  </div>

                  {/* Address */}
                  {fullAddress && (
                    <div className="mt-4 flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{fullAddress}</p>
                    </div>
                  )}

                  {/* Phone */}
                  {phone && (
                    <div className="mt-3 flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <a href={`tel:${phone}`} className="text-sm text-blue-600 hover:text-blue-800">
                        {phone}
                      </a>
                    </div>
                  )}

                  {/* Email */}
                  {email && (
                    <div className="mt-3 flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <a href={`mailto:${email}`} className="text-sm text-blue-600 hover:text-blue-800 break-all">
                        {email}
                      </a>
                    </div>
                  )}

                  {/* Opening Hours */}
                  {openingHours && (
                    <div className="mt-3 flex items-start">
                      <Clock className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600 whitespace-pre-line">{openingHours}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Locations;

