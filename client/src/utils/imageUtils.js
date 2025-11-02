/*
 * Image path utilities for model images
 * Uses direct /models/ path for Create React App's public folder in development
 * Falls back to /api/models/ for backend-served images
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
  
  // In development, Create React App serves files from public/ directly
  // In production, use /api/models/ which is served by the backend
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Try direct path first (served by React dev server from public/models)
    return `/models/${makeUpper}_${modelUpper}.png`;
  } else {
    // Production: use backend API route
    return `/api/models/${makeUpper}_${modelUpper}.png`;
  }
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


