/**
 * Unit tests for rental search filters utilities
 * @jest-environment jsdom
 */

import { isDateBeforeToday, sanitizeFilterDates } from '../../utils/rentalSearchFilters';

describe('isDateBeforeToday', () => {
  test('returns false for null', () => {
    expect(isDateBeforeToday(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isDateBeforeToday(undefined)).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isDateBeforeToday('')).toBe(false);
  });

  test('returns false for whitespace', () => {
    expect(isDateBeforeToday('   ')).toBe(false);
  });

  test('returns true for past date 2020-01-01', () => {
    expect(isDateBeforeToday('2020-01-01')).toBe(true);
  });

  test('returns true for past date 2023-06-15', () => {
    expect(isDateBeforeToday('2023-06-15')).toBe(true);
  });

  test('returns false for future date 2030-01-01', () => {
    expect(isDateBeforeToday('2030-01-01')).toBe(false);
  });

  test('returns false for future date 2099-12-31', () => {
    expect(isDateBeforeToday('2099-12-31')).toBe(false);
  });

  test('handles ISO date strings', () => {
    expect(isDateBeforeToday('2020-01-01T00:00:00Z')).toBe(true);
    expect(isDateBeforeToday('2099-12-31T23:59:59Z')).toBe(false);
  });

  test('returns false for invalid date strings', () => {
    expect(isDateBeforeToday('not-a-date')).toBe(false);
    expect(isDateBeforeToday('invalid')).toBe(false);
  });
});

describe('sanitizeFilterDates', () => {
  test('returns unchanged for null', () => {
    expect(sanitizeFilterDates(null)).toEqual({ sanitized: {}, changed: false });
  });

  test('returns unchanged for undefined', () => {
    expect(sanitizeFilterDates(undefined)).toEqual({ sanitized: {}, changed: false });
  });

  test('returns unchanged for non-object', () => {
    expect(sanitizeFilterDates('string')).toEqual({ sanitized: {}, changed: false });
    expect(sanitizeFilterDates(123)).toEqual({ sanitized: {}, changed: false });
  });

  test('keeps future dates unchanged', () => {
    const filters = {
      startDate: '2099-01-01',
      endDate: '2099-01-15',
      category: 'SUV'
    };
    const result = sanitizeFilterDates(filters);
    expect(result.sanitized.startDate).toBe('2099-01-01');
    expect(result.sanitized.endDate).toBe('2099-01-15');
    expect(result.sanitized.category).toBe('SUV');
    expect(result.changed).toBe(false);
  });

  test('removes past dates', () => {
    const filters = {
      startDate: '2020-01-01',
      endDate: '2020-01-15',
      category: 'SUV'
    };
    const result = sanitizeFilterDates(filters);
    expect(result.sanitized.startDate).toBeUndefined();
    expect(result.sanitized.endDate).toBeUndefined();
    expect(result.sanitized.category).toBe('SUV');
    expect(result.changed).toBe(true);
  });

  test('removes only past dates, keeps future', () => {
    const filters = {
      startDate: '2020-01-01',
      endDate: '2099-01-15',
      category: 'SUV'
    };
    const result = sanitizeFilterDates(filters);
    expect(result.sanitized.startDate).toBeUndefined();
    expect(result.sanitized.endDate).toBe('2099-01-15');
    expect(result.sanitized.category).toBe('SUV');
    expect(result.changed).toBe(true);
  });

  test('handles pickupDate and returnDate keys', () => {
    const filters = {
      pickupDate: '2020-01-01',
      returnDate: '2099-01-15',
      location: 'Miami'
    };
    const result = sanitizeFilterDates(filters);
    expect(result.sanitized.pickupDate).toBeUndefined();
    expect(result.sanitized.returnDate).toBe('2099-01-15');
    expect(result.sanitized.location).toBe('Miami');
    expect(result.changed).toBe(true);
  });

  test('keeps non-date properties unchanged', () => {
    const filters = {
      category: 'SUV',
      make: 'Toyota',
      location: 'Miami',
      seats: 5
    };
    const result = sanitizeFilterDates(filters);
    expect(result.sanitized).toEqual(filters);
    expect(result.changed).toBe(false);
  });

  test('removes empty date values', () => {
    const filters = {
      startDate: '',
      category: 'Sedan'
    };
    const result = sanitizeFilterDates(filters);
    expect(result.sanitized.startDate).toBeUndefined();
    expect(result.sanitized.category).toBe('Sedan');
    expect(result.changed).toBe(true);
  });
});
