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

import React, { createContext, useContext, useState } from 'react';
import { apiService } from '../services/api';
import { clearStoredFilterDates } from '../utils/rentalSearchFilters';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const loading = false; // Always false - no auto-check on load

  // Do NOT automatically check session on mount - app must start logged out
  // User must explicitly log in to be authenticated

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);
      
      // Token is stored in session on the server - no need to store in localStorage
      // User data comes with the login response - use it directly
      // DO NOT call getProfile - user data is already in login response and stored in session
      const userData = response.data.result?.user || response.data.user;
      
      if (userData) {
        // Use user data from login response directly - NO profile call needed
        setUser(userData);
        return response.data;
      } else {
        // This should not happen - login response should always include user data
        throw new Error('Login response missing user data');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiService.register(userData);
      
      // Token is stored in session on the server - no need to store in localStorage
      // User data comes with the register response - use it directly
      // DO NOT call getProfile - user data is already in register response and stored in session
      const userDataFromResponse = response.data.result?.user || response.data.user;
      
      if (userDataFromResponse) {
        // Use user data from register response directly - NO profile call needed
        setUser(userDataFromResponse);
      } else {
        // This should not happen - register response should always include user data
        throw new Error('Register response missing user data');
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to destroy session on server
      await apiService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    }
    
    clearStoredFilterDates();
    setUser(null);
    
    // Company selection persists through logout
  };


  const updateProfile = async (profileData) => {
    try {
      const response = await apiService.updateProfile(profileData);
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Restore user data (e.g., after Stripe redirect) - updates AuthContext without API call
  const restoreUser = (userData) => {
    if (userData) {
      setUser(userData);
    }
  };

  // Get company ID from user object - this is a global parameter like subdomain
  const currentCompanyId = user?.companyId || user?.CompanyId;

  const value = {
    user,
    loading, // Add loading state to context
    login,
    register,
    logout,
    updateProfile,
    restoreUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'mainadmin',
    isMainAdmin: user?.role === 'mainadmin',
    isWorker: user?.role === 'worker',
    canAccessDashboard: user?.role === 'admin' || user?.role === 'mainadmin' || user?.role === 'worker',
    currentCompanyId // Global company ID from authenticated user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
