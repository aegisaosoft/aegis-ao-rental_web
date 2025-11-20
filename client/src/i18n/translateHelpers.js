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
 * Normalize category names to English keys regardless of input language
 */
const normalizeCategoryName = (categoryName) => {
  if (!categoryName) return '';
  
  const normalized = categoryName.toString().toLowerCase().trim();
  
  // Map of various language versions to English keys
  const categoryMap = {
    // Economy
    'economy': 'economy',
    'economico': 'economy',
    'económico': 'economy',
    'economique': 'economy',
    'wirtschaftlich': 'economy',
    
    // Compact
    'compact': 'compact',
    'compacto': 'compact',
    'kompakt': 'compact',
    
    // Mid-size / Intermediate
    'mid-size': 'mid-size',
    'midsize': 'mid-size',
    'mid size': 'mid-size',
    'mediano': 'mid-size',
    'medio': 'mid-size',
    'médio': 'mid-size',
    'taille moyenne': 'mid-size',
    'mittelklasse': 'mid-size',
    'intermediate': 'intermediate',
    'intermedio': 'intermediate',
    'intermediário': 'intermediate',
    'intermédiaire': 'intermediate',
    
    // Full-size
    'full-size': 'full-size',
    'fullsize': 'full-size',
    'full size': 'full-size',
    'grande': 'full-size',
    'pleine grandeur': 'full-size',
    'oberklasse': 'full-size',
    
    // SUV
    'suv': 'suv',
    
    // Luxury
    'luxury': 'luxury',
    'lujo': 'luxury',
    'luxo': 'luxury',
    'luxe': 'luxury',
    'luxus': 'luxury',
    
    // Sports
    'sports': 'sports',
    'sport': 'sports',
    'deportivo': 'sports',
    'esportivo': 'sports',
    'sportif': 'sports',
    
    // Van
    'van': 'van',
    'camioneta': 'van',
    'furgoneta': 'van',
    'camionnette': 'van'
  };
  
  return categoryMap[normalized] || normalized;
};

/**
 * Helper function to translate API data
 * Usage: translateApiField(t, 'categories', categoryName)
 */
export const translateApiField = (t, fieldType, value) => {
  if (!value) return value;
  
  // Normalize category names before translation
  let normalizedValue = value;
  if (fieldType === 'categories') {
    normalizedValue = normalizeCategoryName(value);
  }
  
  // Convert value to lowercase and replace spaces with hyphens for lookup
  const key = normalizedValue.toString().toLowerCase().replace(/\s+/g, '-');
  
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
