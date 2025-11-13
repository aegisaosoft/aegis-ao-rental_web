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

const About = () => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  
  const companyName = companyConfig?.companyName || 'Our Company';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Big Caption - About Company Name */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4">
            {t('about.title', { companyName })}
          </h1>
        </div>

        {/* Content Section */}
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
    </div>
  );
};

export default About;

