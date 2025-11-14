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

import { api } from './api';

class TranslationService {
  /**
   * Translate text to a single target language
   */
  async translateText(text, targetLanguage, sourceLanguage) {
    if (!text || !text.trim()) {
      throw new Error('Text to translate is empty');
    }

    const trimmedText = text.trim();
    const request = {
      text: trimmedText,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'en',
    };

    try {
      const response = await api.post('/translation/translate', request);
      // Handle standardized response format: { result: { translation: "..." }, reason: 0, ... }
      const translationData = response.data?.result || response.data;
      let translated = null;
      
      if (translationData?.translation) {
        translated = translationData.translation.trim();
      } else if (response.data?.translation) {
        // Fallback for direct response format
        translated = response.data.translation.trim();
      }
      
      if (!translated) {
        throw new Error('Invalid response format from translation API');
      }
      
      // Only check if translation is empty - allow same text (might be proper nouns, technical terms, etc.)
      if (translated.length === 0) {
        throw new Error('Translation returned empty text');
      }
      
      // Return the translation (even if same - UI will handle warning if needed)
      return translated;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Translation failed';
      throw new Error(`Translation failed: ${errorMessage}`);
    }
  }

  /**
   * Translate text to all supported languages
   */
  async translateToAll(text, sourceLanguage) {
    const request = {
      text,
      sourceLanguage,
    };

    try {
      const response = await api.post('/translation/translate-all', request);
      // Handle standardized response format: { result: { translations: {...} }, reason: 0, ... }
      const translationData = response.data?.result || response.data;
      if (translationData?.translations) {
        return translationData.translations;
      }
      // Fallback for direct response format
      if (response.data?.translations) {
        return response.data.translations;
      }
      throw new Error('Invalid response format from translation API');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Translation failed';
      throw new Error(`Translation failed: ${errorMessage}`);
    }
  }

  /**
   * Translate HTML content preserving structure and formatting
   */
  async translateHtml(html, targetLanguage, sourceLanguage) {
    if (!html || !html.trim()) {
      return '';
    }

    try {
      // Parse HTML to extract text nodes while preserving structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.body;

      // Function to extract and translate text nodes recursively
      // Node types: TEXT_NODE = 3, ELEMENT_NODE = 1
      const TEXT_NODE = 3;
      const ELEMENT_NODE = 1;
      
      // Collect all text nodes first to translate them in batch
      const textNodes = [];
      const collectTextNodes = (node) => {
        if (node.nodeType === TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            textNodes.push(node);
          }
        } else if (node.nodeType === ELEMENT_NODE) {
          // Process child nodes
          const children = Array.from(node.childNodes);
          for (const child of children) {
            collectTextNodes(child);
          }
        }
      };

      // Collect all text nodes
      collectTextNodes(body);

      // Translate all text nodes sentence by sentence
      for (const textNode of textNodes) {
        const text = textNode.textContent?.trim();
        if (text) {
          try {
            // Split text into sentences (by periods, exclamation marks, question marks, newlines)
            // Pattern: match sentence end (. ! ?) followed by optional whitespace, or newlines
            const sentenceRegex = /([.!?]+\s*|\n+)/;
            const parts = text.split(sentenceRegex);
            const sentences = [];
            
            // Reconstruct sentences with their punctuation
            for (let i = 0; i < parts.length; i += 2) {
              const sentence = parts[i];
              const punctuation = parts[i + 1] || '';
              
              if (sentence.trim()) {
                // Sentence with its trailing punctuation
                sentences.push(sentence.trim() + punctuation);
              } else if (punctuation.trim()) {
                // Just punctuation/whitespace
                sentences.push(punctuation);
              }
            }
            
            // Filter out empty strings
            const validSentences = sentences.filter(s => s.trim().length > 0);
            
            if (validSentences.length === 0) {
              continue;
            }
            
            // Translate each sentence separately
            const translatedSentences = [];
            for (let i = 0; i < validSentences.length; i++) {
              const sentenceWithPunct = validSentences[i];
              
              // Check if it's just punctuation/whitespace
              if (/^[.!?\s\n]+$/.test(sentenceWithPunct.trim())) {
                translatedSentences.push(sentenceWithPunct);
                continue;
              }
              
              // Extract sentence text (without trailing punctuation for translation)
              // Then add punctuation back after translation
              const match = sentenceWithPunct.match(/^(.+?)([.!?\s]*)$/);
              const sentenceText = match ? match[1].trim() : sentenceWithPunct.trim();
              const punctuation = match ? match[2] : '';
              
              if (!sentenceText) {
                translatedSentences.push(sentenceWithPunct);
                continue;
              }
              
              // Translate the sentence text
              try {
                const translated = await this.translateText(sentenceText, targetLanguage, sourceLanguage);
                if (translated && translated.length > 0) {
                  // Add punctuation back to translated sentence
                  translatedSentences.push(translated + punctuation);
                } else {
                  // Keep original if translation fails
                  translatedSentences.push(sentenceWithPunct);
                }
              } catch (error) {
                console.error(`Error translating sentence "${sentenceText.substring(0, 50)}...":`, error);
                // Keep original sentence if translation fails
                translatedSentences.push(sentenceWithPunct);
              }
              
              // Add small delay between sentences to avoid rate limiting
              if (i < validSentences.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            // Reconstruct the text node with translated sentences (add space between if needed)
            const translatedText = translatedSentences.join(' ');
            if (translatedText.length > 0) {
              textNode.textContent = translatedText;
            } else {
              // Keep original if all translations failed
              console.warn('All sentence translations failed, keeping original text');
            }
          } catch (error) {
            console.error(`Error translating text node "${text.substring(0, 50)}...":`, error);
            // Keep original text if there's a critical error
            console.warn('Keeping original text due to translation error');
          }
        }
      }

      // Return the translated HTML
      return body.innerHTML;
    } catch (error) {
      console.error('Error translating HTML:', error);
      // Don't fall back to original - rethrow the error so the caller knows translation failed
      throw new Error(`Failed to translate HTML: ${error.message}`);
    }
  }
}

// Export singleton instance
export const translationService = new TranslationService();

