/**
 * Unit tests for currency utilities
 * @jest-environment jsdom
 */

import { normalizeCurrencyCode, formatCurrency, getCurrencySymbol } from '../../utils/currency';

describe('normalizeCurrencyCode', () => {
  test('returns USD for empty string', () => {
    expect(normalizeCurrencyCode('')).toBe('USD');
  });

  test('returns USD for whitespace', () => {
    expect(normalizeCurrencyCode('   ')).toBe('USD');
  });

  test('returns USD for null', () => {
    expect(normalizeCurrencyCode(null)).toBe('USD');
  });

  test('returns USD for undefined', () => {
    expect(normalizeCurrencyCode(undefined)).toBe('USD');
  });

  test('uppercases lowercase code', () => {
    expect(normalizeCurrencyCode('usd')).toBe('USD');
    expect(normalizeCurrencyCode('eur')).toBe('EUR');
    expect(normalizeCurrencyCode('gbp')).toBe('GBP');
  });

  test('trims whitespace', () => {
    expect(normalizeCurrencyCode('  USD  ')).toBe('USD');
  });

  test('handles mixed case', () => {
    expect(normalizeCurrencyCode('Usd')).toBe('USD');
    expect(normalizeCurrencyCode('eUr')).toBe('EUR');
  });
});

describe('formatCurrency', () => {
  test('returns empty string for null', () => {
    expect(formatCurrency(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(formatCurrency(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(formatCurrency('')).toBe('');
  });

  test('returns empty string for NaN', () => {
    expect(formatCurrency('not a number')).toBe('');
  });

  test('formats USD with dollar sign', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('100');
    expect(result).toContain('$');
  });

  test('formats zero amount', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('0');
  });

  test('formats decimal amounts', () => {
    const result = formatCurrency(99.99, 'USD');
    expect(result).toContain('99');
  });

  test('handles string numbers', () => {
    const result = formatCurrency('100', 'USD');
    expect(result).toContain('100');
  });

  test('uses USD as default currency', () => {
    const result = formatCurrency(100);
    expect(result).toContain('$');
  });

  test('formats BRL with R$', () => {
    const result = formatCurrency(100, 'BRL');
    expect(result).toContain('R$');
  });
});

describe('getCurrencySymbol', () => {
  test('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  test('returns € for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  test('returns £ for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  test('returns $ as default', () => {
    expect(getCurrencySymbol()).toBe('$');
  });

  test('handles lowercase', () => {
    expect(getCurrencySymbol('usd')).toBe('$');
  });

  test('returns R$ for BRL', () => {
    expect(getCurrencySymbol('BRL')).toBe('R$');
  });
});
