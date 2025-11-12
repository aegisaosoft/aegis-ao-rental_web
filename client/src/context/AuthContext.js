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

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await apiService.getProfile();
          setUser(response.data);
        } catch (error) {
          // 401/403 during initialization just means token is invalid/expired - not an error
          // Only log other errors (401 = Unauthorized, 403 = Forbidden - both mean invalid token)
          if (error.response?.status !== 401 && error.response?.status !== 403) {
            console.error('Auth initialization error:', error);
          }
          // Clear invalid/expired token for both 401 and 403
          localStorage.removeItem('token');
          clearStoredFilterDates();
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);
      const token = response.data.result?.token || response.data.token;
      
      localStorage.setItem('token', token);
      setToken(token);
      
      // Set user data from login response (new format includes user in result)
      if (response.data.result?.user) {
        setUser(response.data.result.user);
      } else if (response.data.user) {
        // Fallback for old format
        setUser(response.data.user);
      }
      
      // Fetch full user profile to ensure complete authentication
      try {
        const profileResponse = await apiService.getProfile();
        if (profileResponse.data) {
          setUser(profileResponse.data);
        }
      } catch (profileError) {
        // If profile fetch fails, continue with user data from login response
        // This is not critical - user is still authenticated with token
        console.warn('Failed to fetch user profile after login:', profileError);
      }
      
      // Company selection persists through login
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiService.register(userData);
      const token = response.data.result?.token || response.data.token;
      
      localStorage.setItem('token', token);
      setToken(token);
      
      // Set user data from register response (new format includes user in result)
      if (response.data.result?.user) {
        setUser(response.data.result.user);
      } else if (response.data.user) {
        // Fallback for old format
        setUser(response.data.user);
      }
      
      // Fetch full user profile to ensure complete authentication
      try {
        const profileResponse = await apiService.getProfile();
        if (profileResponse.data) {
          setUser(profileResponse.data);
        }
      } catch (profileError) {
        // If profile fetch fails, continue with user data from register response
        // This is not critical - user is still authenticated with token
        console.warn('Failed to fetch user profile after registration:', profileError);
      }
      
      // Company selection persists through register
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    clearStoredFilterDates();
    setToken(null);
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

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'mainadmin',
    isMainAdmin: user?.role === 'mainadmin',
    isWorker: user?.role === 'worker'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
