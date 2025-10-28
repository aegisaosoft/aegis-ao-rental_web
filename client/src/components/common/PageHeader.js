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

/**
 * Common page header component for consistent page titles
 * @param {Object} props
 * @param {string} props.title - Main page title
 * @param {string} props.subtitle - Optional subtitle
 * @param {React.ReactNode} props.actions - Optional action buttons
 * @param {React.ReactNode} props.icon - Optional icon
 * @param {boolean} props.dark - If true, uses dark theme
 */
const PageHeader = ({ title, subtitle, actions, icon, dark = false }) => {
  return (
    <div className={`mb-8 ${dark ? 'text-white' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            {icon && <div className={dark ? 'text-yellow-400' : 'text-blue-600'}>{icon}</div>}
            <h1 className={`text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className={`${dark ? 'text-gray-300' : 'text-gray-600'} text-lg`}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center space-x-4">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;

