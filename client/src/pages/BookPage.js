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
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Car, Users, Fuel, Settings, Shield, Clock, Star, ArrowLeft } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';

const BookPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Get filters from URL
  const categoryId = searchParams.get('category');
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const companyId = searchParams.get('companyId') || localStorage.getItem('selectedCompanyId');

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [formData, setFormData] = useState({
    pickupDate: '',
    returnDate: '',
    pickupLocation: '',
    returnLocation: '',
    additionalNotes: ''
  });

  // Fetch available vehicles matching the model filters
  const { data: vehiclesResponse, isLoading: vehiclesLoading } = useQuery(
    ['vehicles', { categoryId, make, model, companyId, status: 'Available' }],
    () => apiService.getVehicles({
      categoryId,
      make,
      model,
      companyId,
      status: 'Available',
      pageSize: 50
    }),
    {
      enabled: !!(make && model),
      retry: 1
    }
  );

  // Ensure vehicles is always an array
  const vehiclesData = vehiclesResponse?.data || vehiclesResponse;
  const vehicles = Array.isArray(vehiclesData?.items) 
    ? vehiclesData.items 
    : Array.isArray(vehiclesData) 
      ? vehiclesData 
      : Array.isArray(vehiclesResponse)
        ? vehiclesResponse
        : [];
  
  const selectedVehicle = Array.isArray(vehicles) ? vehicles.find(v => 
    (v.vehicle_id || v.vehicleId || v.id) === selectedVehicleId
  ) : null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateTotal = () => {
    if (!formData.pickupDate || !formData.returnDate || !selectedVehicle) return 0;
    
    const pickup = new Date(formData.pickupDate);
    const returnDate = new Date(formData.returnDate);
    const days = Math.max(1, Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)));
    
    const dailyRate = selectedVehicle.daily_rate || selectedVehicle.dailyRate || 0;
    return days * dailyRate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to make a booking');
      navigate('/login', { state: { returnTo: `/book?${searchParams.toString()}` } });
      return;
    }

    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }

    if (!formData.pickupDate || !formData.returnDate) {
      toast.error('Please select pickup and return dates');
      return;
    }

    const pickupDate = new Date(formData.pickupDate);
    const returnDate = new Date(formData.returnDate);

    if (returnDate <= pickupDate) {
      toast.error('Return date must be after pickup date');
      return;
    }

    try {
      if (!Array.isArray(vehicles)) {
        toast.error('Vehicle data is not available');
        return;
      }

      const vehicle = vehicles.find(v => 
        (v.vehicle_id || v.vehicleId || v.id) === selectedVehicleId
      );

      if (!vehicle) {
        toast.error('Selected vehicle not found');
        return;
      }

      const bookingData = {
        vehicleId: vehicle.vehicle_id || vehicle.vehicleId || vehicle.id,
        companyId: vehicle.company_id || vehicle.companyId || companyId,
        customerId: user.id || user.customer_id || user.customerId,
        pickupDate: formData.pickupDate,
        returnDate: formData.returnDate,
        pickupLocation: formData.pickupLocation || vehicle.location || '',
        returnLocation: formData.returnLocation || vehicle.location || '',
        dailyRate: vehicle.daily_rate || vehicle.dailyRate || 0,
        taxAmount: 0,
        insuranceAmount: 0,
        additionalFees: 0,
        additionalNotes: formData.additionalNotes
      };

      await apiService.createReservation(bookingData);
      toast.success('Booking created successfully!');
      navigate('/my-bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
      console.error('Booking error:', error);
    }
  };

  if (!make || !model) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Model Selected</h2>
          <p className="text-gray-600 mb-4">Please select a vehicle model to book.</p>
          <Link to="/" className="btn-primary">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Book {make} {model}
          </h1>
          <p className="text-gray-600">Select a vehicle and complete your booking</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Vehicle Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Available Vehicles */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Vehicles</h2>
              
              {vehiclesLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading vehicles...</p>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No available vehicles found for this model.</p>
                  <Link to="/vehicles" className="btn-primary mt-4 inline-block">
                    Browse All Vehicles
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {vehicles.map((vehicle) => {
                    const vehicleId = vehicle.vehicle_id || vehicle.vehicleId || vehicle.id;
                    const isSelected = selectedVehicleId === vehicleId;
                    const imageUrl = vehicle.image_url || vehicle.imageUrl || '/economy.jpg';
                    const dailyRate = vehicle.daily_rate || vehicle.dailyRate || 0;
                    
                    return (
                      <div
                        key={vehicleId}
                        onClick={() => setSelectedVehicleId(vehicleId)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex gap-4">
                          <img
                            src={imageUrl}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            className="w-32 h-24 object-cover rounded"
                            onError={(e) => {
                              e.target.src = '/economy.jpg';
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </h3>
                                {vehicle.color && (
                                  <p className="text-sm text-gray-600">Color: {vehicle.color}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-blue-600">
                                  ${parseFloat(dailyRate).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">per day</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mt-3">
                              {vehicle.seats && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Users className="h-4 w-4 mr-1" />
                                  {vehicle.seats} seats
                                </div>
                              )}
                              {vehicle.fuel_type && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Fuel className="h-4 w-4 mr-1" />
                                  {vehicle.fuel_type}
                                </div>
                              )}
                              {vehicle.transmission && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Settings className="h-4 w-4 mr-1" />
                                  {vehicle.transmission}
                                </div>
                              )}
                            </div>

                            {vehicle.features && vehicle.features.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {vehicle.features.slice(0, 3).map((feature, idx) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              {selectedVehicle ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Date *
                      </label>
                      <input
                        type="date"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleChange}
                        min={today}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Return Date *
                      </label>
                      <input
                        type="date"
                        name="returnDate"
                        value={formData.returnDate}
                        onChange={handleChange}
                        min={formData.pickupDate || today}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Location
                      </label>
                      <input
                        type="text"
                        name="pickupLocation"
                        value={formData.pickupLocation}
                        onChange={handleChange}
                        placeholder={selectedVehicle.location || 'Location'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Return Location
                      </label>
                      <input
                        type="text"
                        name="returnLocation"
                        value={formData.returnLocation}
                        onChange={handleChange}
                        placeholder={selectedVehicle.location || 'Location'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes
                      </label>
                      <textarea
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Special requests or notes..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {formData.pickupDate && formData.returnDate && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">
                            {Math.max(1, Math.ceil((new Date(formData.returnDate) - new Date(formData.pickupDate)) / (1000 * 60 * 60 * 24)))} days
                          </span>
                          <span className="text-xl font-bold text-blue-600">
                            ${calculateTotal().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full btn-primary py-3 text-lg"
                      disabled={!isAuthenticated}
                    >
                      {isAuthenticated ? 'Complete Booking' : 'Login to Book'}
                    </button>

                    {!isAuthenticated && (
                      <p className="text-sm text-center text-gray-600">
                        <Link to="/login" className="text-blue-600 hover:underline">
                          Sign in
                        </Link> to complete your booking
                      </p>
                    )}
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Please select a vehicle to continue</p>
                </div>
              )}

              {/* Benefits */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">What's Included</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="h-4 w-4 mr-2 text-blue-600" />
                    Comprehensive Insurance
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2 text-blue-600" />
                    24/7 Roadside Assistance
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="h-4 w-4 mr-2 text-blue-600" />
                    Premium Service
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookPage;

