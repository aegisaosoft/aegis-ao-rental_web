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

const RentalTerms = () => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  
  const companyName = companyConfig?.companyName || 'Our Company';
  const bannerLink = companyConfig?.bannerLink || companyConfig?.BannerLink;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Image with Overlay Text */}
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
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white text-center px-4 drop-shadow-2xl">
              {t('legal.terms.title')}
            </h1>
          </div>
        </div>
      ) : null}

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title when no banner */}
        {!bannerLink && (
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 pb-4 border-b-4 border-blue-600 inline-block">
              {t('legal.terms.title')}
            </h1>
          </div>
        )}

        <p className="text-center text-gray-600 italic mb-8">
          {t('legal.terms.intro')}
        </p>

        {/* Section 3 - Electronic Communications and Telematics */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section3.title')}
          </h2>
          <div className="space-y-4 text-gray-700 text-justify leading-relaxed">
            <p>{t('legal.terms.section3.para_a')}</p>
            <p>{t('legal.terms.section3.para_b')}</p>
            <p>{t('legal.terms.section3.para_c')}</p>
            <p>{t('legal.terms.section3.para_d')}</p>
            <p>{t('legal.terms.section3.para_e')}</p>
            <p>{t('legal.terms.section3.para_f')}</p>
          </div>
        </div>

        {/* Section 4 - Responsibility for Loss/Damage */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section4.title')}
          </h2>
          <div className="space-y-4 text-gray-700 text-justify leading-relaxed">
            <p>{t('legal.terms.section4.para_a')}</p>
            <p>{t('legal.terms.section4.para_b')}</p>
            <p>{t('legal.terms.section4.para_c')}</p>
            
            {/* State-specific subsections */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-4">
              <h3 className="font-semibold text-gray-800 mb-2">{t('legal.terms.section4.california.title')}</h3>
              <p className="text-sm">{t('legal.terms.section4.california.text')}</p>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-4">
              <h3 className="font-semibold text-gray-800 mb-2">{t('legal.terms.section4.illinois.title')}</h3>
              <p className="text-sm">{t('legal.terms.section4.illinois.text')}</p>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-4">
              <h3 className="font-semibold text-gray-800 mb-2">{t('legal.terms.section4.indiana.title')}</h3>
              <p className="text-sm">{t('legal.terms.section4.indiana.text')}</p>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-4">
              <h3 className="font-semibold text-gray-800 mb-2">{t('legal.terms.section4.nevada.title')}</h3>
              <p className="text-sm">{t('legal.terms.section4.nevada.text')}</p>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-4">
              <h3 className="font-semibold text-gray-800 mb-2">{t('legal.terms.section4.newyork.title')}</h3>
              <p className="text-sm">{t('legal.terms.section4.newyork.text')}</p>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-4">
              <h3 className="font-semibold text-gray-800 mb-2">{t('legal.terms.section4.wisconsin.title')}</h3>
              <p className="text-sm">{t('legal.terms.section4.wisconsin.text')}</p>
            </div>
            
            <p>{t('legal.terms.section4.para_d')}</p>
          </div>
        </div>

        {/* Section 5 - Prohibited Use */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section5.title')}
          </h2>
          <div className="text-gray-700 text-justify leading-relaxed">
            <p className="mb-4">{t('legal.terms.section5.intro')}</p>
            <ul className="list-disc list-inside space-y-2 mb-4 pl-4">
              <li>{t('legal.terms.section5.prohibited1')}</li>
              <li>{t('legal.terms.section5.prohibited2')}</li>
              <li>{t('legal.terms.section5.prohibited3')}</li>
              <li>{t('legal.terms.section5.prohibited4')}</li>
              <li>{t('legal.terms.section5.prohibited5')}</li>
              <li>{t('legal.terms.section5.prohibited6')}</li>
              <li>{t('legal.terms.section5.prohibited7')}</li>
              <li>{t('legal.terms.section5.prohibited8')}</li>
            </ul>
            <p>{t('legal.terms.section5.consequences')}</p>
          </div>
        </div>

        {/* Section 6 - Payment of Charges */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section6.title')}
          </h2>
          <div className="space-y-4 text-gray-700 text-justify leading-relaxed">
            <p>{t('legal.terms.section6.para_a')}</p>
            <p className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 font-medium">
              {t('legal.terms.section6.para_b')}
            </p>
            <p>{t('legal.terms.section6.para_c')}</p>
          </div>
        </div>

        {/* Section 7 - Computation of Charges */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section7.title')}
          </h2>
          <div className="space-y-4 text-gray-700 text-justify leading-relaxed">
            <p>{t('legal.terms.section7.time_charges')}</p>
            <p>{t('legal.terms.section7.mileage_charges')}</p>
            <p>{t('legal.terms.section7.service_charge')}</p>
            <p>{t('legal.terms.section7.ldw_charges')}</p>
            <p>{t('legal.terms.section7.taxes')}</p>
            <p className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 font-medium">
              {t('legal.terms.section7.toll_violations')}
            </p>
            <p>{t('legal.terms.section7.recovery_expense')}</p>
            <p>{t('legal.terms.section7.collection_expense')}</p>
            <p>{t('legal.terms.section7.late_payment')}</p>
            <p>{t('legal.terms.section7.fines')}</p>
            <p>{t('legal.terms.section7.additional_services')}</p>
            <p>{t('legal.terms.section7.return_change_fee')}</p>
            <p>{t('legal.terms.section7.lost_keys')}</p>
            <p>{t('legal.terms.section7.lost_gps')}</p>
            <p>{t('legal.terms.section7.smoking_fee')}</p>
          </div>
        </div>

        {/* Section 8 - Refueling Options */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section8.title')}
          </h2>
          <div className="text-gray-700 text-justify leading-relaxed">
            <p className="mb-4">{t('legal.terms.section8.intro')}</p>
            <ol className="list-decimal list-inside space-y-2 mb-4 pl-4">
              <li>{t('legal.terms.section8.option1')}</li>
              <li>{t('legal.terms.section8.option2')}</li>
              <li>{t('legal.terms.section8.option3')}</li>
            </ol>
            <p className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 font-medium">
              {t('legal.terms.section8.note')}
            </p>
          </div>
        </div>

        {/* Section 9 - Arbitration */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section9.title')}
          </h2>
          <p className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 font-medium text-gray-700">
            {t('legal.terms.section9.text')}
          </p>
        </div>

        {/* Section 10 - Responsibility for Property */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section10.title')}
          </h2>
          <p className="text-gray-700 text-justify leading-relaxed">
            {t('legal.terms.section10.text')}
          </p>
        </div>

        {/* Section 11 - Liability Protection */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section11.title')}
          </h2>
          <div className="space-y-4 text-gray-700 text-justify leading-relaxed">
            <p>{t('legal.terms.section11.para_a')}</p>
            <p>{t('legal.terms.section11.para_b')}</p>
            <p className="italic">{t('legal.terms.section11.florida')}</p>
            <p>{t('legal.terms.section11.para_c')}</p>
          </div>
        </div>

        {/* Section 12 - Accidents */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section12.title')}
          </h2>
          <p className="text-gray-700 text-justify leading-relaxed">
            {t('legal.terms.section12.text')}
          </p>
        </div>

        {/* Section 13 - Limits on Liability */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section13.title')}
          </h2>
          <p className="text-gray-700 text-justify leading-relaxed">
            {t('legal.terms.section13.text')}
          </p>
        </div>

        {/* Section 14 - Privacy */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section14.title')}
          </h2>
          <p className="text-gray-700 text-justify leading-relaxed">
            {t('legal.terms.section14.text')}
          </p>
        </div>

        {/* Section 15 - Governing Law */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section15.title')}
          </h2>
          <p className="text-gray-700 text-justify leading-relaxed">
            {t('legal.terms.section15.text')}
          </p>
        </div>

        {/* Section 16 - Payments to Intermediaries */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section16.title')}
          </h2>
          <p className="text-gray-700 text-justify leading-relaxed">
            {t('legal.terms.section16.text')}
          </p>
        </div>

        {/* Section 17 - Miami-Dade County Waiver */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section17.title')}
          </h2>
          <p className="text-gray-700 text-justify leading-relaxed">
            {t('legal.terms.section17.text')}
          </p>
        </div>

        {/* Section 18 - Recovery of Costs */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 pb-3 border-b border-gray-200">
            {t('legal.terms.section18.title')}
          </h2>
          <p className="text-gray-700 text-justify leading-relaxed">
            {t('legal.terms.section18.text')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RentalTerms;
