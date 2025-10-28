/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

/**
 * Helper function to translate API data
 * Usage: translateApiField(t, 'categories', categoryName)
 */
export const translateApiField = (t, fieldType, value) => {
  if (!value) return value;
  
  // Convert value to lowercase and replace spaces with hyphens for lookup
  const key = value.toString().toLowerCase().replace(/\s+/g, '-');
  
  // Try to get translation, fallback to original value
  const translationKey = `${fieldType}.${key}`;
  const translated = t(translationKey);
  
  // If translation key is returned as-is, return original value
  return translated === translationKey ? value : translated;
};

/**
 * Translate vehicle category
 */
export const translateCategory = (t, category) => {
  return translateApiField(t, 'categories', category);
};

/**
 * Translate fuel type
 */
export const translateFuelType = (t, fuelType) => {
  return translateApiField(t, 'fuelTypes', fuelType);
};

/**
 * Translate transmission type
 */
export const translateTransmission = (t, transmission) => {
  return translateApiField(t, 'transmission', transmission);
};

/**
 * Translate status
 */
export const translateStatus = (t, status) => {
  return translateApiField(t, 'status', status);
};

