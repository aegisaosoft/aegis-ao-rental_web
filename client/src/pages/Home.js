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

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Car, Shield, Clock, Star, ArrowRight, Calendar, Users, Fuel, Settings } from 'lucide-react';
import { useQuery } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [companyName, setCompanyName] = useState('Rentals');
  
  // Fetch companies
  const { data: companiesResponse } = useQuery('companies', () => apiService.getCompanies({ isActive: true, pageSize: 100 }));
  const companiesData = companiesResponse?.data || companiesResponse;
  
  // Get selected company ID
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  
  // Fetch models grouped by category
  const { data: modelsGroupedResponse, isLoading: modelsLoading, error: modelsError } = useQuery(
    ['modelsGroupedByCategory', selectedCompanyId],
    () => apiService.getModelsGroupedByCategory(selectedCompanyId),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: true // Always fetch, even if companyId is empty
    }
  );
  
  // Debug logging
  useEffect(() => {
    console.log('Models Response:', modelsGroupedResponse);
    console.log('Models Loading:', modelsLoading);
    console.log('Models Error:', modelsError);
  }, [modelsGroupedResponse, modelsLoading, modelsError]);
  
  const modelsGrouped = useMemo(() => {
    return modelsGroupedResponse?.data || modelsGroupedResponse || [];
  }, [modelsGroupedResponse]);
  
  // Debug logging
  useEffect(() => {
    console.log('Models Grouped:', modelsGrouped);
    console.log('Is Array:', Array.isArray(modelsGrouped));
    console.log('Length:', modelsGrouped?.length);
  }, [modelsGrouped]);
  
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
    
    const companies = Array.isArray(companiesData) ? companiesData : [];
    
    if (companyId && companies.length > 0) {
      const selectedCompany = companies.find(c => 
        String(c.company_id || c.companyId) === String(companyId)
      );
      if (selectedCompany) {
        setCompanyName(selectedCompany.company_name || selectedCompany.companyName || 'Rentals');
      }
    } else {
      setCompanyName('Rentals');
    }
  }, [companiesData]);
  
  // Listen for company changes
  useEffect(() => {
    const handleCompanyChange = (event) => {
      const companyId = event.detail?.companyId || '';
      setSelectedCompanyId(companyId);
    };
    
    window.addEventListener('companyChanged', handleCompanyChange);
    return () => window.removeEventListener('companyChanged', handleCompanyChange);
  }, []);

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

              {/* View Vehicles Button */}
              <Link
                to="/vehicles"
                className="w-full bg-yellow-500 text-black font-bold py-4 px-6 rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center"
              >
                View Vehicles
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
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
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Available Models by Category
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Browse our extensive selection of vehicle models, organized by category
            </p>
          </div>

          {modelsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              <p className="mt-4 text-gray-600">Loading models...</p>
            </div>
          ) : modelsError ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">Error loading models: {modelsError.message}</p>
              <p className="text-gray-600 text-sm">Check console for more details</p>
            </div>
          ) : !Array.isArray(modelsGrouped) || modelsGrouped.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No models available at this time.</p>
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
                          {categoryName}
                        </h3>
                        {categoryGroup.categoryDescription && (
                          <p className="text-gray-600 max-w-2xl mx-auto">
                            {categoryGroup.categoryDescription}
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
                          
                          acc[key].ids.push(model.id || model.model_id);
                          
                          return acc;
                        }, {});
                        
                        const groupedModels = Object.values(grouped).map(group => ({
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
                              
                              // Construct model image path: /models/MAKE_MODEL.png
                              const makeUpper = (group.make || '').toUpperCase();
                              const modelUpper = (group.modelName || '').toUpperCase().replace(/\s+/g, '_');
                              const modelImagePath = `/models/${makeUpper}_${modelUpper}.png`;
                              
                              return (
                                <div key={`${group.make}_${group.modelName}_${index}`} className="vehicle-card flex-shrink-0" style={{ width: '320px', minWidth: '320px' }}>
                                  <div className="relative">
                                    <img
                                      src={modelImagePath}
                                      alt={`${group.make} ${group.modelName}`}
                                      className="vehicle-image"
                                      onError={(e) => {
                                        // Fallback to category default image if model-specific image doesn't exist
                                        e.target.src = defaultImage;
                                      }}
                                    />
                                    {group.dailyRate && (
                                      <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold">
                                        ${parseFloat(group.dailyRate).toFixed(2)}/day
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="vehicle-info">
                                    <h3 className="vehicle-title">
                                      {group.make} {group.modelName}
                                    </h3>
                                    {yearsDisplay && (
                                      <p className="text-sm text-gray-600 mb-2">
                                        Years: {yearsDisplay}
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
                                          <span>{group.fuelType}</span>
                                        </div>
                                      )}
                                      
                                      {group.transmission && (
                                        <div className="flex items-center text-gray-600">
                                          <Settings className="h-4 w-4 mr-2" />
                                          <span>{group.transmission}</span>
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
                          if (!acc[key]) acc[key] = true;
                          return acc;
                        }, {});
                        const uniqueModelsCount = Object.keys(grouped).length;
                        
                        return uniqueModelsCount > 6 && (
                          <div className="text-center pt-4">
                            <Link
                              to={`/vehicles?category=${categoryId}`}
                              className="text-yellow-500 hover:text-yellow-600 font-semibold inline-flex items-center text-lg"
                            >
                              View All {uniqueModelsCount} {categoryName} Models
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
                Wide Selection
              </h3>
              <p className="text-gray-600">
                Choose from our extensive fleet of economy, luxury, and specialty vehicles.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Fully Insured
              </h3>
              <p className="text-gray-600">
                All our vehicles come with comprehensive insurance coverage for your peace of mind.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                24/7 Support
              </h3>
              <p className="text-gray-600">
                Our customer service team is available around the clock to assist you.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Premium Service
              </h3>
              <p className="text-gray-600">
                Experience top-notch service with our professional and friendly staff.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust {companyName} for their transportation needs.
          </p>
          <Link
            to="/vehicles"
            className="bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-yellow-400 transition-colors inline-flex items-center"
          >
            Browse Our Fleet
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
