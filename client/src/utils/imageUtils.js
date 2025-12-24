/*
 * Image path utilities for model images
 * Uses Azure Blob Storage for model images
 */

// Azure Blob Storage base URL for model images
const AZURE_MODELS_BASE_URL = 'https://aegisaorentalstorage.blob.core.windows.net/models';

/**
 * Get the URL to a model image from Azure Blob Storage
 * @param {string} make - Vehicle make (e.g., "Toyota")
 * @param {string} model - Vehicle model (e.g., "Camry")
 * @returns {string} URL to the model image
 */
export const getModelImagePath = (make, model) => {
  const makeUpper = (make || '').toUpperCase();
  const modelUpper = (model || '').toUpperCase().replace(/\s+/g, '_');
  
  return `${AZURE_MODELS_BASE_URL}/${makeUpper}_${modelUpper}.png`;
};

/**
 * Get the fallback image path based on category
 * @param {string} category - Vehicle category name
 * @returns {string} Path to the default category image
 */
export const getDefaultCategoryImage = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('suv')) return '/SUV.png';
  if (cat.includes('luxury') || cat.includes('premium')) return '/luxury.jpg';
  if (cat.includes('sedan')) return '/sedan.jpg';
  if (cat.includes('compact')) return '/compact.jpg';
  return '/economy.jpg'; // default fallback
};
