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
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { label: 'home', to: '/' },
  { label: 'about', to: '/about' },
  { label: 'terms', to: '/terms' },
  { label: 'contact', to: '/locations' },
];

const Navbar = () => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  const { isAuthenticated, canAccessDashboard, isMainAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  const logoUrl = companyConfig?.logoUrl || companyConfig?.logo || '';

  // Check if user can see dashboard for current company
  const canSeeDashboard = () => {
    if (!canAccessDashboard) return false;
    
    // Main admin can see dashboard for all companies
    if (isMainAdmin) return true;
    
    // Workers and admins can only see dashboard for their own company
    const userCompanyId = user?.companyId || user?.CompanyId;
    const currentCompanyId = companyConfig?.id || companyConfig?.Id;
    
    // Show dashboard icon only if viewing their own company
    return userCompanyId && currentCompanyId && userCompanyId === currentCompanyId;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderNavLinks = () => (
    <nav className="flex items-center gap-10 text-xs font-semibold uppercase tracking-[0.35em] text-slate-900">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="transition-colors duration-150 hover:text-blue-600"
        >
          {t(`navbar.${item.label}`, item.label)}
        </Link>
      ))}
      {isAuthenticated && (
        <>
          <Link
            to="/settings"
            className="flex items-center gap-2 transition-colors duration-150 hover:text-blue-600"
            title={t('navbar.settings')}
            aria-label={t('navbar.settings')}
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
          {canSeeDashboard() && (
            <Link
              to="/admin"
              className="flex items-center gap-2 transition-colors duration-150 hover:text-blue-600"
              title={t('navbar.dashboard')}
              aria-label={t('navbar.dashboard')}
            >
              <LayoutDashboard className="h-4 w-4" />
            </Link>
          )}
        </>
      )}
    </nav>
  );

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 gap-6">
        {/* Left Section - Logo and Title (far left) - clickable to home */}
        <Link to="/" className="flex items-center gap-4 flex-shrink-0 min-w-0 max-w-[50%] hover:opacity-80 transition-opacity">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={companyConfig?.companyName || 'Company logo'}
              className="h-16 w-auto object-contain flex-shrink-0"
            />
          )}
          <span className="text-xl font-semibold tracking-wide text-gray-900 truncate block overflow-hidden text-ellipsis whitespace-nowrap">
            {companyConfig?.companyName || 'M.L.C RENT CARS'}
          </span>
        </Link>

        {/* Right Section - Navigation Links and Buttons */}
        <div className="hidden items-center gap-10 md:flex flex-shrink-0">
          {renderNavLinks()}
          <div className="flex items-center gap-6">
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-900">
              <LanguageSwitcher />
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-900 transition-colors duration-150 hover:text-blue-600"
              >
                {t('navbar.logout')}
              </button>
            ) : (
              <Link
                to="/login"
                className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-900 transition-colors duration-150 hover:text-blue-600"
              >
                {t('navbar.login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
