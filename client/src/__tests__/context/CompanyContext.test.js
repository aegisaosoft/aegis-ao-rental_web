/**
 * Unit tests for CompanyContext
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CompanyProvider, useCompany } from '../../context/CompanyContext';

// Mock dependencies
jest.mock('../../services/api', () => ({
  apiService: {
    getCurrentCompanyConfig: jest.fn(),
  },
}));

jest.mock('../../i18n/config', () => ({
  __esModule: true,
  default: {
    language: 'en',
    changeLanguage: jest.fn(),
  },
}));

// Import mocked apiService
import { apiService } from '../../services/api';

// Test component
const TestComponent = ({ onRender }) => {
  const company = useCompany();
  if (onRender) onRender(company);
  return (
    <div>
      <span data-testid="loading">{company.loading ? 'loading' : 'done'}</span>
      <span data-testid="error">{company.error || 'none'}</span>
      <span data-testid="companyId">{company.companyId || 'none'}</span>
      <span data-testid="currencyCode">{company.currencyCode}</span>
      <span data-testid="currencySymbol">{company.currencySymbol}</span>
      <span data-testid="aiIntegration">{company.aiIntegration}</span>
      <span data-testid="securityDeposit">{company.securityDeposit}</span>
      <span data-testid="language">{company.language}</span>
    </div>
  );
};

describe('CompanyContext', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset window.location
    delete window.location;
    window.location = {
      ...originalLocation,
      hostname: 'test-company.aegis-rental.com',
    };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  describe('useCompany hook', () => {
    test('throws error when used outside CompanyProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useCompany must be used within a CompanyProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('CompanyProvider - main site detection', () => {
    test('detects localhost as main site', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      window.location.hostname = 'localhost';

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });

      expect(apiService.getCurrentCompanyConfig).not.toHaveBeenCalled();
      expect(screen.getByTestId('error')).toHaveTextContent('Company configuration not available');
      
      consoleSpy.mockRestore();
    });

    test('detects aegis-rental.com as main site', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      window.location.hostname = 'aegis-rental.com';

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });

      expect(apiService.getCurrentCompanyConfig).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('detects www.aegis-rental.com as main site', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      window.location.hostname = 'www.aegis-rental.com';

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });

      expect(apiService.getCurrentCompanyConfig).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('CompanyProvider - subdomain loading', () => {
    test('loads company config for subdomain', async () => {
      window.location.hostname = 'test-company.aegis-rental.com';
      
      const mockConfig = {
        id: 'company-123',
        companyName: 'Test Rental Company',
        currency: 'USD',
        aiIntegration: 'claude',
        securityDeposit: 500,
        language: 'en',
        country: 'USA'
      };

      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: mockConfig
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });

      expect(apiService.getCurrentCompanyConfig).toHaveBeenCalled();
      expect(screen.getByTestId('companyId')).toHaveTextContent('company-123');
      expect(screen.getByTestId('currencyCode')).toHaveTextContent('USD');
      expect(screen.getByTestId('aiIntegration')).toHaveTextContent('claude');
      expect(screen.getByTestId('securityDeposit')).toHaveTextContent('500');
    });

    test('handles API error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      window.location.hostname = 'test-company.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockRejectedValue(new Error('Network error'));

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Unable to load company configuration');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Currency handling', () => {
    test('normalizes lowercase currency code', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', currency: 'usd' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currencyCode')).toHaveTextContent('USD');
      });
    });

    test('defaults to USD when currency not specified', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', companyName: 'Test' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currencyCode')).toHaveTextContent('USD');
      });
    });

    test('gets correct currency symbol for EUR', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', currency: 'EUR' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currencySymbol')).toHaveTextContent('€');
      });
    });
  });

  describe('AI Integration', () => {
    test.each([
      ['free', 'free'],
      ['claude', 'claude'],
      ['premium', 'premium'],
      ['CLAUDE', 'claude'],
    ])('normalizes aiIntegration %s to %s', async (input, expected) => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', aiIntegration: input }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('aiIntegration')).toHaveTextContent(expected);
      });
    });

    test('defaults to claude when aiIntegration not specified', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('aiIntegration')).toHaveTextContent('claude');
      });
    });
  });

  describe('Security Deposit', () => {
    test('uses company security deposit', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', securityDeposit: 750 }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('securityDeposit')).toHaveTextContent('750');
      });
    });

    test('defaults to 1000 when not specified', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('securityDeposit')).toHaveTextContent('1000');
      });
    });
  });

  describe('Language', () => {
    test('uses company language setting', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', language: 'es' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('language')).toHaveTextContent('es');
      });
    });

    test('defaults to en when language not specified', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('language')).toHaveTextContent('en');
      });
    });
  });

  describe('formatPrice function', () => {
    test('provides formatPrice function', async () => {
      window.location.hostname = 'test.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', currency: 'USD' }
      });

      let companyContext;
      render(
        <CompanyProvider>
          <TestComponent onRender={(ctx) => { companyContext = ctx; }} />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(companyContext.formatPrice).toBeDefined();
      });

      const formatted = companyContext.formatPrice(100);
      expect(formatted).toContain('100');
      expect(formatted).toContain('$');
    });
  });
});
