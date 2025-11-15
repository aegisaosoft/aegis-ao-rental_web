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

import React from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';

/**
 * Helper function to extract formatted text from terms_of_use JSONB
 * based on current language
 */
export const getFormattedTermsOfUse = (termsOfUse, currentLanguage = 'en') => {
  if (!termsOfUse) return null;
  
  try {
    let parsed;
    
    // Parse if it's a string
    if (typeof termsOfUse === 'string') {
      try {
        parsed = JSON.parse(termsOfUse);
      } catch (e) {
        // If it's not JSON, return as plain HTML
        return termsOfUse;
      }
    } else {
      parsed = termsOfUse;
    }
    
    // Check if it's the multi-language format
    if (parsed && typeof parsed === 'object') {
      // Try to get content for current language
      const languageContent = parsed[currentLanguage] || parsed['en'] || '';
      
      // If no content found, try to find any non-empty language
      if (!languageContent) {
        const languages = ['en', 'es', 'pt', 'fr', 'de'];
        for (const lang of languages) {
          if (parsed[lang]) {
            return parsed[lang];
          }
        }
      }
      
      return languageContent;
    }
    
    return '';
  } catch (error) {
    console.error('Error parsing terms of use:', error);
    return '';
  }
};

/**
 * Component to display formatted terms of use
 */
const TermsOfUseDisplay = ({ termsOfUse, className = '' }) => {
  const { i18n } = useTranslation();
  
  const formattedContent = getFormattedTermsOfUse(termsOfUse, i18n.language);
  
  if (!formattedContent) {
    return null;
  }
  
  // Sanitize HTML to prevent XSS attacks
  const sanitizedHTML = DOMPurify.sanitize(formattedContent, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 's', 'u', 'a',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style']
  });
  
  return (
    <div 
      className={`prose prose-sm sm:prose lg:prose-lg max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      style={{
        // Custom styles for better formatting
        lineHeight: '1.6',
      }}
    />
  );
};

export default TermsOfUseDisplay;

