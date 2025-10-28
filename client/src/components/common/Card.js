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
 * Common card component for consistent content sections
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.title - Optional card title
 * @param {React.ReactNode} props.headerActions - Optional header actions
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.noPadding - If true, removes padding from content
 */
const Card = ({ children, title, headerActions, className = '', noPadding = false }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

export default Card;

