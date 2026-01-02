# Unit Tests for aegis-ao-rental_web

## Overview

This directory contains unit tests for both the React frontend (`client/`) and Node.js backend (`server/`).

## Test Structure

```
aegis-ao-rental_web/
├── client/
│   └── src/
│       └── __tests__/
│           ├── utils/
│           │   ├── currency.test.js        # Currency formatting tests
│           │   ├── imageUtils.test.js      # Image path utilities tests
│           │   └── rentalSearchFilters.test.js  # Search filter tests
│           ├── context/
│           │   └── AuthContext.test.js     # Authentication context tests
│           ├── services/
│           │   └── api.test.js             # API service tests
│           ├── components/
│           │   └── (component tests)
│           └── hooks/
│               └── (custom hooks tests)
└── server/
    └── __tests__/
        └── meta.test.js                    # Meta integration route tests
```

## Running Tests

### Client (React) Tests

```bash
cd client

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- currency.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests matching pattern
npm test -- --testPathPattern="utils"
```

### Server (Node.js) Tests

```bash
cd server

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- meta.test.js
```

## Test Coverage

### Client Tests Cover:

1. **Utils**
   - `currency.js` - Currency formatting, normalization, symbol extraction
   - `imageUtils.js` - Model image path generation, category image fallbacks
   - `rentalSearchFilters.js` - Date validation, filter sanitization

2. **Context**
   - `AuthContext.js` - Login, logout, register, role checks, user state

3. **Services**
   - `api.js` - Axios instance configuration, interceptors, API methods

### Server Tests Cover:

1. **Routes**
   - `meta.js` - Meta integration endpoints (status, pages, disconnect, select-page, refresh-instagram)

## Test Utilities

### Mocking

Tests use Jest mocking for:
- `axios` - HTTP requests
- `localStorage` - Browser storage
- API services

### React Testing Library

React components and contexts are tested using:
- `@testing-library/react` - Component rendering and queries
- `@testing-library/jest-dom` - DOM assertions

### Supertest

Server routes are tested using:
- `supertest` - HTTP assertions for Express routes

## Writing New Tests

### Client Component Test Template

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    render(<MyComponent />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Updated Text')).toBeInTheDocument();
  });
});
```

### Server Route Test Template

```javascript
const request = require('supertest');
const express = require('express');

describe('Route', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  it('should handle GET request', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', 'Bearer token');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Run Client Tests
  working-directory: ./client
  run: npm test -- --coverage --watchAll=false

- name: Run Server Tests
  working-directory: ./server
  run: npm test -- --coverage
```

## Test Results Summary

| Component | Tests | Coverage Target |
|-----------|-------|-----------------|
| Utils | 50+ | 90%+ |
| AuthContext | 20+ | 85%+ |
| API Service | 30+ | 80%+ |
| Meta Routes | 15+ | 80%+ |

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Run `npm install` in both `client/` and `server/` directories

2. **Test timeouts**
   - Increase timeout: `jest.setTimeout(30000);`

3. **Mock not working**
   - Ensure mocks are defined before imports
   - Use `jest.mock()` at the top of the file

4. **React act() warnings**
   - Wrap state updates in `act()` or use `waitFor()`
