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
 * Common loading spinner component
 * @param {Object} props
 * @param {boolean} props.fullScreen - If true, centers spinner in full screen
 * @param {string} props.size - Size of spinner: 'sm', 'md', 'lg'
 * @param {string} props.text - Optional loading text
 */
const LoadingSpinner = ({ fullScreen = false, size = 'md', text }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const spinner = (
    <div className="flex flex-col items-center">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      {text && <p className="mt-4 text-gray-600">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex justify-center py-8">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;

