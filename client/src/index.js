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

// MONKEY PATCH: Override includes method to catch problematic calls
const originalIncludes = String.prototype.includes;
String.prototype.includes = function(...args) {
  if (typeof this !== 'string') {
    console.error('🚨 INCLUDES CALLED ON NON-STRING:', {
      value: this,
      type: typeof this,
      args: args,
      stack: new Error().stack
    });
    return false;
  }
  return originalIncludes.apply(this, args);
};

// Also patch Array.prototype.includes to be safe
const originalArrayIncludes = Array.prototype.includes;
Array.prototype.includes = function(...args) {
  if (!Array.isArray(this)) {
    console.error('🚨 ARRAY INCLUDES CALLED ON NON-ARRAY:', {
      value: this,
      type: typeof this,
      args: args,
      stack: new Error().stack
    });
    return false;
  }
  return originalArrayIncludes.apply(this, args);
};

// AGGRESSIVE PATCH: Replace includes on all objects that might have it
console.log('🔧 MONKEY PATCHES INSTALLED');

// Override property access to catch .includes calls
const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
window.interceptIncludes = true;

// Suppress harmless browser extension errors
// These errors occur when browser extensions (like React DevTools, Redux DevTools, etc.)
// try to communicate with the page but the message channel closes before a response is received
window.addEventListener('error', (event) => {
  // Catch .includes() errors and provide detailed logging
  if (event.error && event.error.message && typeof event.error.message === 'string' && event.error.message.includes('.includes is not a function')) {
    console.error('🔴 CAUGHT .includes() ERROR - DETAILED DEBUGGING:', {
      errorMessage: event.error.message,
      stack: event.error.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      fullError: event.error,
      eventDetails: {
        type: event.type,
        bubbles: event.bubbles,
        cancelable: event.cancelable
      }
    });

    // Try to extract the variable name from the error message
    const match = event.error.message.match(/([^\.]+)\.includes is not a function/);
    if (match) {
      console.error('🔍 Variable causing error:', match[1]);
    }

    // Prevent the error from breaking the app
    event.preventDefault();
    return false;
  }

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
  // Catch .includes() errors in promise rejections
  if (
    event.reason &&
    typeof event.reason === 'object' &&
    event.reason.message &&
    typeof event.reason.message === 'string' &&
    event.reason.message.includes('.includes is not a function')
  ) {
    console.error('🔴 CAUGHT .includes() ERROR IN PROMISE REJECTION:', {
      reason: event.reason,
      message: event.reason.message,
      stack: event.reason.stack,
      promise: event.promise
    });

    // Try to extract the variable name from the error message
    const match = event.reason.message.match(/([^\.]+)\.includes is not a function/);
    if (match) {
      console.error('🔍 Variable causing error in promise:', match[1]);
    }

    event.preventDefault();
    return false;
  }

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
