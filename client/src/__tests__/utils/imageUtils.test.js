/**
 * Unit tests for image utilities
 * @jest-environment jsdom
 */

import { getModelImagePath, getDefaultCategoryImage } from '../../utils/imageUtils';

describe('getModelImagePath', () => {
  const AZURE_BASE = 'https://aegisaorentalstorage.blob.core.windows.net/models';

  test('generates correct path for make and model', () => {
    const path = getModelImagePath('Toyota', 'Camry');
    expect(path).toBe(`${AZURE_BASE}/TOYOTA_CAMRY.png`);
  });

  test('uppercases make and model', () => {
    const path = getModelImagePath('honda', 'civic');
    expect(path).toBe(`${AZURE_BASE}/HONDA_CIVIC.png`);
  });

  test('replaces spaces with underscores', () => {
    const path = getModelImagePath('Toyota', 'Corolla Cross');
    expect(path).toBe(`${AZURE_BASE}/TOYOTA_COROLLA_CROSS.png`);
  });

  test('handles empty make', () => {
    const path = getModelImagePath('', 'Camry');
    expect(path).toBe(`${AZURE_BASE}/_CAMRY.png`);
  });

  test('handles empty model', () => {
    const path = getModelImagePath('Toyota', '');
    expect(path).toBe(`${AZURE_BASE}/TOYOTA_.png`);
  });

  test('handles null make', () => {
    const path = getModelImagePath(null, 'Camry');
    expect(path).toBe(`${AZURE_BASE}/_CAMRY.png`);
  });

  test('handles null model', () => {
    const path = getModelImagePath('Toyota', null);
    expect(path).toBe(`${AZURE_BASE}/TOYOTA_.png`);
  });

  test('handles undefined', () => {
    const path = getModelImagePath(undefined, undefined);
    expect(path).toBe(`${AZURE_BASE}/_.png`);
  });
});

describe('getDefaultCategoryImage', () => {
  test('returns SUV image for SUV category', () => {
    expect(getDefaultCategoryImage('SUV')).toBe('/SUV.png');
  });

  test('returns SUV image case insensitive', () => {
    expect(getDefaultCategoryImage('suv')).toBe('/SUV.png');
    expect(getDefaultCategoryImage('Mid-Size SUV')).toBe('/SUV.png');
  });

  test('returns luxury image for luxury category', () => {
    expect(getDefaultCategoryImage('Luxury')).toBe('/luxury.jpg');
    expect(getDefaultCategoryImage('luxury')).toBe('/luxury.jpg');
  });

  test('returns luxury image for premium category', () => {
    expect(getDefaultCategoryImage('Premium')).toBe('/luxury.jpg');
    expect(getDefaultCategoryImage('premium')).toBe('/luxury.jpg');
  });

  test('returns sedan image for sedan category', () => {
    expect(getDefaultCategoryImage('Sedan')).toBe('/sedan.jpg');
    expect(getDefaultCategoryImage('sedan')).toBe('/sedan.jpg');
  });

  test('returns compact image for compact category', () => {
    expect(getDefaultCategoryImage('Compact')).toBe('/compact.jpg');
    expect(getDefaultCategoryImage('compact')).toBe('/compact.jpg');
  });

  test('returns economy image as default', () => {
    expect(getDefaultCategoryImage('Economy')).toBe('/economy.jpg');
    expect(getDefaultCategoryImage('Unknown')).toBe('/economy.jpg');
    expect(getDefaultCategoryImage('')).toBe('/economy.jpg');
  });

  test('handles null', () => {
    expect(getDefaultCategoryImage(null)).toBe('/economy.jpg');
  });

  test('handles undefined', () => {
    expect(getDefaultCategoryImage(undefined)).toBe('/economy.jpg');
  });
});
