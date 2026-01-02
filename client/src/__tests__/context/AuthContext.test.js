/**
 * Unit tests for AuthContext
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Mock the api service
jest.mock('../../services/api', () => ({
  apiService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateProfile: jest.fn(),
    getProfile: jest.fn(),
  },
}));

// Import mocked apiService
import { apiService } from '../../services/api';

// Test component that uses useAuth
const TestComponent = ({ onRender }) => {
  const auth = useAuth();
  if (onRender) onRender(auth);
  return (
    <div>
      <span data-testid="authenticated">{auth.isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="isAdmin">{auth.isAdmin ? 'yes' : 'no'}</span>
      <span data-testid="isMainAdmin">{auth.isMainAdmin ? 'yes' : 'no'}</span>
      <span data-testid="isWorker">{auth.isWorker ? 'yes' : 'no'}</span>
      <span data-testid="canAccessDashboard">{auth.canAccessDashboard ? 'yes' : 'no'}</span>
      <span data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</span>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAuth hook', () => {
    test('throws error when used outside AuthProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('AuthProvider', () => {
    test('starts with unauthenticated state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    test('has loading as false', () => {
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      expect(authContext.loading).toBe(false);
    });
  });

  describe('login', () => {
    test('updates user state on successful login', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'admin',
        companyId: 'company-123'
      };

      apiService.login.mockResolvedValue({
        data: {
          result: { user: mockUser },
          token: 'mock-token'
        }
      });

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.login({ email: 'test@example.com', password: 'password' });
      });

      expect(apiService.login).toHaveBeenCalledWith({ 
        email: 'test@example.com', 
        password: 'password' 
      });
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('yes');
    });

    test('handles login with user data in response.data.user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'worker'
      };

      apiService.login.mockResolvedValue({
        data: {
          user: mockUser,
          token: 'mock-token'
        }
      });

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.login({ email: 'test@example.com', password: 'password' });
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      expect(screen.getByTestId('isWorker')).toHaveTextContent('yes');
    });

    test('throws error when login response has no user data', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      apiService.login.mockResolvedValue({
        data: { token: 'mock-token' }
      });

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await expect(async () => {
        await act(async () => {
          await authContext.login({ email: 'test@example.com', password: 'password' });
        });
      }).rejects.toThrow('Login response missing user data');
      
      consoleSpy.mockRestore();
    });

    test('throws error on API failure', async () => {
      apiService.login.mockRejectedValue(new Error('Invalid credentials'));

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await expect(async () => {
        await act(async () => {
          await authContext.login({ email: 'test@example.com', password: 'wrong' });
        });
      }).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    test('updates user state on successful registration', async () => {
      const mockUser = {
        id: '456',
        email: 'newuser@example.com',
        role: 'user'
      };

      apiService.register.mockResolvedValue({
        data: {
          result: { user: mockUser }
        }
      });

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.register({ 
          email: 'newuser@example.com', 
          password: 'password',
          firstName: 'New',
          lastName: 'User'
        });
      });

      expect(apiService.register).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    test('throws error when register response has no user data', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      apiService.register.mockResolvedValue({
        data: { success: true }
      });

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await expect(async () => {
        await act(async () => {
          await authContext.register({ email: 'test@example.com', password: 'password' });
        });
      }).rejects.toThrow('Register response missing user data');
      
      consoleSpy.mockRestore();
    });
  });

  describe('logout', () => {
    test('clears user state on logout', async () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'admin' };
      
      apiService.login.mockResolvedValue({
        data: { result: { user: mockUser } }
      });
      apiService.logout.mockResolvedValue({});

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      // Login first
      await act(async () => {
        await authContext.login({ email: 'test@example.com', password: 'password' });
      });
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');

      // Then logout
      await act(async () => {
        await authContext.logout();
      });

      expect(apiService.logout).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    test('clears user state even if API call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockUser = { id: '123', email: 'test@example.com', role: 'admin' };
      
      apiService.login.mockResolvedValue({
        data: { result: { user: mockUser } }
      });
      apiService.logout.mockRejectedValue(new Error('Network error'));

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.login({ email: 'test@example.com', password: 'password' });
      });

      await act(async () => {
        await authContext.logout();
      });

      // User should still be logged out even if API failed
      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      
      consoleSpy.mockRestore();
    });
  });

  describe('restoreUser', () => {
    test('restores user state without API call', async () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'admin' };

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      act(() => {
        authContext.restoreUser(mockUser);
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('yes');
    });

    test('does nothing when passed null', () => {
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      act(() => {
        authContext.restoreUser(null);
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });
  });

  describe('role checks', () => {
    test.each([
      ['admin', { isAdmin: true, isMainAdmin: false, isWorker: false, canAccessDashboard: true }],
      ['mainadmin', { isAdmin: true, isMainAdmin: true, isWorker: false, canAccessDashboard: true }],
      ['worker', { isAdmin: false, isMainAdmin: false, isWorker: true, canAccessDashboard: true }],
      ['user', { isAdmin: false, isMainAdmin: false, isWorker: false, canAccessDashboard: false }],
    ])('sets correct flags for role: %s', async (role, expected) => {
      const mockUser = { id: '123', email: 'test@example.com', role };

      apiService.login.mockResolvedValue({
        data: { result: { user: mockUser } }
      });

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.login({ email: 'test@example.com', password: 'password' });
      });

      expect(screen.getByTestId('isAdmin')).toHaveTextContent(expected.isAdmin ? 'yes' : 'no');
      expect(screen.getByTestId('isMainAdmin')).toHaveTextContent(expected.isMainAdmin ? 'yes' : 'no');
      expect(screen.getByTestId('isWorker')).toHaveTextContent(expected.isWorker ? 'yes' : 'no');
      expect(screen.getByTestId('canAccessDashboard')).toHaveTextContent(expected.canAccessDashboard ? 'yes' : 'no');
    });
  });

  describe('currentCompanyId', () => {
    test('extracts companyId from user', async () => {
      const mockUser = { 
        id: '123', 
        email: 'test@example.com', 
        role: 'admin',
        companyId: 'company-abc-123'
      };

      apiService.login.mockResolvedValue({
        data: { result: { user: mockUser } }
      });

      let authContext;
      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.login({ email: 'test@example.com', password: 'password' });
      });

      expect(authContext.currentCompanyId).toBe('company-abc-123');
    });
  });
});
