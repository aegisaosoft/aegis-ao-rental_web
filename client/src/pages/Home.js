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
import { Car, Shield, Clock, Star, ArrowRight, Calendar } from 'lucide-react';
import { useQuery } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [companyName, setCompanyName] = useState('All Rentals');
  
  // Fetch companies
  const { data: companiesResponse } = useQuery('companies', () => apiService.getCompanies({ isActive: true, pageSize: 100 }));
  const companiesData = companiesResponse?.data || companiesResponse;
  
  // Get company from localStorage
  useEffect(() => {
    const selectedCompanyId = localStorage.getItem('selectedCompanyId');
    const companies = Array.isArray(companiesData) ? companiesData : [];
    
    if (selectedCompanyId && companies.length > 0) {
      const selectedCompany = companies.find(c => 
        String(c.company_id || c.companyId) === String(selectedCompanyId)
      );
      if (selectedCompany) {
        setCompanyName(selectedCompany.company_name || selectedCompany.companyName || 'All Rentals');
      }
    } else {
      setCompanyName('All Rentals');
    }
  }, [companiesData]);

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
