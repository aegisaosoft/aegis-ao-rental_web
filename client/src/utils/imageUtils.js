/*
 * Image path utilities for model images
 * Uses /models/ path which is served by:
 * - React dev server (from client/public/models/) in development
 * - Express static file serving (from server/public/models/) in production
 */

/**
 * Get the path to a model image
 * @param {string} make - Vehicle make (e.g., "Toyota")
 * @param {string} model - Vehicle model (e.g., "Camry")
 * @returns {string} Path to the model image
 */
export const getModelImagePath = (make, model) => {
  const makeUpper = (make || '').toUpperCase();
  const modelUpper = (model || '').toUpperCase().replace(/\s+/g, '_');
  
  // Use /models/ path - served by React dev server in development (from client/public/models/)
  // and by Express static file serving in production (from server/public/models/)
  return `/models/${makeUpper}_${modelUpper}.png`;
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


