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

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { MapPin, Users, Fuel, Settings, Star, Shield, Clock, Edit2, X } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const VehicleDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isAuthenticated, isAdmin } = useAuth();
  const [selectedDates, setSelectedDates] = useState({
    pickupDate: '',
    returnDate: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const { data: vehicleResponse, isLoading, error } = useQuery(
    ['vehicle', id],
    () => apiService.getVehicle(id),
    {
      enabled: !!id
    }
  );

  const vehicleData = vehicleResponse?.data || vehicleResponse;
  const vehicle = vehicleData;

  // Fetch categories for the dropdown
  const { data: categoriesResponse } = useQuery('categories', apiService.getVehicleCategories);
  const categoriesData = categoriesResponse?.data || categoriesResponse;
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Update mutation
  const updateMutation = useMutation(
    (data) => apiService.updateVehicle(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicle', id]);
        setIsEditing(false);
      }
    }
  );

  // Initialize edit form when vehicle loads
  React.useEffect(() => {
    if (vehicle) {
      setEditForm({
        categoryId: vehicle.category_id || vehicle.categoryId || '',
        fuelType: vehicle.fuel_type || vehicle.fuelType || '',
        year: vehicle.year || '',
        dailyRate: vehicle.daily_rate || vehicle.dailyRate || 0
      });
    }
  }, [vehicle]);

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = {
      categoryId: editForm.categoryId || null,
      fuelType: editForm.fuelType || null,
      year: parseInt(editForm.year) || null,
      dailyRate: parseFloat(editForm.dailyRate) || null
    };

    // Include make and model for bulk category update
    if (editForm.categoryId && editForm.categoryId !== (vehicle.category_id || vehicle.categoryId)) {
      payload.make = vehicle.make || vehicle.Make;
      payload.model = vehicle.model || vehicle.Model;
    }

    updateMutation.mutate(payload);
  };

  const handleDateChange = (field, value) => {
    setSelectedDates(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    if (!selectedDates.pickupDate || !selectedDates.returnDate || !vehicle) return 0;
    
    const pickup = new Date(selectedDates.pickupDate);
    const returnDate = new Date(selectedDates.returnDate);
    const days = Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24));
    
    return days * vehicle.daily_rate;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('vehicleDetail.vehicleNotFound')}</h2>
          <p className="text-gray-600 mb-4">{t('vehicleDetail.vehicleNotFoundDesc')}</p>
          <Link to="/vehicles" className="btn-primary">
            {t('vehicleDetail.browseVehicles')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li><Link to="/vehicles" className="hover:text-blue-600">Vehicles</Link></li>
            <li>/</li>
            <li className="text-gray-900">{vehicle.make} {vehicle.model}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vehicle Image */}
          <div>
            <img
              src={vehicle.image_url || '/economy.jpg'}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-96 object-cover rounded-lg shadow-lg"
            />
          </div>

          {/* Vehicle Info */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                {isAuthenticated && isAdmin && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-outline flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                )}
              </div>
              <p className="text-xl text-blue-600 font-semibold mb-4">
                ${vehicle.daily_rate || vehicle.DailyRate} {t('vehicleDetail.perDay')}
              </p>
            </div>

            {/* Vehicle Details */}
            <div className="space-y-4">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-3" />
                <span>{vehicle.location}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Users className="h-5 w-5 mr-3" />
                <span>{vehicle.seats} {t('vehicleDetail.seats')}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Fuel className="h-5 w-5 mr-3" />
                <span>{vehicle.fuel_type}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Settings className="h-5 w-5 mr-3" />
                <span>{vehicle.transmission}</span>
              </div>
            </div>

            {/* Features */}
            {vehicle.features && vehicle.features.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('vehicleDetail.features')}</h3>
                <div className="flex flex-wrap gap-2">
                  {vehicle.features.map((feature, index) => (
                    <span key={index} className="feature-tag">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Form */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('vehicleDetail.bookThisVehicle')}</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t('vehicleDetail.pickupDate')}</label>
                    <input
                      type="date"
                      value={selectedDates.pickupDate}
                      onChange={(e) => handleDateChange('pickupDate', e.target.value)}
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('vehicleDetail.returnDate')}</label>
                    <input
                      type="date"
                      value={selectedDates.returnDate}
                      onChange={(e) => handleDateChange('returnDate', e.target.value)}
                      className="form-input"
                      min={selectedDates.pickupDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {selectedDates.pickupDate && selectedDates.returnDate && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('vehicleDetail.totalFor')} {Math.ceil((new Date(selectedDates.returnDate) - new Date(selectedDates.pickupDate)) / (1000 * 60 * 60 * 24))} {t('vehicleDetail.days')}:</span>
                      <span className="text-xl font-bold text-blue-600">${calculateTotal()}</span>
                    </div>
                  </div>
                )}

                <Link
                  to={`/booking/${vehicle.vehicle_id}?pickup=${selectedDates.pickupDate}&return=${selectedDates.returnDate}`}
                  className="btn-primary w-full text-center block"
                >
                  {t('vehicleDetail.proceedToBooking')}
                </Link>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('vehicleDetail.whatsIncluded')}</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-700">
                  <Shield className="h-5 w-5 mr-3 text-blue-600" />
                  <span>{t('vehicleDetail.comprehensiveInsurance')}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Clock className="h-5 w-5 mr-3 text-blue-600" />
                  <span>{t('vehicleDetail.roadsideAssistance')}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Star className="h-5 w-5 mr-3 text-blue-600" />
                  <span>{t('vehicleDetail.premiumService')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditing && isAuthenticated && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Edit Vehicle</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Category */}
                <div>
                  <label className="form-label">Category</label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => handleEditChange('categoryId', e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Category</option>
                    {categories?.map(category => (
                      <option key={category.category_id || category.categoryId} value={category.category_id || category.categoryId}>
                        {category.category_name || category.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fuel Type */}
                <div>
                  <label className="form-label">Fuel Type</label>
                  <select
                    value={editForm.fuelType}
                    onChange={(e) => handleEditChange('fuelType', e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Fuel Type</option>
                    <option value="Gasoline">Gasoline</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                    <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="form-label">Year</label>
                  <input
                    type="number"
                    value={editForm.year}
                    onChange={(e) => handleEditChange('year', e.target.value)}
                    className="form-input"
                    min="1900"
                    max="2100"
                  />
                </div>

                {/* Daily Rate */}
                <div>
                  <label className="form-label">Daily Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.dailyRate}
                    onChange={(e) => handleEditChange('dailyRate', e.target.value)}
                    className="form-input"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary"
                  disabled={updateMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDetail;
