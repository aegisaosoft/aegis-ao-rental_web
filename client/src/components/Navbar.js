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
import { Menu, X, User, Car, Calendar, Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import LanguageSwitcher from './LanguageSwitcher';
import { translatedApiService as apiService } from '../services/translatedApi';
import { getLanguageForCountry } from '../utils/countryLanguage';
import { useCompany } from '../context/CompanyContext';

const Navbar = () => {
  // Get company context from domain only
  const { companyConfig } = useCompany();
  
  // Get company name from company config, or show "Unknown"
  const displayCompanyName = companyConfig?.companyName || 'Unknown';
  
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, isMainAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Language is now set by CompanyContext when company config loads
  // No need to set language here - it's handled centrally

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleUserMenu = () => setUserMenuOpen(!userMenuOpen);

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
            
            {/* Company Display - Static text only */}
            <span className="text-xl font-bold text-gray-900">
              {displayCompanyName || 'Unknown'}
            </span>
            
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              {t('nav.home')}
            </Link>
            {isAuthenticated && (
              <Link to="/my-bookings" className="text-gray-700 hover:text-blue-600 transition-colors">
                {t('nav.myBookings')}
              </Link>
            )}
          </div>

          {/* Language Switcher - Always Visible */}
          <div className="hidden md:flex">
            <LanguageSwitcher />
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Main Admin Dashboard Button - Only for Main Admin */}
                {isMainAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-gray-100"
                    title={t('nav.adminDashboard')}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                  </Link>
                )}

                {/* Settings Button */}
                <Link
                  to="/settings"
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-gray-100"
                  title={t('nav.settings')}
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
                      {t('nav.profile')}
                    </Link>
                    <Link
                      to="/my-bookings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('nav.myBookings')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('nav.logout')}
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
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  {t('nav.signUp')}
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
                {t('nav.home')}
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/my-bookings"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.myBookings')}
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.profile')}
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('nav.settings')}
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {t('nav.adminDashboard')}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    {t('nav.logout')}
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
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.signUp')}
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
