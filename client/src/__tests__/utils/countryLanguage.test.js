/**
 * Unit tests for country language utilities
 * @jest-environment jsdom
 */

import { countryToLanguage, getLanguageForCountry } from '../../utils/countryLanguage';

describe('countryToLanguage mapping', () => {
  test('has English for United States', () => {
    expect(countryToLanguage['United States']).toBe('en');
  });

  test('has English for Canada', () => {
    expect(countryToLanguage['Canada']).toBe('en');
  });

  test('has Spanish for Mexico', () => {
    expect(countryToLanguage['Mexico']).toBe('es');
  });

  test('has Portuguese for Brazil', () => {
    expect(countryToLanguage['Brazil']).toBe('pt');
  });

  test('has French for Haiti', () => {
    expect(countryToLanguage['Haiti']).toBe('fr');
  });

  test('has Spanish for Argentina', () => {
    expect(countryToLanguage['Argentina']).toBe('es');
  });

  test('has Spanish for Puerto Rico', () => {
    expect(countryToLanguage['Puerto Rico']).toBe('es');
  });

  test('has French for French Guiana', () => {
    expect(countryToLanguage['French Guiana']).toBe('fr');
  });
});

describe('getLanguageForCountry', () => {
  test('returns en for United States', () => {
    expect(getLanguageForCountry('United States')).toBe('en');
  });

  test('returns es for Mexico', () => {
    expect(getLanguageForCountry('Mexico')).toBe('es');
  });

  test('returns pt for Brazil', () => {
    expect(getLanguageForCountry('Brazil')).toBe('pt');
  });

  test('returns fr for Haiti', () => {
    expect(getLanguageForCountry('Haiti')).toBe('fr');
  });

  test('returns en for null', () => {
    expect(getLanguageForCountry(null)).toBe('en');
  });

  test('returns en for undefined', () => {
    expect(getLanguageForCountry(undefined)).toBe('en');
  });

  test('returns en for empty string', () => {
    expect(getLanguageForCountry('')).toBe('en');
  });

  test('returns en for unknown country', () => {
    expect(getLanguageForCountry('Unknown Country')).toBe('en');
    expect(getLanguageForCountry('Germany')).toBe('en');
    expect(getLanguageForCountry('Japan')).toBe('en');
  });

  test('returns es for Central American countries', () => {
    expect(getLanguageForCountry('Guatemala')).toBe('es');
    expect(getLanguageForCountry('El Salvador')).toBe('es');
    expect(getLanguageForCountry('Honduras')).toBe('es');
    expect(getLanguageForCountry('Nicaragua')).toBe('es');
    expect(getLanguageForCountry('Costa Rica')).toBe('es');
    expect(getLanguageForCountry('Panama')).toBe('es');
  });

  test('returns es for South American Spanish countries', () => {
    expect(getLanguageForCountry('Argentina')).toBe('es');
    expect(getLanguageForCountry('Chile')).toBe('es');
    expect(getLanguageForCountry('Colombia')).toBe('es');
    expect(getLanguageForCountry('Peru')).toBe('es');
    expect(getLanguageForCountry('Venezuela')).toBe('es');
    expect(getLanguageForCountry('Ecuador')).toBe('es');
    expect(getLanguageForCountry('Bolivia')).toBe('es');
    expect(getLanguageForCountry('Paraguay')).toBe('es');
    expect(getLanguageForCountry('Uruguay')).toBe('es');
  });

  test('returns en for Caribbean English countries', () => {
    expect(getLanguageForCountry('Jamaica')).toBe('en');
    expect(getLanguageForCountry('Barbados')).toBe('en');
    expect(getLanguageForCountry('Bahamas')).toBe('en');
    expect(getLanguageForCountry('Trinidad and Tobago')).toBe('en');
  });
});
