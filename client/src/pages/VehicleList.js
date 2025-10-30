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
import { useQuery } from 'react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, Car, MapPin, Users, Fuel, Settings, Calendar } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';

const VehicleList = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get companyId from URL params
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlCompanyId = urlParams.get('companyId') || '';

  const [filters, setFilters] = useState({
    category: '',
    make: '',
    minPrice: '',
    maxPrice: '',
    model: '',
    pickupDate: '',
    returnDate: '',
    companyId: urlCompanyId
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [vehiclesPerPage] = useState(12); // Show 12 vehicles per page

  // Fetch vehicles - only show available ones
  const { data: vehiclesResponse, isLoading, error } = useQuery(
    ['vehicles', filters],
    () => {
      const params = { ...filters };
      // Request a large page size to get all vehicles
      params.pageSize = 3000;
      params.pageNumber = 1;
      // Only fetch available vehicles
      params.status = 'Available';
      return apiService.getVehicles(params);
    },
    {
      keepPreviousData: true
    }
  );
  
  // Extract the actual data from the axios response
  const vehiclesData = vehiclesResponse?.data || vehiclesResponse;

  // Fetch filter options
  // Fetch categories and makes
  const { data: categoriesResponse } = useQuery('categories', apiService.getVehicleCategories);
  const { data: makesResponse } = useQuery('makes', apiService.getVehicleMakes);
  
  // Extract arrays from response data (handle both wrapped and direct responses)
  const categoriesData = categoriesResponse?.data || categoriesResponse;
  const makesData = makesResponse?.data || makesResponse;
  
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const makes = Array.isArray(makesData) ? makesData : [];
  
  // Extract vehicles array (handle different response structures)
  // The vehiclesData from useQuery is the raw data from the API response
  let vehicles = [];
  
  // Check if vehiclesData is an object with nested structure
  if (vehiclesData && typeof vehiclesData === 'object') {
    // Try to find the vehicles array in nested structures
    if (vehiclesData.Vehicles) {
      vehicles = vehiclesData.Vehicles;
    } else if (vehiclesData.vehicles) {
      vehicles = vehiclesData.vehicles;
    } else if (vehiclesData.data && vehiclesData.data.Vehicles) {
      vehicles = vehiclesData.data.Vehicles;
    } else if (vehiclesData.data && vehiclesData.data.vehicles) {
      vehicles = vehiclesData.data.vehicles;
    } else if (Array.isArray(vehiclesData)) {
      vehicles = vehiclesData;
    } else if (vehiclesData.data && Array.isArray(vehiclesData.data)) {
      vehicles = vehiclesData.data;
    }
  } else if (Array.isArray(vehiclesData)) {
    vehicles = vehiclesData;
  }
  
  // Ensure vehicles is always an array
  if (!Array.isArray(vehicles)) {
    vehicles = [];
  }
  


  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      make: '',
      minPrice: '',
      maxPrice: '',
      model: '',
      pickupDate: '',
      returnDate: '',
      companyId: ''
    });
    setSearchTerm('');
  };

  const filteredVehicles = Array.isArray(vehicles) ? vehicles.filter(vehicle => {
    // Get vehicle properties (support both snake_case and PascalCase)
    const vehicleMake = vehicle.make || vehicle.Make || '';
    const vehicleModel = vehicle.model || vehicle.Model || '';
    const vehicleCategoryName = vehicle.category_name || vehicle.CategoryName || vehicle.categoryName || '';
    const vehicleDailyRate = vehicle.daily_rate || vehicle.DailyRate || vehicle.dailyRate || 0;
    const vehicleStatus = vehicle.status || vehicle.Status || '';
    
    // Only show available vehicles
    if (vehicleStatus.toLowerCase() !== 'available') {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        vehicleMake.toLowerCase().includes(searchLower) ||
        vehicleModel.toLowerCase().includes(searchLower) ||
        vehicleCategoryName.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Category filter
    if (filters.category && vehicleCategoryName !== filters.category) {
      return false;
    }
    
    // Make filter
    if (filters.make && vehicleMake !== filters.make) {
      return false;
    }
    
    // Model filter
    if (filters.model && vehicleModel !== filters.model) {
      return false;
    }
    
    // Price range filters
    if (filters.minPrice && vehicleDailyRate < parseFloat(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && vehicleDailyRate > parseFloat(filters.maxPrice)) {
      return false;
    }
    
    return true;
  }) : [];

  // Calculate pagination
  const indexOfLastVehicle = currentPage * vehiclesPerPage;
  const indexOfFirstVehicle = indexOfLastVehicle - vehiclesPerPage;
  const currentVehicles = filteredVehicles.slice(indexOfFirstVehicle, indexOfLastVehicle);
  const totalPages = Math.ceil(filteredVehicles.length / vehiclesPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Sync companyId filter with URL params
  useEffect(() => {
    const companyId = urlParams.get('companyId') || '';
    if (filters.companyId !== companyId) {
      setFilters(prev => ({ ...prev, companyId }));
    }
  }, [location.search, filters.companyId, urlParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('vehicles.errorLoading')}</h2>
          <p className="text-gray-600">{t('vehicles.tryAgainLater')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="relative bg-black py-12">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(135deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 152, 0, 0.2) 50%, transparent 100%)'
          }}></div>
        </div>
        
                 <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center">
             <span className="text-3xl font-bold text-white">{t('vehicles.title')}</span>
           </div>
         </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('vehicles.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('vehicles.filters')}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category */}
                <div>
                  <label className="form-label">{t('vehicles.category')}</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="form-input"
                  >
                    <option value="">{t('vehicles.allCategories')}</option>
                    {categories?.map(category => {
                      const categoryId = category.category_id || category.CategoryId || category.categoryId;
                      const categoryName = category.category_name || category.CategoryName || category.categoryName;
                      return (
                        <option key={categoryId} value={categoryName}>
                          {categoryName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Make */}
                <div>
                  <label className="form-label">{t('vehicles.make')}</label>
                  <select
                    value={filters.make}
                    onChange={(e) => handleFilterChange('make', e.target.value)}
                    className="form-input"
                  >
                    <option value="">{t('vehicles.allMakes')}</option>
                    {makes?.map(make => (
                      <option key={make} value={make}>
                        {make}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="form-label">{t('vehicles.model')}</label>
                  <select
                    value={filters.model}
                    onChange={(e) => handleFilterChange('model', e.target.value)}
                    className="form-input"
                  >
                    <option value="">{t('vehicles.allModels')}</option>
                    {Array.from(new Set(vehicles.map(v => v.model || v.Model))).filter(Boolean).map(model => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="form-label">{t('vehicles.priceRange')}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder={t('vehicles.min')}
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="form-input flex-1"
                    />
                    <input
                      type="number"
                      placeholder={t('vehicles.max')}
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="form-input flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={clearFilters}
                  className="btn-secondary mr-2"
                >
                  {t('vehicles.clearFilters')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-gray-600">
            {t('vehicles.showing')} {currentVehicles.length} {t('vehicles.of')} {filteredVehicles.length} {t('vehicles.vehicles')} ({t('vehicles.page')} {currentPage} {t('vehicles.of')} {totalPages})
          </p>
        </div>

        {/* Vehicle Grid */}
        {currentVehicles.length === 0 ? (
          <div className="text-center py-12">
            <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('vehicles.noVehicles')}</h3>
            <p className="text-gray-600">{t('vehicles.tryAdjusting')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentVehicles.map((vehicle, index) => {
              // Support both snake_case and PascalCase
              const dailyRate = vehicle.daily_rate || vehicle.DailyRate || vehicle.dailyRate || 0;
              const make = vehicle.make || vehicle.Make;
              const model = vehicle.model || vehicle.Model;
              const year = vehicle.year || vehicle.Year;
              const location = vehicle.location || vehicle.Location;
              const seats = vehicle.seats || vehicle.Seats || 0;
              const fuelType = vehicle.fuel_type || vehicle.FuelType || vehicle.fuelType || '';
              const transmission = vehicle.transmission || vehicle.Transmission;
              const vehicleId = vehicle.vehicle_id || vehicle.VehicleId || vehicle.vehicleId || vehicle.id;
              const categoryName = vehicle.category_name || vehicle.CategoryName || vehicle.categoryName || '';
              
              // Construct model image path: /models/MAKE_MODEL.png
              const makeUpper = (make || '').toUpperCase();
              const modelUpper = (model || '').toUpperCase().replace(/\s+/g, '_');
              const modelImagePath = `/models/${makeUpper}_${modelUpper}.png`;
              
              // Determine default image based on category (fallback)
              const getDefaultImage = (category) => {
                const cat = (category || '').toLowerCase();
                if (cat.includes('suv')) return '/SUV.png';
                if (cat.includes('luxury') || cat.includes('premium')) return '/luxury.jpg';
                if (cat.includes('sedan')) return '/sedan.jpg';
                if (cat.includes('compact')) return '/compact.jpg';
                return '/economy.jpg'; // default fallback
              };
              
              const defaultImage = getDefaultImage(categoryName);
              
              // Debug log for first vehicle
              if (index === 0) {
                console.log('First vehicle:', vehicle);
                console.log('Vehicle ID:', vehicleId);
              }
              
              // Skip if no vehicle ID
              if (!vehicleId) {
                console.error('Vehicle missing ID:', vehicle);
                return null;
              }

              return (
                <div key={vehicleId} className="vehicle-card">
                  <div className="relative">
                    <img
                      src={modelImagePath}
                      alt={`${make} ${model}`}
                      className="vehicle-image"
                      onError={(e) => {
                        // Fallback to category default image if model-specific image doesn't exist
                        // Only change if it's not already the default to prevent infinite loops
                        if (!e.target.src.includes(defaultImage.replace('/', ''))) {
                          e.target.src = defaultImage;
                        }
                      }}
                    />
                    <div className="absolute top-4 right-4 bg-yellow-500 text-black px-2 py-1 rounded-full text-sm font-semibold">
                      ${dailyRate}/{t('vehicles.day')}
                    </div>
                  </div>
                  
                  <div className="vehicle-info">
                    <h3 className="vehicle-title">
                      {year} {make} {model}
                    </h3>
                    
                    <div className="vehicle-details space-y-2">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{location || 'N/A'}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{seats} {t('vehicles.seats')}</span>
                      </div>
                      
                      {fuelType && (
                        <div className="flex items-center text-gray-600">
                          <Fuel className="h-4 w-4 mr-2" />
                          <span>{fuelType}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-gray-600">
                        <Settings className="h-4 w-4 mr-2" />
                        <span>{transmission || 'N/A'}</span>
                      </div>
                    </div>

                    {vehicle.features && vehicle.features.length > 0 && (
                      <div className="vehicle-features">
                        {vehicle.features.slice(0, 3).map((feature, index) => (
                          <span key={index} className="feature-tag">
                            {feature}
                          </span>
                        ))}
                        {vehicle.features.length > 3 && (
                          <span className="feature-tag">
                            +{vehicle.features.length - 3} {t('vehicles.more')}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4">
                      <div className="vehicle-price">
                        ${dailyRate}
                        <span className="text-sm text-gray-600">/{t('vehicles.day')}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/booking/${vehicleId}`)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          {t('vehicles.book')}
                        </button>
                        <Link
                          to={`/vehicles/${vehicleId}`}
                          className="btn-primary"
                        >
                          {t('vehicles.viewDetails')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredVehicles.length > vehiclesPerPage && (
          <div className="mt-8 flex justify-center items-center space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Previous
            </button>

            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => {
                const page = i + 1;
                // Show first page, last page, current page, and pages around current page
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === page
                          ? 'bg-yellow-500 text-black font-semibold'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-4 py-2 text-gray-500">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleList;
