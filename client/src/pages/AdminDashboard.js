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
// import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { Car, Users, Calendar, DollarSign, TrendingUp } from 'lucide-react';
// import { apiService } from '../services/api';

const AdminDashboard = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();

  // const { data: dashboardData, isLoading } = useQuery(
  //   'adminDashboard',
  //   () => apiService.getAdminDashboard(),
  //   {
  //     enabled: isAuthenticated && isAdmin
  //   }
  // );

  // Temporary defaults while API endpoint is not implemented
  const isLoading = false;
  const dashboardData = {
    recentVehicles: [],
    recentReservations: [],
    recentCustomers: []
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
          <p className="text-gray-600">You need to be logged in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Vehicles',
      value: dashboardData?.recentVehicles?.length || 0,
      icon: Car,
      color: 'text-blue-600'
    },
    {
      name: 'Active Reservations',
      value: dashboardData?.recentReservations?.length || 0,
      icon: Calendar,
      color: 'text-green-600'
    },
    {
      name: 'Total Customers',
      value: dashboardData?.recentCustomers?.length || 0,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      name: 'Revenue',
      value: '$0',
      icon: DollarSign,
      color: 'text-yellow-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Vehicles */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Vehicles</h3>
            </div>
            <div className="p-6">
              {dashboardData?.recentVehicles?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentVehicles.slice(0, 5).map((vehicle) => (
                    <div key={vehicle.vehicle_id} className="flex items-center space-x-4">
                      <img
                        src={vehicle.image_url || '/economy.jpg'}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-15 h-11 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h4>
                        <p className="text-sm text-gray-600">${vehicle.daily_rate}/day</p>
                      </div>
                      <span className={`px-2 py-1 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {vehicle.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No vehicles found</p>
              )}
            </div>
          </div>

          {/* Recent Reservations */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Reservations</h3>
            </div>
            <div className="p-6">
              {dashboardData?.recentReservations?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentReservations.slice(0, 5).map((reservation) => (
                    <div key={reservation.reservation_id} className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          #{reservation.reservation_number}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {reservation.customer_name} - {reservation.vehicle_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(reservation.pickup_date).toLocaleDateString()} - {new Date(reservation.return_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${reservation.total_amount}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          reservation.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : reservation.status === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {reservation.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No reservations found</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn-primary flex items-center justify-center">
              <Car className="h-4 w-4 mr-2" />
              Add Vehicle
            </button>
            <button className="btn-outline flex items-center justify-center">
              <Users className="h-4 w-4 mr-2" />
              Manage Customers
            </button>
            <button className="btn-secondary flex items-center justify-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
