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
 * Common page container component for consistent layout across all pages
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {boolean} props.fullWidth - If true, removes max-width constraint
 * @param {string} props.className - Additional CSS classes
 */
const PageContainer = ({ children, fullWidth = false, className = '' }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`${fullWidth ? '' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;

