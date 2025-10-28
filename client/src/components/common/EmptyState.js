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
import { Link } from 'react-router-dom';

/**
 * Common empty state component
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {string} props.title - Main message
 * @param {string} props.message - Detailed message
 * @param {string} props.actionText - Optional action button text
 * @param {string} props.actionLink - Optional action button link
 * @param {Function} props.onAction - Optional action button click handler
 */
const EmptyState = ({ icon, title, message, actionText, actionLink, onAction }) => {
  return (
    <div className="text-center py-12">
      {icon && <div className="flex justify-center mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      {actionText && (
        actionLink ? (
          <Link to={actionLink} className="btn-primary inline-block">
            {actionText}
          </Link>
        ) : (
          <button onClick={onAction} className="btn-primary">
            {actionText}
          </button>
        )
      )}
    </div>
  );
};

export default EmptyState;

