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
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/config'; // Initialize i18n
import App from './App';

// Safe .includes() utility to prevent ".includes is not a function" errors
window.safeIncludes = function(str, searchString) {
  if (typeof str === 'string' && typeof searchString === 'string') {
    return str.includes(searchString);
  }
  return false;
};

// Suppress harmless browser extension errors
// These errors occur when browser extensions (like React DevTools, Redux DevTools, etc.)
// try to communicate with the page but the message channel closes before a response is received
window.addEventListener('error', (event) => {
  if (
    event.message &&
    typeof event.message === 'string' &&
    event.message.includes('message channel closed before a response was received')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Also handle unhandled promise rejections with the same message
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason &&
    typeof event.reason === 'object' &&
    event.reason.message &&
    typeof event.reason.message === 'string' &&
    event.reason.message.includes('message channel closed before a response was received')
  ) {
    event.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
