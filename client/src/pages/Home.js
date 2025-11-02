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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Car, Shield, Clock, Star, ArrowRight, Calendar, Users, Fuel, Settings } from 'lucide-react';
import { useQuery, useQueryClient } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [companyName, setCompanyName] = useState('Rentals');
  const modelsSectionRef = useRef(null);
  
  // Fetch companies
  const { data: companiesResponse } = useQuery('companies', () => apiService.getCompanies({ isActive: true, pageSize: 100 }));
  const companiesData = companiesResponse?.data || companiesResponse;
  
  // Get selected company ID
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  
  // Fetch company locations
  const { data: companyLocationsResponse } = useQuery(
    ['companyLocations', selectedCompanyId],
    () => apiService.getCompanyLocations({ companyId: selectedCompanyId, isActive: true }),
    {
      enabled: !!selectedCompanyId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );
  
  const companyLocationsData = companyLocationsResponse?.data || companyLocationsResponse;
  const companyLocations = Array.isArray(companyLocationsData) ? companyLocationsData : [];
  const showLocationDropdown = companyLocations.length > 1;
  
  // Fetch models grouped by category
  // Pass null/undefined when companyId is empty string to show all models
  const { data: modelsGroupedResponse, isLoading: modelsLoading, error: modelsError } = useQuery(
    ['modelsGroupedByCategory', selectedCompanyId],
    () => apiService.getModelsGroupedByCategory(selectedCompanyId || null),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: true // Always fetch, even if companyId is empty - shows all models when no company selected
    }
  );

  // Filter models by active filters
  const modelsGrouped = useMemo(() => {
    // Handle loading state - don't warn if data is still loading
    if (!modelsGroupedResponse) {
      return [];
    }
    
    // Handle different response structures
    let allModels = modelsGroupedResponse;
    
    // If response has a data property
    if (allModels?.data) {
      allModels = allModels.data;
    }
    
    // If still wrapped in result property (standardized API response)
    if (allModels?.result) {
      allModels = allModels.result;
    }
    
    // Ensure it's an array
    if (!Array.isArray(allModels)) {
      // Only warn in development and if we actually have data (not just loading)
      if (process.env.NODE_ENV === 'development' && allModels !== undefined && allModels !== null) {
        console.warn('modelsGrouped is not an array:', allModels);
      }
      return [];
    }
    
    // No filtering - show all models
    // Date availability checking removed - all vehicles are available
    return allModels;
  }, [modelsGroupedResponse]);
  
  // Calculate total vehicle count and available count from models
  const { fleetCount, availableCount } = useMemo(() => {
    let totalVehicles = 0;
    let totalAvailable = 0;
    
    if (modelsGrouped && Array.isArray(modelsGrouped)) {
      console.log('DEBUG Home: modelsGrouped structure:', modelsGrouped.length, 'categories');
      modelsGrouped.forEach(categoryGroup => {
        if (categoryGroup.models && Array.isArray(categoryGroup.models)) {
          console.log('DEBUG Home: category', categoryGroup.categoryName, 'has', categoryGroup.models.length, 'models');
          categoryGroup.models.forEach(model => {
            const vCount = (model.vehicleCount || model.VehicleCount || 0);
            const aCount = (model.availableCount || model.AvailableCount || 0);
            console.log('DEBUG Home: Model', model.make, model.modelName, model.year, '- vehicles:', vCount, 'available:', aCount);
            totalVehicles += vCount;
            totalAvailable += aCount;
          });
        }
      });
    }
    
    console.log('DEBUG Home: Total calculated - vehicles:', totalVehicles, 'available:', totalAvailable);
    return { fleetCount: totalVehicles, availableCount: totalAvailable };
  }, [modelsGrouped]);
  
  //
  
  // Get company from localStorage and URL
  useEffect(() => {
    // Get companyId from URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const urlCompanyId = urlParams.get('companyId') || '';
    
    // Get companyId from localStorage as fallback
    const storedCompanyId = localStorage.getItem('selectedCompanyId') || '';
    
    // Use URL param if available, otherwise use stored value
    const companyId = urlCompanyId || storedCompanyId;
    setSelectedCompanyId(companyId);
  }, []); // Only run once on mount
  
  // Update company name when selectedCompanyId or companiesData changes
  useEffect(() => {
    const companies = Array.isArray(companiesData) ? companiesData : [];
    
    if (selectedCompanyId && companies.length > 0) {
      const selectedCompany = companies.find(c => 
        String(c.company_id || c.companyId) === String(selectedCompanyId)
      );
      if (selectedCompany) {
        setCompanyName(selectedCompany.company_name || selectedCompany.companyName || 'Rentals');
      } else {
        setCompanyName('Rentals');
      }
    } else {
      setCompanyName('Rentals');
    }
  }, [selectedCompanyId, companiesData]);
  
  // Listen for company changes
  useEffect(() => {
    const handleCompanyChange = (event) => {
      const companyId = event.detail?.companyId || '';
      setSelectedCompanyId(companyId);
      
      // Update company name when company changes
      const companies = Array.isArray(companiesData) ? companiesData : [];
      if (companyId && companies.length > 0) {
        const selectedCompany = companies.find(c => 
          String(c.company_id || c.companyId) === String(companyId)
        );
        if (selectedCompany) {
          setCompanyName(selectedCompany.company_name || selectedCompany.companyName || 'Rentals');
        } else {
          setCompanyName('Rentals');
        }
      } else {
        setCompanyName('Rentals');
      }
      
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries(['modelsGroupedByCategory', companyId]);
      queryClient.invalidateQueries(['companyLocations', companyId]);
    };
    
    window.addEventListener('companyChanged', handleCompanyChange);
    return () => window.removeEventListener('companyChanged', handleCompanyChange);
  }, [companiesData, queryClient]);

  const features = [
    {
      icon: <Car className="h-8 w-8 text-yellow-400" />,
      title: '#1 Loyalty Program',
      description: 'Rewards for every rental'
    },
    {
      icon: <Clock className="h-8 w-8 text-yellow-400" />,
      title: 'Skip the line',
      description: 'No hassle, just drive'
    },
    {
      icon: <Shield className="h-8 w-8 text-yellow-400" />,
      title: 'Trusted for 100+ years',
      description: 'Reliable service you can count on'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section with Booking Form */}
      <section className="relative min-h-[600px] bg-black">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(135deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 152, 0, 0.2) 50%, transparent 100%)'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Booking Form - Left Side */}
            <div className="bg-white rounded-lg shadow-2xl p-6 lg:p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {t('home.bookYourCar')}
              </h2>

              {/* Start and End Dates */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.startDate')}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.endDate')}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Car Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('home.carCategory')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">{t('home.selectCategory')}</option>
                  <option value="economy">{t('categories.economy')}</option>
                  <option value="compact">{t('categories.compact')}</option>
                  <option value="mid-size">{t('categories.mid-size')}</option>
                  <option value="full-size">{t('categories.full-size')}</option>
                  <option value="suv">{t('categories.suv')}</option>
                  <option value="luxury">{t('categories.luxury')}</option>
                  <option value="sports">{t('categories.sports')}</option>
                </select>
              </div>

              {/* Location Dropdown - Only show if company has more than 1 location */}
              {showLocationDropdown && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.location')}
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">{t('home.selectLocation')}</option>
                    {companyLocations.map((location) => (
                      <option key={location.id || location.Id} value={location.id || location.Id}>
                        {location.locationName || location.location_name || location.LocationName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* View Vehicles Button */}
              <button
                onClick={() => {
                  // Scroll to models section
                  setTimeout(() => {
                    modelsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="w-full bg-yellow-500 text-black font-bold py-4 px-6 rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center"
              >
                {t('home.viewVehicles')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>

            {/* Promotional Content - Right Side */}
            <div className="text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
                Meet our newest fleet yet
              </h1>
              <p className="text-2xl mb-8 text-gray-200">
                New rental cars. No lines. Let's go!
              </p>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                {features.map((feature, index) => (
                  <div key={index} className="flex flex-col items-start">
                    <div className="mb-2">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                    <p className="text-gray-300 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available Models by Category Section */}
      <section ref={modelsSectionRef} className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {t('home.availableModelsTitle')}
              </h2>
              {selectedCompanyId && fleetCount > 0 && (
                <span className="text-lg font-normal text-gray-600 bg-gray-100 px-4 py-1 rounded-full">
                  {fleetCount} / {availableCount}
                </span>
              )}
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('home.availableModelsSubtitle')}
            </p>
          </div>

          {modelsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              <p className="mt-4 text-gray-600">{t('home.loadingModels')}</p>
            </div>
          ) : modelsError ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{t('home.errorLoadingModels')}: {modelsError.message}</p>
              <p className="text-gray-600 text-sm">{t('home.checkConsole')}</p>
            </div>
          ) : !Array.isArray(modelsGrouped) || modelsGrouped.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">{t('home.noModelsAvailable')}</p>
              <p className="text-gray-500 text-sm">Response: {JSON.stringify(modelsGroupedResponse?.slice?.(0, 200) || modelsGroupedResponse)}</p>
            </div>
          ) : (
              <div className="space-y-16">
                {modelsGrouped.map((categoryGroup) => {
                  const categoryName = categoryGroup.categoryName || categoryGroup.category_name || '';
                  const categoryId = categoryGroup.categoryId || categoryGroup.category_id;
                  
                  // Determine default image based on category
                  const getDefaultImage = (category) => {
                    const cat = (category || '').toLowerCase();
                    if (cat.includes('suv')) return '/SUV.png';
                    if (cat.includes('luxury') || cat.includes('premium')) return '/luxury.jpg';
                    if (cat.includes('sedan') || cat.includes('mid-size') || cat.includes('full-size')) return '/sedan.jpg';
                    if (cat.includes('compact')) return '/compact.jpg';
                    if (cat.includes('van')) return '/compact.jpg';
                    return '/economy.jpg'; // default fallback
                  };
                  
                  const defaultImage = getDefaultImage(categoryName);
                  
                  return (
                    <div key={categoryId} className="space-y-6">
                      {/* Category Header */}
                      <div className="text-center">
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                          {t(`categories.${(categoryName || '').toLowerCase().replace(/\s+/g, '-')}`) || categoryName}
                        </h3>
                        {categoryGroup.categoryDescription && (
                          <p className="text-gray-600 max-w-2xl mx-auto">
                            {t(`categories.${(categoryName || '').toLowerCase().replace(/\s+/g, '-')}.description`) || categoryGroup.categoryDescription}
                          </p>
                        )}
                      </div>

                      {/* Group models by make and modelName */}
                      {(() => {
                        const models = categoryGroup.models || [];
                        const grouped = models.reduce((acc, model) => {
                          const make = (model.make || '').toUpperCase();
                          const modelName = (model.modelName || model.model_name || '').toUpperCase();
                          const key = `${make}_${modelName}`;
                          
                          if (!acc[key]) {
                            acc[key] = {
                              make,
                              modelName,
                              years: [],
                              seats: model.seats || 0,
                              fuelType: model.fuelType || model.fuel_type || '',
                              transmission: model.transmission || '',
                              dailyRate: model.dailyRate || model.daily_rate || null,
                              features: model.features || [],
                              vehicleCount: 0,
                              availableCount: 0,
                              ids: []
                            };
                          }
                          
                          const year = model.year || 0;
                          if (year && !acc[key].years.includes(year)) {
                            acc[key].years.push(year);
                          }
                          
                          // Take the highest daily rate if multiple exist
                          const modelRate = model.dailyRate || model.daily_rate;
                          if (modelRate && (!acc[key].dailyRate || modelRate > acc[key].dailyRate)) {
                            acc[key].dailyRate = modelRate;
                          }
                          
                          // Combine features
                          if (model.features && Array.isArray(model.features)) {
                            acc[key].features = [...new Set([...acc[key].features, ...model.features])];
                          }
                          
                          // Sum up vehicle counts and available counts
                          acc[key].vehicleCount += model.vehicleCount || 0;
                          acc[key].availableCount += model.availableCount || 0;
                          
                          acc[key].ids.push(model.id || model.model_id);
                          
                          return acc;
                        }, {});
                        
                        const groupedModels = Object.values(grouped)
                          .map(group => ({
                            ...group,
                            years: group.years.sort((a, b) => b - a) // Sort years descending
                          }));
                        
                        return (
                          <div className="overflow-x-auto pb-4 -mx-4 px-4 model-cards-scroll">
                            <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
                              {groupedModels.map((group, index) => {
                              const yearsDisplay = group.years.length > 0 
                                ? group.years.length === 1
                                  ? group.years[0].toString()
                                  : `${Math.min(...group.years)}-${Math.max(...group.years)}`
                                : '';
                              
                              // Construct model image path: use direct /models/ path (served by Create React App from public/)
                              const makeUpper = (group.make || '').toUpperCase();
                              const modelUpper = (group.modelName || '').toUpperCase().replace(/\s+/g, '_');
                              // In development, React serves public/ directly; in production, backend serves /api/models/
                              const modelImagePath = process.env.NODE_ENV === 'development' 
                                ? `/models/${makeUpper}_${modelUpper}.png`
                                : `/api/models/${makeUpper}_${modelUpper}.png`;
                              
                              return (
                                <div key={`${group.make}_${group.modelName}_${index}`} className="vehicle-card flex-shrink-0" style={{ width: '320px', minWidth: '320px' }}>
                                  <div className="relative">
                                    <img
                                      src={modelImagePath}
                                      alt={`${group.make} ${group.modelName}`}
                                      className="vehicle-image"
                                      onError={(e) => {
                                        // Fallback to category default image if model-specific image doesn't exist
                                        // Only change if it's not already the default to prevent infinite loops
                                        if (e.target.src !== window.location.origin + defaultImage) {
                                          e.target.src = defaultImage;
                                        }
                                      }}
                                      onLoad={(e) => {
                                        // If image fails to load, the onError will handle it
                                        // This ensures the image loads correctly
                                      }}
                                    />
                                    {group.dailyRate && (
                                      <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold">
                                        ${parseFloat(group.dailyRate).toFixed(2)}/day
                                      </div>
                                    )}
                                    {selectedCompanyId && group.vehicleCount > 0 && (
                                      <div className="absolute bottom-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                        {group.availableCount}/{group.vehicleCount} {t('status.available')}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="vehicle-info">
                                    <h3 className="vehicle-title">
                                      {group.make} {group.modelName}
                                    </h3>
                                    {yearsDisplay && (
                                      <p className="text-sm text-gray-600 mb-2">
                                        {t('vehicles.years') || 'Years'}: {yearsDisplay}
                                      </p>
                                    )}
                                    
                                    <div className="vehicle-details space-y-2">
                                      {group.seats > 0 && (
                                        <div className="flex items-center text-gray-600">
                                          <Users className="h-4 w-4 mr-2" />
                                          <span>{group.seats} {t('vehicles.seats') || 'seats'}</span>
                                        </div>
                                      )}
                                      
                                      {group.fuelType && (
                                        <div className="flex items-center text-gray-600">
                                          <Fuel className="h-4 w-4 mr-2" />
                                          <span>{t(`fuelTypes.${(group.fuelType || '').toString().toLowerCase()}`) || group.fuelType}</span>
                                        </div>
                                      )}
                                      
                                      {group.transmission && (
                                        <div className="flex items-center text-gray-600">
                                          <Settings className="h-4 w-4 mr-2" />
                                          <span>{t(`transmission.${(group.transmission || '').toString().toLowerCase()}`) || group.transmission}</span>
                                        </div>
                                      )}
                                    </div>

                                    {group.features && group.features.length > 0 && (
                                      <div className="vehicle-features mt-2">
                                        {group.features.slice(0, 3).map((feature, idx) => (
                                          <span key={idx} className="feature-tag">
                                            {feature}
                                          </span>
                                        ))}
                                        {group.features.length > 3 && (
                                          <span className="feature-tag">
                                            +{group.features.length - 3} {t('vehicles.more') || 'more'}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex justify-between items-center mt-4">
                                      {group.dailyRate && (
                                        <div className="vehicle-price">
                                          ${parseFloat(group.dailyRate).toFixed(2)}
                                          <span className="text-sm text-gray-600">/{t('vehicles.day') || 'day'}</span>
                                        </div>
                                      )}
                                      <Link
                                        to={`/book?category=${categoryId}&make=${encodeURIComponent(group.make)}&model=${encodeURIComponent(group.modelName)}${selectedCompanyId ? `&companyId=${selectedCompanyId}` : ''}`}
                                        className="btn-primary text-sm"
                                      >
                                        {t('vehicles.book') || 'Book'}
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const models = categoryGroup.models || [];
                        const grouped = models.reduce((acc, model) => {
                          const make = (model.make || '').toUpperCase();
                          const modelName = (model.modelName || model.model_name || '').toUpperCase();
                          const key = `${make}_${modelName}`;
                          if (!acc[key]) {
                            acc[key] = { make, modelName };
                          }
                          return acc;
                        }, {});
                        
                        // Count unique models
                        const uniqueModels = Object.values(grouped);
                        const uniqueModelsCount = uniqueModels.length;
                        
                        return uniqueModelsCount > 6 && (
                          <div className="text-center pt-4">
                            <Link
                              to={`/?category=${categoryId}${selectedCompanyId ? `&companyId=${selectedCompanyId}` : ''}`}
                              className="text-yellow-500 hover:text-yellow-600 font-semibold inline-flex items-center text-lg"
                            >
                              {t('home.viewAllModels', { 
                                count: uniqueModelsCount, 
                                category: t(`categories.${(categoryName || '').toLowerCase().replace(/\s+/g, '-')}`) || categoryName 
                              })}
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('home.whyChoose', { companyName })}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('home.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Car className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('home.features.wideSelection.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.wideSelection.description')}
              </p>
            </div>

            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('home.features.fullyInsured.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.fullyInsured.description')}
              </p>
            </div>

            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('home.features.support.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.support.description')}
              </p>
            </div>

            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('home.features.premiumService.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.premiumService.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('home.ctaTitle')}
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {t('home.ctaSubtitle', { companyName })}
          </p>
          <Link
            to="/"
            className="bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-yellow-400 transition-colors inline-flex items-center"
          >
            {t('home.browseFleet')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
