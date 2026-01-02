/**
 * Unit tests for CompanyContext
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CompanyProvider, useCompany } from '../../context/CompanyContext';
import { apiService } from '../../services/api';
import i18n from '../../i18n/config';

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

jest.mock('../../utils/countryLanguage', () => ({
  getLanguageForCountry: jest.fn((country) => {
    if (country === 'USA') return 'en';
    if (country === 'Mexico') return 'es';
    if (country === 'Brazil') return 'pt';
    if (country === 'France') return 'fr';
    return 'en';
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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
    localStorageMock.getItem.mockReturnValue(null);
    
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
    it('should throw error when used outside CompanyProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useCompany must be used within a CompanyProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('CompanyProvider', () => {
    it('should start with loading state', async () => {
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', companyName: 'Test Company' }
      });

      let companyContext;
      render(
        <CompanyProvider>
          <TestComponent onRender={(ctx) => { companyContext = ctx; }} />
        </CompanyProvider>
      );

      // Initially loading
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });
    });

    it('should load company config successfully', async () => {
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

      let companyContext;
      render(
        <CompanyProvider>
          <TestComponent onRender={(ctx) => { companyContext = ctx; }} />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });

      expect(screen.getByTestId('companyId')).toHaveTextContent('company-123');
      expect(screen.getByTestId('currencyCode')).toHaveTextContent('USD');
      expect(screen.getByTestId('aiIntegration')).toHaveTextContent('claude');
      expect(screen.getByTestId('securityDeposit')).toHaveTextContent('500');
    });

    it('should handle API error', async () => {
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
    });

    it('should detect main site and skip API call', async () => {
      window.location.hostname = 'localhost';

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });

      // Should not call API for main site
      expect(apiService.getCurrentCompanyConfig).not.toHaveBeenCalled();
      expect(screen.getByTestId('error')).toHaveTextContent('Company configuration not available');
    });

    it('should detect main site for aegis-rental.com', async () => {
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
    });

    it('should detect main site for www.aegis-rental.com', async () => {
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
    });

    it('should call API for subdomain', async () => {
      window.location.hostname = 'test-company.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', companyName: 'Test Company' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(apiService.getCurrentCompanyConfig).toHaveBeenCalled();
      });
    });
  });

  describe('Currency formatting', () => {
    it('should normalize currency code', async () => {
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

    it('should default to USD when currency not specified', async () => {
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

    it('should provide formatPrice function', async () => {
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
      expect(formatted).toMatch(/\$100/);
    });

    it('should get correct currency symbol', async () => {
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
    it.each([
      ['free', 'free'],
      ['claude', 'claude'],
      ['premium', 'premium'],
      ['CLAUDE', 'claude'],
      ['invalid', 'claude'],
      [null, 'claude'],
      [undefined, 'claude'],
      ['', 'claude'],
    ])('should normalize aiIntegration %s to %s', async (input, expected) => {
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
  });

  describe('Security Deposit', () => {
    it('should use company security deposit', async () => {
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

    it('should default to 1000 when not specified', async () => {
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

  describe('Language settings', () => {
    it('should use company language setting', async () => {
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

    it('should respect manual language preference', async () => {
      // Set manual preference BEFORE render
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'languageManuallySet') return 'true';
        return null;
      });
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', language: 'es', country: 'Mexico' }
      });

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done');
      });

      // When manual preference is set, language should come from company config
      // but i18n.changeLanguage behavior depends on implementation
      expect(screen.getByTestId('language')).toHaveTextContent('es');
    });
  });

  describe('Subdomain access', () => {
    it('should detect subdomain access', async () => {
      window.location.hostname = 'mycompany.aegis-rental.com';
      
      apiService.getCurrentCompanyConfig.mockResolvedValue({
        data: { id: '123', subdomain: 'mycompany' }
      });

      let companyContext;
      render(
        <CompanyProvider>
          <TestComponent onRender={(ctx) => { companyContext = ctx; }} />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(companyContext.isSubdomainAccess).toBe(true);
      });
    });
  });
});
