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
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail } from 'lucide-react';
import { apiService } from '../services/api';

const Booking = () => {
  const { vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    pickupDate: searchParams.get('pickup') || '',
    returnDate: searchParams.get('return') || '',
    pickupLocation: '',
    returnLocation: '',
    additionalNotes: ''
  });

  const { data: vehicle, isLoading } = useQuery(
    ['vehicle', vehicleId],
    () => apiService.getVehicle(vehicleId),
    {
      enabled: !!vehicleId
    }
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateTotal = () => {
    if (!formData.pickupDate || !formData.returnDate || !vehicle) return 0;
    
    const pickup = new Date(formData.pickupDate);
    const returnDate = new Date(formData.returnDate);
    const days = Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24));
    
    return days * vehicle.daily_rate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to make a booking');
      navigate('/login');
      return;
    }

    if (!formData.pickupDate || !formData.returnDate) {
      toast.error('Please select pickup and return dates');
      return;
    }

    try {
      const bookingData = {
        vehicleId,
        pickupDate: formData.pickupDate,
        returnDate: formData.returnDate,
        pickupLocation: formData.pickupLocation,
        returnLocation: formData.returnLocation,
        additionalNotes: formData.additionalNotes
      };

      await apiService.createReservation(bookingData);
      toast.success('Booking created successfully!');
      navigate('/my-bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Vehicle Not Found</h2>
          <p className="text-gray-600">The vehicle you're trying to book doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Your Booking</h1>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Vehicle Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Vehicle Details</h3>
                  <div className="flex items-center space-x-4">
                    <img
                      src={`/models/${(vehicle.make || '').toUpperCase()}_${(vehicle.model || '').toUpperCase().replace(/\s+/g, '_')}.png`}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-20 h-15 object-cover rounded"
                      onError={(e) => {
                        // Fallback to vehicle image_url or economy.jpg
                        const fallback = vehicle.image_url || '/economy.jpg';
                        if (!e.target.src.includes(fallback.replace('/', ''))) {
                          e.target.src = fallback;
                        }
                      }}
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="text-gray-600">${vehicle.daily_rate} per day</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Pickup Date</label>
                    <input
                      type="date"
                      name="pickupDate"
                      value={formData.pickupDate}
                      onChange={handleChange}
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Return Date</label>
                    <input
                      type="date"
                      name="returnDate"
                      value={formData.returnDate}
                      onChange={handleChange}
                      className="form-input"
                      min={formData.pickupDate || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>

                {/* Locations */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Pickup Location</label>
                    <input
                      type="text"
                      name="pickupLocation"
                      value={formData.pickupLocation}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Enter pickup location"
                    />
                  </div>
                  <div>
                    <label className="form-label">Return Location</label>
                    <input
                      type="text"
                      name="returnLocation"
                      value={formData.returnLocation}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Enter return location"
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="form-label">Additional Notes</label>
                  <textarea
                    name="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={handleChange}
                    rows={3}
                    className="form-input"
                    placeholder="Any special requests or notes..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary"
                >
                  Complete Booking
                </button>
              </form>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle</span>
                  <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Rate</span>
                  <span className="font-medium">${vehicle.daily_rate}</span>
                </div>
                
                {formData.pickupDate && formData.returnDate && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium">
                        {Math.ceil((new Date(formData.returnDate) - new Date(formData.pickupDate)) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span className="text-blue-600">${calculateTotal()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Info */}
              {user && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-gray-900 mb-2">Booking for</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span>{user.firstName} {user.lastName}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
