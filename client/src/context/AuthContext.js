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

  // Initialize authentication by checking session
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[AuthContext] Checking session status...');
        const response = await apiService.getProfile();
        console.log('[AuthContext] ✅ Session is valid, user authenticated');
        console.log('[AuthContext] User data:', response.data);
        setUser(response.data);
      } catch (error) {
        // 401/403 means no valid session - this is normal for unauthenticated users
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('[AuthContext] ⚠️ No valid session found (401/403)');
          console.log('[AuthContext] Error response:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          setUser(null);
        } else {
          console.error('[AuthContext] ❌ Error checking session:', error);
          console.error('[AuthContext] Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay on mount to ensure session cookies are available
    // This is especially important after a page reload following QR code scan
    const timer = setTimeout(() => {
      initAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);
      
      // Token is stored in session on the server - no need to store in localStorage
      // Fetch full user profile to ensure complete authentication
      try {
        const profileResponse = await apiService.getProfile();
        if (profileResponse.data) {
          setUser(profileResponse.data);
        }
      } catch (profileError) {
        // If profile fetch fails, try to use user data from login response
        if (response.data.result?.user) {
          setUser(response.data.result.user);
        } else if (response.data.user) {
          setUser(response.data.user);
        } else {
          throw profileError;
        }
        console.warn('Failed to fetch user profile after login, using login response data:', profileError);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiService.register(userData);
      
      // Token is stored in session on the server - no need to store in localStorage
      // Fetch full user profile to ensure complete authentication
      try {
        const profileResponse = await apiService.getProfile();
        if (profileResponse.data) {
          setUser(profileResponse.data);
        }
      } catch (profileError) {
        // If profile fetch fails, try to use user data from register response
        if (response.data.result?.user) {
          setUser(response.data.result.user);
        } else if (response.data.user) {
          setUser(response.data.user);
        } else {
          throw profileError;
        }
        console.warn('Failed to fetch user profile after registration, using register response data:', profileError);
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

  const value = {
    user,
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
