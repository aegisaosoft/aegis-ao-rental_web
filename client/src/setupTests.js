/**
 * Jest setup file for React tests
 */

import '@testing-library/jest-dom';

// Suppress specific console messages during tests
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.error = (...args) => {
    // Suppress act() warnings and expected errors
    if (typeof args[0] === 'string') {
      if (args[0].includes('Warning: An update to') ||
          args[0].includes('act(...)') ||
          args[0].includes('[AuthContext]') ||
          args[0].includes('[CompanyContext]')) {
        return;
      }
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('componentWillReceiveProps')) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.log = (...args) => {
    // Suppress expected logs during tests
    if (typeof args[0] === 'string' && args[0].includes('[CompanyContext]')) {
      return;
    }
    originalLog.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});
