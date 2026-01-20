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
import { useCompany } from '../context/CompanyContext';
import TermsOfUseDisplay from '../components/TermsOfUseDisplay';

const Terms = () => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  
  const companyName = companyConfig?.companyName || 'Our Company';
  const bannerLink = companyConfig?.bannerLink || companyConfig?.BannerLink;
  
  // Check if company has custom terms of use in database
  const hasCustomTerms = companyConfig?.termsOfUse || companyConfig?.TermsOfUse;

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
          
          {/* Terms and Conditions Text Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white text-center px-4 drop-shadow-2xl">
              {t('terms.title', { companyName })}
            </h1>
          </div>
        </div>
      ) : null}

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Big Caption - Terms and Conditions (fallback when no banner) */}
        {!bannerLink && (
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4">
              {t('terms.title', { companyName })}
            </h1>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            {/* If company has custom terms in database, show those */}
            {hasCustomTerms ? (
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-gray-600 mb-8">
                  {t('terms.lastUpdated')}
                </p>
                <TermsOfUseDisplay 
                  termsOfUse={hasCustomTerms}
                  className="text-gray-700"
                />
              </div>
            ) : (
              /* Otherwise, show default terms from translation files */
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-gray-600 mb-8">
                  {t('terms.lastUpdated')}
                </p>

                <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                  {t('terms.section1.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {t('terms.section1.content', { companyName })}
                </p>

                <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                  {t('terms.section2.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('terms.section2.content', { companyName })}
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
                  <li>{t('terms.section2.item1')}</li>
                  <li>{t('terms.section2.item2')}</li>
                  <li>{t('terms.section2.item3')}</li>
                  <li>{t('terms.section2.item4')}</li>
                </ul>

                <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                  {t('terms.section3.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('terms.section3.content', { companyName })}
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
                  <li>{t('terms.section3.item1')}</li>
                  <li>{t('terms.section3.item2')}</li>
                  <li>{t('terms.section3.item3')}</li>
                  <li>{t('terms.section3.item4')}</li>
                </ul>

                <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                  {t('terms.section4.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('terms.section4.content', { companyName })}
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
                  <li>{t('terms.section4.item1')}</li>
                  <li>{t('terms.section4.item2')}</li>
                  <li>{t('terms.section4.item3')}</li>
                  <li>{t('terms.section4.item4')}</li>
                </ul>

                <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                  {t('terms.section5.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {t('terms.section5.content', { companyName })}
                </p>

                <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                  {t('terms.section6.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {t('terms.section6.content', { companyName })}
                </p>

                <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                  {t('terms.section7.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {t('terms.section7.content', { companyName })}
                </p>

                <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                  {t('terms.section8.title')}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('terms.section8.content', { companyName })}
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
                  <li>{t('terms.section8.item1')}</li>
                  <li>{t('terms.section8.item2')}</li>
                  <li>{t('terms.section8.item3')}</li>
                  <li>{t('terms.section8.item4')}</li>
                  <li>{t('terms.section8.item5')}</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('terms.section8.disclaimer', { companyName })}
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>{t('terms.section8.optout')}</strong>
                </p>
                <p className="text-gray-700 leading-relaxed">
                  {t('terms.section8.authority')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;

