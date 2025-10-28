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

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, Car, Calendar, Settings, LogOut } from 'lucide-react';
import { useQuery } from 'react-query';
import { apiService } from '../services/api';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch companies
  const { data: companiesResponse } = useQuery('companies', () => apiService.getCompanies({ isActive: true, pageSize: 100 }));
  const companiesData = companiesResponse?.data || companiesResponse;
  const companies = Array.isArray(companiesData) ? companiesData : [];

  const handleLogout = () => {
    // Company selection persists through logout
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };


  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleUserMenu = () => setUserMenuOpen(!userMenuOpen);

  const handleCompanyChange = (e) => {
    try {
      const companyId = e.target.value;
      
      // Only allow company changes through the combobox
      if (!e.target || e.target.tagName !== 'SELECT') {
        console.warn('Company change attempted through invalid method');
        return;
      }
      
      setSelectedCompanyId(companyId);
      
      // Persist company selection to localStorage
      if (companyId) {
        localStorage.setItem('selectedCompanyId', companyId);
      } else {
        localStorage.removeItem('selectedCompanyId');
      }
      
      // Update URL with company filter for current page
      const params = new URLSearchParams(location.search);
      if (companyId) {
        params.set('companyId', companyId);
      } else {
        params.delete('companyId');
      }
      
      // Navigate with company filter - this is the core value for all filters
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      
    } catch (error) {
      console.error('Error in company change handler:', error);
      // Don't change company selection on error
    }
  };

  // Sync with URL params and localStorage
  useEffect(() => {
    // Get companyId from URL params first
    const urlParams = new URLSearchParams(location.search);
    const urlCompanyId = urlParams.get('companyId') || '';
    
    // Get companyId from localStorage as fallback
    const storedCompanyId = localStorage.getItem('selectedCompanyId') || '';
    
    // Use URL param if available, otherwise use stored value
    const companyId = urlCompanyId || storedCompanyId;
    
    if (companyId && companyId !== selectedCompanyId) {
      setSelectedCompanyId(companyId);
      
      // If URL doesn't have companyId but localStorage does, update URL
      if (!urlCompanyId && storedCompanyId) {
        const params = new URLSearchParams(location.search);
        params.set('companyId', storedCompanyId);
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      }
    } else if (!companyId && selectedCompanyId) {
      // Clear selection if no companyId in URL or localStorage
      setSelectedCompanyId('');
    }
  }, [location.pathname, location.search, navigate, selectedCompanyId]);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Company filter and Logo */}
          <div className="flex items-center space-x-2">
            {/* Logo icon */}
            <Link to="/" className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-blue-600" />
            </Link>
            
            {/* Company Filter - replacing "Aegis-AO" */}
            <select
              value={selectedCompanyId}
              onChange={handleCompanyChange}
              className="text-xl font-bold text-gray-900 border-0 bg-transparent focus:ring-0 focus:outline-none cursor-pointer"
            >
              <option value="">All</option>
              {companies?.map(company => (
                <option key={company.company_id || company.companyId} value={company.company_id || company.companyId}>
                  {company.company_name || company.companyName}
                </option>
              ))}
            </select>
            
            {/* Rentals text */}
            <span className="text-xl font-bold text-gray-900">Rentals</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link to="/vehicles" className="text-gray-700 hover:text-blue-600 transition-colors">
              Vehicles
            </Link>
            {isAuthenticated && (
              <Link to="/my-bookings" className="text-gray-700 hover:text-blue-600 transition-colors">
                My Bookings
              </Link>
            )}
            {isAuthenticated && user?.isAdmin && (
              <Link to="/admin" className="text-gray-700 hover:text-blue-600 transition-colors">
                Admin
              </Link>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Settings Button */}
                <Link
                  to="/settings"
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-gray-100"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                
                <div className="relative">
                  <button
                    onClick={toggleUserMenu}
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span>{user?.firstName}</span>
                  </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/my-bookings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      My Bookings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
              <Link
                to="/"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/vehicles"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Vehicles
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/my-bookings"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    My Bookings
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Logout
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
