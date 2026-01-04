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
          args[0].includes('[CompanyContext]') ||
          args[0].includes('ReactDOMTestUtils.act') ||
          args[0].includes('React.act')) {
        return;
      }
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (typeof args[0] === 'string') {
      if (args[0].includes('componentWillReceiveProps') ||
          args[0].includes('React Router Future Flag Warning') ||
          args[0].includes('v7_startTransition') ||
          args[0].includes('v7_relativeSplatPath')) {
        return;
      }
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
