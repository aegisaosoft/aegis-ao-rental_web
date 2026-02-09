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

import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';
import { Car } from 'lucide-react';

const About = () => {
  const { i18n: i18nInstance, t } = useTranslation();
  const currentLanguage = (i18nInstance.language || 'en').toLowerCase();
  const { companyConfig } = useCompany();
  
  const companyName = companyConfig?.companyName || 'Our Company';
  const bannerLink = companyConfig?.bannerLink || companyConfig?.BannerLink;

  // Create bundled translations for matching (same as Home page)
  const bundledTranslations = useMemo(() => {
    const resources = i18nInstance?.options?.resources || {};
    const map = {};

    const flatten = (obj, prefix = []) => {
      Object.entries(obj || {}).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const normalizedKey = [...prefix, key].join('.').toLowerCase();
          map.__current__[normalizedKey] = value;
        } else if (typeof value === 'object' && value !== null) {
          flatten(value, [...prefix, key]);
        }
      });
    };

    const result = {};
    Object.entries(resources).forEach(([lng, bundle]) => {
      map.__current__ = {};
      flatten(bundle);
      const lowerLang = lng.toLowerCase();
      result[lowerLang] = { ...(result[lowerLang] || {}), ...map.__current__ };
      const base = lowerLang.split('-')[0];
      if (base) {
        result[base] = { ...(result[base] || {}), ...map.__current__ };
      }
    });

    return result;
  }, [i18nInstance?.options?.resources]);

  // Translate function (same as Home page)
  const translate = useCallback(
    (value, defaultValue = '') => {
      if (!value) return defaultValue;
      if (typeof value === 'string') return value;

      const normalized = Object.entries(value).reduce((acc, [key, val]) => {
        if (typeof val === 'string') {
          acc[key.toLowerCase()] = val;
        }
        return acc;
      }, {});

      const langCandidates = [
        currentLanguage,
        currentLanguage.split('-')[0],
        (companyConfig?.language || '').toLowerCase(),
        'en'
      ].filter(Boolean);

      for (const lang of langCandidates) {
        const literal = normalized[lang];
        if (literal && literal.trim()) {
          return literal.trim();
        }

        const bundle = bundledTranslations[lang];
        if (bundle) {
          for (const str of Object.values(normalized)) {
            if (str) {
              const key = str.toLowerCase();
              if (bundle[key]) {
                return bundle[key];
              }
            }
          }
        }
      }

      const fallbackLiteral = Object.values(normalized).find(
        (val) => typeof val === 'string' && val.trim()
      );
      return fallbackLiteral ? fallbackLiteral.trim() : defaultValue;
    },
    [bundledTranslations, companyConfig?.language, currentLanguage]
  );

  // Parse about sections (same structure as texts)
  const aboutSections = useMemo(() => {
    const rawAbout = companyConfig?.about;

    const normalizeSections = (source) => {
      if (!source) return [];
      if (Array.isArray(source)) return source;
      if (Array.isArray(source?.sections)) return source.sections;
      if (Array.isArray(source?.Sections)) return source.Sections;

      if (typeof source === 'string') {
        try {
          const parsed = JSON.parse(source);
          return normalizeSections(parsed);
        } catch (err) {
          return [];
        }
      }

      return [];
    };

    return normalizeSections(rawAbout);
  }, [companyConfig]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Image with Overlay Text - Full Page Width */}
      {bannerLink ? (
        <div 
          className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden"
          style={{
            backgroundImage: `url(${bannerLink})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          
          {/* About Company Name Text Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white text-center px-4 drop-shadow-2xl">
              {t('about.title', { companyName })}
            </h1>
          </div>
        </div>
      ) : null}

      {/* Big Caption - About Company Name (fallback when no banner) */}
      {!bannerLink && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4">
            {t('about.title', { companyName })}
          </h1>
        </div>
        </div>
      )}

      {/* Content Section - Use about JSON if available, otherwise use default translations */}
      {aboutSections.length > 0 ? (
        // Render sections from about JSON - Page Wide
        <div className="space-y-0">
          {aboutSections.map((section, index) => {
            const title = translate(section.title) || '';
            const description = translate(section.description) || '';
            const alignment = (section.alignment || 'left').toLowerCase();
            const notesLayout = (section.notesLayout || 'vertical').toLowerCase();
            const backgroundImage =
              typeof section.backgroundImage === 'string'
                ? section.backgroundImage
                : section.backgroundImage?.url || '';
            const cardStyle = section.backColor
              ? { backgroundColor: section.backColor }
              : undefined;
            const headingClass =
              alignment === 'center'
                ? 'text-center mx-auto'
                : alignment === 'right'
                ? 'text-right ml-auto'
                : 'text-left';
            const descriptionClass =
              alignment === 'center'
                ? 'mx-auto text-center'
                : alignment === 'right'
                ? 'ml-auto text-right'
                : 'text-left';
            const hasNotes = Array.isArray(section.notes) && section.notes.length > 0;
            const notesWrapperClass =
              notesLayout === 'horizontal'
                ? 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'
                : 'space-y-6';

            const sectionStyle = {
              ...(cardStyle || { backgroundColor: '#ffffff' }),
              ...(backgroundImage && {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minHeight: '100%',
              }),
            };

            return (
              <section
                key={`about-section-${index}`}
                className="relative w-full py-20 min-h-full"
                style={sectionStyle}
              >
                {backgroundImage && (
                  <div className="absolute inset-0 bg-white opacity-65" />
                )}
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                  <div className="space-y-4">
                    {title && (
                      <h2
                        className={`text-3xl md:text-4xl font-bold text-gray-900 ${headingClass}`}
                        style={section.foreColor ? { color: section.foreColor } : undefined}
                      >
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p
                        className={`text-lg md:text-xl text-gray-700 max-w-3xl ${descriptionClass}`}
                        style={section.foreColor ? { color: section.foreColor } : undefined}
                      >
                        {description}
                      </p>
                    )}
                  </div>

                  {hasNotes && (
                    <div className={notesWrapperClass}>
                      {section.notes.map((note, noteIndex) => {
                        const noteTitle = translate(note.title) || '';
                        const noteCaption = translate(note.caption) || '';
                        const noteText = translate(note.text) || '';
                        const notePicture =
                          (typeof note.picture === 'string' && note.picture) ||
                          note.picture?.url ||
                          '';
                        const symbolSvg =
                          typeof note.symbol === 'string' && note.symbol.trim().startsWith('<')
                            ? note.symbol
                            : null;
                        const symbolColor = note.symbolForeColor || '#FACC15';
                        const noteForeground = note.foreColor || undefined;
                        const noteBackground =
                          note.backColor ||
                          (notesLayout === 'horizontal' ? 'rgba(17, 24, 39, 0.03)' : 'rgba(17, 24, 39, 0.02)');

                        if (!noteTitle && !noteCaption && !noteText && !notePicture && !symbolSvg) {
                          return null;
                        }

                        if (notesLayout === 'vertical') {
                          return (
                            <div
                              key={`note-${index}-${noteIndex}`}
                              className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-lg"
                              style={{ backgroundColor: noteBackground }}
                            >
                                <div className="flex-shrink-0 flex flex-col items-start gap-3 min-w-[56px]">
                                  {notePicture && (
                                    <img
                                      src={notePicture}
                                      alt={noteTitle || `Section ${index + 1} note ${noteIndex + 1}`}
                                      className="rounded-md object-contain"
                                      style={{ maxHeight: '100px', width: 'auto', height: 'auto' }}
                                      onLoad={(e) => {
                                        const img = e.target;
                                        if (img.naturalHeight <= 160) {
                                          img.style.maxHeight = 'none';
                                        }
                                      }}
                                      loading="lazy"
                                    />
                                  )}
                                {(symbolSvg || note.symbol) && (
                                  <div
                                    className="h-12 w-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: note.backColor || 'rgba(0,0,0,0.08)', color: symbolColor }}
                                  >
                                    {symbolSvg ? (
                                      <span
                                        className="h-6 w-6"
                                        aria-hidden="true"
                                        dangerouslySetInnerHTML={{ __html: symbolSvg }}
                                      />
                                    ) : (
                                      <Car className="h-6 w-6" />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 space-y-2">
                                {noteTitle && (
                                  <h3
                                    className="text-xl font-semibold"
                                    style={noteForeground ? { color: noteForeground } : undefined}
                                  >
                                    {noteTitle}
                                  </h3>
                                )}
                                {noteCaption && (
                                  <p
                                    className="text-sm font-medium uppercase tracking-wide opacity-80"
                                    style={noteForeground ? { color: noteForeground } : undefined}
                                  >
                                    {noteCaption}
                                  </p>
                                )}
                                {noteText && (
                                  <p
                                    className="text-base leading-relaxed"
                                    style={noteForeground ? { color: noteForeground } : undefined}
                                  >
                                    {noteText}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`note-${index}-${noteIndex}`}
                            className="rounded-lg p-6"
                            style={{ backgroundColor: noteBackground }}
                          >
                              {notePicture && (
                                <img
                                  src={notePicture}
                                  alt={noteTitle || `Section ${index + 1} note ${noteIndex + 1}`}
                                  className="object-contain rounded-md mb-4"
                                  style={{ maxHeight: '100px', width: 'auto', height: 'auto' }}
                                  onLoad={(e) => {
                                    const img = e.target;
                                    if (img.naturalHeight <= 160) {
                                      img.style.maxHeight = 'none';
                                    }
                                  }}
                                  loading="lazy"
                                />
                              )}
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className="h-12 w-12 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: note.backColor || 'rgba(0,0,0,0.08)', color: symbolColor }}
                              >
                                {symbolSvg ? (
                                  <span
                                    className="h-6 w-6"
                                    aria-hidden="true"
                                    dangerouslySetInnerHTML={{ __html: symbolSvg }}
                                  />
                                ) : (
                                  <Car className="h-6 w-6" />
                                )}
                              </div>
                              <div>
                                {noteTitle && (
                                  <h3
                                    className="text-lg font-semibold"
                                    style={noteForeground ? { color: noteForeground } : undefined}
                                  >
                                    {noteTitle}
                                  </h3>
                                )}
                                {noteCaption && (
                                  <p
                                    className="text-sm font-medium uppercase tracking-wide opacity-80"
                                    style={noteForeground ? { color: noteForeground } : undefined}
                                  >
                                    {noteCaption}
                                  </p>
                                )}
                              </div>
                            </div>
                            {noteText && (
                              <p
                                className="text-base leading-relaxed"
                                style={noteForeground ? { color: noteForeground } : undefined}
                              >
                                {noteText}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        // Fallback to default translations if about JSON is empty
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            <div className="prose prose-lg max-w-none">
              <p className="text-xl text-gray-700 leading-relaxed mb-6">
                {t('about.description', { companyName })}
              </p>
              
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('about.ourMission')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('about.missionDescription')}
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('about.ourValues')}
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
                <li>{t('about.value1')}</li>
                <li>{t('about.value2')}</li>
                <li>{t('about.value3')}</li>
                <li>{t('about.value4')}</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('about.whyChooseUs')}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t('about.whyChooseUsDescription', { companyName })}
              </p>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default About;

