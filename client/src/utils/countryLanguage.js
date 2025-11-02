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
 * Maps country names to their official languages
 * Language codes: en (English), es (Spanish), pt (Portuguese), fr (French)
 */
export const countryToLanguage = {
  // North America - English
  'United States': 'en',
  'Canada': 'en',
  'Bahamas': 'en',
  'Barbados': 'en',
  'Belize': 'en',
  'Jamaica': 'en',
  'Trinidad and Tobago': 'en',
  'Antigua and Barbuda': 'en',
  'Saint Kitts and Nevis': 'en',
  'Dominica': 'en',
  'Saint Lucia': 'en',
  'Saint Vincent and the Grenadines': 'en',
  'Grenada': 'en',
  'Puerto Rico': 'es', // Spanish is primary
  'US Virgin Islands': 'en',
  'British Virgin Islands': 'en',
  'Anguilla': 'en',
  'Montserrat': 'en',
  'Cayman Islands': 'en',
  'Turks and Caicos Islands': 'en',
  'Bermuda': 'en',
  'Greenland': 'en', // Danish is official but English is widely used
  
  // North America - Spanish
  'Mexico': 'es',
  'Guatemala': 'es',
  'El Salvador': 'es',
  'Honduras': 'es',
  'Nicaragua': 'es',
  'Costa Rica': 'es',
  'Panama': 'es',
  'Cuba': 'es',
  'Dominican Republic': 'es',
  
  // North America - French
  'Haiti': 'fr',
  'Saint Pierre and Miquelon': 'fr',
  
  // South America - Spanish
  'Argentina': 'es',
  'Chile': 'es',
  'Colombia': 'es',
  'Peru': 'es',
  'Venezuela': 'es',
  'Ecuador': 'es',
  'Bolivia': 'es',
  'Paraguay': 'es',
  'Uruguay': 'es',
  
  // South America - Portuguese
  'Brazil': 'pt',
  
  // South America - English/Dutch/French
  'Guyana': 'en',
  'Suriname': 'en', // Dutch is official but English is widely used
  'French Guiana': 'fr',
};

/**
 * Get language code for a country
 * @param {string} country - Country name
 * @returns {string} Language code (en, es, pt, fr) or 'en' as default
 */
export const getLanguageForCountry = (country) => {
  if (!country) return 'en';
  return countryToLanguage[country] || 'en';
};

