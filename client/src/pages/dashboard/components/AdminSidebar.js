/*
 * AdminSidebar - Navigation sidebar for Admin Dashboard
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React from 'react';
import {
  Building2,
  Car,
  Users,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { Card } from '../../../components/common';

// Facebook Icon
const FacebookIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
  </svg>
);

// Instagram Icon
const InstagramIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

/**
 * AdminSidebar component
 */
const AdminSidebar = ({
  t,
  activeSection,
  setActiveSection,
  isAdmin,
  isMainAdmin,
  isUSCompany,
  isEditing = false,
}) => {
  // Helper to check if a section is active
  const isActive = (section) => activeSection === section;

  return (
    <div className="col-span-3">
      <Card title={t('admin.navigation')} className="sticky top-4">
        <div className="space-y-1">
          {/* Company Profile - Admin only */}
          {isAdmin && (
            <button
              onClick={() => setActiveSection('company')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('company')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('admin.companyProfile')}
              aria-label={t('admin.companyProfile')}
            >
              <Building2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('admin.companyProfile')}</span>
            </button>
          )}

          {/* Reservations - All roles can see and edit */}
          <button
            onClick={() => setActiveSection('reservations')}
            className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
              isActive('reservations')
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            disabled={isEditing}
            title={t('admin.reservations')}
            aria-label={t('admin.reservations')}
          >
            <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm">{t('admin.reservations')}</span>
          </button>

          {/* Violations - Only visible for USA companies */}
          {isUSCompany && (
            <button
              onClick={() => setActiveSection('violations')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('violations')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('admin.violations', 'Violations')}
              aria-label={t('admin.violations', 'Violations')}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('admin.violations', 'Violations')}</span>
            </button>
          )}

          {/* Disputes - Admin only */}
          {isAdmin && (
            <button
              onClick={() => setActiveSection('disputes')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('disputes')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('admin.disputes.title', 'Disputes')}
              aria-label={t('admin.disputes.title', 'Disputes')}
            >
              <Shield className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('admin.disputes.title', 'Disputes')}</span>
            </button>
          )}

          {/* Vehicles (Daily Rates) - All roles can see (workers: view only) */}
          <button
            onClick={() => setActiveSection('vehicles')}
            className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
              isActive('vehicles')
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            disabled={isEditing}
            title={t('admin.dailyRates', 'Daily Rates')}
            aria-label={t('admin.dailyRates', 'Daily Rates')}
          >
            <Car className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm">{t('admin.dailyRates', 'Daily Rates')}</span>
          </button>

          {/* Vehicle Management - Admin and MainAdmin */}
          {(isAdmin || isMainAdmin) && (
            <button
              onClick={() => setActiveSection('vehicleManagement')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('vehicleManagement')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('vehicles.vehicleManagement', 'Vehicle Management')}
              aria-label={t('vehicles.vehicleManagement', 'Vehicle Management')}
            >
              <Car className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('vehicles.vehicleManagement', 'Vehicles')}</span>
            </button>
          )}

          {/* Employees - Admin only */}
          {isAdmin && (
            <button
              onClick={() => setActiveSection('employees')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('employees')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('admin.employees', 'Employees')}
              aria-label={t('admin.employees', 'Employees')}
            >
              <Users className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('admin.employees', 'Employees')}</span>
            </button>
          )}

          {/* Additional Services - Admin only */}
          {isAdmin && (
            <button
              onClick={() => setActiveSection('additionalServices')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('additionalServices')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('admin.additionalServices')}
              aria-label={t('admin.additionalServices')}
            >
              <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('admin.additionalServices')}</span>
            </button>
          )}

          {/* Reports - Admin only */}
          {isAdmin && (
            <button
              onClick={() => setActiveSection('reports')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('reports')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('admin.viewReports')}
              aria-label={t('admin.viewReports')}
            >
              <TrendingUp className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('admin.viewReports')}</span>
            </button>
          )}

          {/* Meta Integration - Admin and MainAdmin only */}
          {(isAdmin || isMainAdmin) && (
            <button
              onClick={() => setActiveSection('meta')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('meta')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('admin.metaIntegration', 'Meta')}
              aria-label={t('admin.metaIntegration', 'Meta')}
            >
              <FacebookIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('admin.metaIntegration', 'Meta')}</span>
            </button>
          )}

          {/* Instagram Campaign - Admin and MainAdmin only */}
          {(isAdmin || isMainAdmin) && (
            <button
              onClick={() => setActiveSection('instagram')}
              className={`w-full px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                isActive('instagram')
                  ? 'bg-pink-100 text-pink-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isEditing}
              title={t('admin.instagramCampaign', 'Instagram')}
              aria-label={t('admin.instagramCampaign', 'Instagram')}
            >
              <InstagramIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{t('admin.instagramCampaign', 'Instagram')}</span>
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminSidebar;
