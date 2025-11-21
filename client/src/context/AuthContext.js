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

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const [loading, setLoading] = useState(false); // No loading on app start - auth state determined lazily
  const isFirstMount = useRef(true);

  // NO initAuth call - user state is determined lazily:
  // 1. When user logs in/registers - user data comes from response
  // 2. When accessing protected routes - 401 means not logged in
  // 3. When explicitly checking profile - only if needed
  // This eliminates unnecessary profile calls on app load

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
        console.log('[AuthContext] ✅ User data set from login response - NO profile call');
        return response.data;
      } else {
        // This should not happen - login response should always include user data
        console.error('[AuthContext] ❌ No user data in login response - this is unexpected');
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
        console.log('[AuthContext] ✅ User data set from register response - NO profile call');
      } else {
        // This should not happen - register response should always include user data
        console.error('[AuthContext] ❌ No user data in register response - this is unexpected');
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
      console.error('Error during logout:', error);
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
      console.log('[AuthContext] ✅ User data restored, role:', userData.role);
    }
  };

  // Get company ID from user object - this is a global parameter like subdomain
  const currentCompanyId = user?.companyId || user?.CompanyId;

  const value = {
    user,
    loading,
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
