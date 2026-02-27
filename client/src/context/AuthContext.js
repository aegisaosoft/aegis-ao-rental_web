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
  // Restore user from localStorage on mount (survives page reload / external redirects)
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('authUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const loading = false;

  // Helper: persist auth data to localStorage
  const persistAuth = (token, userData) => {
    try {
      if (token) localStorage.setItem('authToken', token);
      if (userData) localStorage.setItem('authUser', JSON.stringify(userData));
    } catch (e) {
      console.warn('[Auth] Failed to persist auth to localStorage:', e.message);
    }
  };

  // Helper: clear auth data from localStorage
  const clearAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);

      const userData = response.data.result?.user || response.data.user;
      const token = response.data.result?.token || response.data.token;

      if (userData) {
        setUser(userData);
        persistAuth(token, userData);
        return response.data;
      } else {
        throw new Error('Login response missing user data');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiService.register(userData);

      const userDataFromResponse = response.data.result?.user || response.data.user;
      const token = response.data.result?.token || response.data.token;

      if (userDataFromResponse) {
        setUser(userDataFromResponse);
        persistAuth(token, userDataFromResponse);
      } else {
        throw new Error('Register response missing user data');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    }

    clearStoredFilterDates();
    clearAuth();
    setUser(null);
  };


  const updateProfile = async (profileData) => {
    try {
      const response = await apiService.updateProfile(profileData);
      setUser(response.data);
      persistAuth(null, response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Restore user data (e.g., after Stripe redirect) - updates AuthContext and localStorage
  const restoreUser = (userData) => {
    if (userData) {
      setUser(userData);
      persistAuth(null, userData);
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
