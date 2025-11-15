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

const Privacy = () => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  
  // Privacy page always shows Aegis AO Soft company information (unchanged for all companies)
  const companyName = 'Aegis AO Soft';
  const companyEmail = 'aegisaosoft@gmail.com';
  const companyWebsite = 'https://aegisaosoft.com';
  const companyAddress = '34 Middletown Ave, Atlantic Highlands, NJ 07716';
  const bannerLink = companyConfig?.bannerLink || companyConfig?.BannerLink;

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
          
          {/* Privacy Policy Text Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white text-center px-4 drop-shadow-2xl">
              {t('privacy.title', 'Privacy Policy')}
            </h1>
          </div>
        </div>
      ) : null}

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Big Caption - Privacy Policy (fallback when no banner) */}
        {!bannerLink && (
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4">
              {t('privacy.title', 'Privacy Policy')}
            </h1>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            <div className="prose prose-lg max-w-none">
              
              {/* Introduction */}
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.intro', 'We thank you for using')} <strong><a href={companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">{companyName}</a></strong> {t('privacy.intro2', 'and visiting our websites. Here we explain what, how, and why of the information we collect when you visit one of our websites, or when you use our Services. It also explains the specific ways we use and disclose that information. We take your privacy extremely seriously, and we never sell lists or email addresses and/or Personal information.')}
              </p>

              {/* Controller of information */}
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.controller.title', 'Controller of information')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.controller.content', 'Any personal information provided to or gathered by this website and provided and gathered at any one of our locations is controlled primarily by')} <strong><a href={companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">{companyName}</a></strong>, {t('privacy.controller.content2', 'whose registered office is at')} {companyAddress}.
              </p>

              {/* Section 1: Definitions */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section1.title', '1. Definitions')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section1.content1', 'These definitions should help you understand this policy. When we say "we," "us," "our," and "Aegis AO Soft," we are referring to')} <strong><a href={companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">{companyName}</a></strong>, {t('privacy.section1.content2', 'a USA Registered Limited Company and/or any of our network.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section1.content3', 'We provide online platforms that you may use to make car rental reservations. We also provide you with the ability to rent cars (the "Services").')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section1.content4', 'When we say "you," we are referring to a person who visits any of our Websites or locations.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                {t('privacy.section1.content5', '"Personal Information" means any information that identifies or can be used to identify you or a Subscriber, directly or indirectly, including, but not limited to, first and last name, date of birth, email address, gender, occupation or other demographic information.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.section1.content6', 'We offer the Services on our websites and at our franchise locations. This Privacy Policy applies to these websites and locations, as well as any other sites or mobile applications owned or operated by us (each a "Website" and together the "Websites"). The "Websites" include the Websites themselves, and any web pages, interactive features, applications, widgets, blogs, social networks, social network "tabs," or other online, mobile, or wireless offerings that post a link to this Privacy Policy, whether accessed via computer, mobile device, or other technology, manner or means. While providing the Services, and as described in more detail below.')}
              </p>

              {/* Section 2: Variations */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section2.title', '2. Variations')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.section2.content', 'We may change this Privacy Policy at any time and from time to time. We recommend you to review this Privacy Policy often to stay informed of changes that may affect you, as your continued use of the Website signifies your continuing consent to be bound by this Privacy Policy. Our electronically or otherwise properly stored copies of this Privacy Policy are each deemed to be the true, complete, valid, authentic, and enforceable copy of the version of this Privacy Policy which were in effect on each respective date you visited the Website.')}
              </p>

              {/* Section 3: Area */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section3.title', '3. Area')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.section3.content', 'This Privacy Policy is effective with respect to any data that we have collected, or collect, about and/or from you.')}
              </p>

              {/* Section 4: Questions & Concerns */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section4.title', '4. Questions & Concerns')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.section4.content', 'If you have any questions or comments, or if you want to update, delete, or change any Personal Information we hold, or you have a concern about the way in which we have handled any privacy matter, please contact us using the details below.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.section4.contact', 'postal mail or email at:')} <strong><a href={companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">{companyName}</a></strong>, {t('privacy.section4.attn', 'Attn. Privacy,')} <a href={`mailto:${companyEmail}`} className="text-blue-600 hover:text-blue-800">{companyEmail}</a>, {companyAddress}
              </p>

              {/* Section 5: Information We Gather */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section5.title', '5. Information We Gather')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section5.subtitle1', '(a) Information you voluntarily provide to us:')}</strong> {t('privacy.section5.content1', 'When you make a booking on our website and/or rent a vehicle from one of our locations, consult with our customer service team, send us an email, or communicate with us in any way, you are voluntarily giving us information that we collect. We might require the following information')}
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4 ml-4">
                <li>{t('privacy.section5.item1', 'First and last name')}</li>
                <li>{t('privacy.section5.item2', 'Date of birth')}</li>
                <li>{t('privacy.section5.item3', 'Contact information (company, email, phone, physical address)')}</li>
                <li>{t('privacy.section5.item4', 'ID and Driver License data')}</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.section5.content2', 'By giving us this information, you consent to this information being collected, used, disclosed, transferred and stored by us.')}
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section5.subtitle2', '(1) Information we collect automatically:')}</strong> {t('privacy.section5.content3', 'When you use one of our Websites, we may collect information about your visit to our Websites, your usage of the Services, and your web browsing. That information may include your IP address, your operating system, your browser ID, your browsing activity, and other information about how you interacted with our Websites or other websites. We may collect this information as a part of log files as well as through the use of cookies or other tracking technologies. Our use of cookies and other tracking technologies is discussed more below, and in more detail in our Cookie Statement in our footer.')}
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section5.subtitle3', '(2) Information from your use of the Service:')}</strong> {t('privacy.section5.content4', 'We may receive information about how and when you use the Services, store it in log files or other types of files associated with your account, and link it to other information we collect about you. This information may include, for example, your IP address, time, date, browser used, and actions you have taken within the application. This type of information helps us to improve our Services for both you and for all of our users.')}
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-6">
                <strong>{t('privacy.section5.subtitle4', '(3) Cookies and tracking:')}</strong> {t('privacy.section5.content5', 'We and our service providers may use various technologies to collect and store information when you use our Services, and this may include using cookies and similar tracking technologies on our Website, such as pixels and web beacons, to analyze trends, administer the website, track users\' movements around the website, serve targeted advertisements, and gather demographic information about our user base as a whole. Users can control the use of cookies at the individual browser level. We partner with third parties to display advertising on our website or to manage and serve our advertising on other sites. Our third party partners may use cookies or similar tracking technologies in order to provide you advertising or other content based upon your browsing activities and interests. For more information about our use of cookies and other tracking technologies, as well as how to opt out of the use of cookies.')}
              </p>

              {/* Section 6: Adoption and Acknowledgment of Personal Information */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section6.title', '6. Adoption and Acknowledgment of Personal Information')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section6.content', 'We may use and disclose Personal Information only for the following purposes:')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle1', '(a)')}</strong> {t('privacy.section6.content1', 'To process your contract when hiring a vehicle. Full details of how we may process this information is contained within this privacy policy and on your rental agreement.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle2', '(b)')}</strong> {t('privacy.section6.content2', 'To bill and collect money owed to us. This includes sending you emails, invoices, receipts, notices of delinquency, and alerting you if we need different payment information. We use third parties for secure payment transaction processing, and we send billing information to those third parties to process your orders and payments. To learn more about the steps we take to safeguard that data, see Section 9 below.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle3', '(c)')}</strong> {t('privacy.section6.content3', 'To send you informational and promotional content in accordance with your marketing preferences. You can stop receiving our promotional emails by following the unsubscribe instructions included in every email.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle4', '(d)')}</strong> {t('privacy.section6.content4', 'To contact you about your rental This includes sending you emails asking you to rate the service you received. Based on your response, we may contact you to address this.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle5', '(e)')}</strong> {t('privacy.section6.content5', 'To send you System Alert messages. For example, we may inform you of temporary or permanent changes to our Services, such as planned outages, new features, version updates, releases, abuse warnings, and changes to our Privacy Policy.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle6', '(f)')}</strong> {t('privacy.section6.content6', 'To protect the rights and safety of you and third parties, as well as our own.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle7', '(g)')}</strong> {t('privacy.section6.content7', 'To communicate with you about your account and provide customer support.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle8', '(h)')}</strong> {t('privacy.section6.content8', 'To meet legal requirements, including complying with court orders, valid discovery requests, valid subpoenas, and other appropriate legal mechanisms.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle9', '(i)')}</strong> {t('privacy.section6.content9', 'To provide information to representatives and advisors, including attorneys and accountants, to help us comply with legal, accounting, or security requirements.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle10', '(j)')}</strong> {t('privacy.section6.content10', 'To prosecute and defend a court, arbitration, or similar legal proceeding.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle11', '(k)')}</strong> {t('privacy.section6.content11', 'To respond to lawful requests by public authorities, including to meet national security or law enforcement requirements.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle12', '(l)')}</strong> {t('privacy.section6.content12', 'To provide, support, and improve the Services we offer. This includes our use of the data that you provide us in order to enable you to use the services. This also includes, for example, aggregating information from your use of the Services or visit to our Websites and sharing this information with third parties to improve our Services. When we do have to share Personal Information with third parties, we take steps to protect your information by requiring these third parties to enter into a contract with us that requires them to use the Personal Information we transfer to them in a manner that is consistent with this policy.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section6.subtitle13', '(m)')}</strong> {t('privacy.section6.content13', 'To transfer your information in the case of a sale, merger, consolidation, liquidation, reorganization, or acquisition. In that event, any acquirer will be subject to our obligations under this Privacy Policy, including your rights to access and choice. We will notify you of the change either by sending you an email or posting a notice on our Website.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-6">
                <strong>{t('privacy.section6.subtitle14', '(m) Combined Information:')}</strong> {t('privacy.section6.content14', 'We may combine Personal Information with other information we collect or obtain about you (such as information we source from our third party partners), to serve you specifically, such as to deliver a product or service according to your preferences or restrictions, or for advertising or targeting purposes in accordance with this Privacy Policy. When we combine Personal Information with other information in this way, we treat it as, and apply all of the safeguards in this Privacy Policy applicable to, Personal Information.')}
              </p>

              {/* Section 7: Third Parties */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section7.title', '7. Third Parties')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section7.content', 'We may disclose Personal Information to the following types of third parties for the purposes described in this policy:')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>{t('privacy.section7.subtitle1', '(a) Service Providers.')}</strong> {t('privacy.section7.content1', 'Sometimes, we share your information with our third party Service Providers, who help us provide and support our Services. For example, if we send you an email or text message relating to our services then we may share your Personal Information with a Service Provider for that purpose. Just like with the other third parties we work with, these third party Service Providers enter into a contract that requires them to use your Personal Information only for the provision of services to us and in a manner that is consistent with this policy. Examples of Service Providers include payment processors, hosting services and content delivery services.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-6">
                <strong>{t('privacy.section7.subtitle2', '(b) Advertising partners.')}</strong> {t('privacy.section7.content2', 'We may partner with third party advertising networks and exchanges to display advertising on our Websites or to manage and serve our advertising on other sites and may share Personal Information with them for this purpose. All third parties with which we share this information are required to use your Personal Information in a manner that is consistent with this policy. We and our third party partners may use cookies and other tracking technologies, such as pixels and web beacons, to gather information about your activities on our Websites and other sites in order to provide you with targeted advertising based on your browsing activities and interests. For more information about cookies and other tracking technologies, please see our Cookie Statement in our footer.')}
              </p>

              {/* Section 8: Notice of Breach of Security */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section8.title', '8. Notice of Breach of Security')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section8.content1', 'If a security breach causes an unauthorized intrusion into our system that materially affects you or people on your Distribution Lists, then')} <strong><a href={companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">{companyName}</a></strong> {t('privacy.section8.content2', 'will notify you as soon as possible and later report the action we took in response.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section8.content3', 'The security of your personal information is important to us. When you enter sensitive information (such as your payment information) during any registration or booking process, we encrypt that information using secure socket layer technology (SSL).')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section8.content4', 'We follow generally accepted industry standards to protect the personally identifiable information and personal data submitted to us, both during transmission and once we receive it. No method of transmission over the Internet or method of electronic storage is 100% secure; therefore, while we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.section8.content5', 'With this in mind we would ask you not to enter any payment information into fields on our websites, unless that field is specifically marked for that purpose.')}
              </p>

              {/* Section 9: Safeguarding Your Information */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section9.title', '9. Safeguarding Your Information')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section9.content1', 'We take reasonable and appropriate measures to protect Personal Information from loss, misuse and unauthorized access, disclosure, alteration and destruction, taking into account the risks involved in the processing and the nature of the Personal Information.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section9.content2', 'Our payment processing vendor uses security measures to protect your information both during the transaction and after it is complete. Our vendor is certified as compliant with card association security initiatives, including the Visa Cardholder Information Security and Compliance (CISP), MasterCard® (SDP), and Discovery Information Security and Compliance (DISC). If you have any questions about the security of your Personal Information, you may contact us at')} <a href={`mailto:${companyEmail}`} className="text-blue-600 hover:text-blue-800">{companyEmail}</a>.
              </p>

              {/* Section 10: Accuracy and Retention of Data */}
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                {t('privacy.section10.title', '10. Accuracy and Retention of Data')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.section10.content1', 'We do our best to keep your data accurate and up to date, to the extent that you provide us with the information we need to do so. If your data changes (for example, if you have a new email address), then you are responsible for notifying us of those changes. Upon request, we will provide you with information about whether we hold, or process on behalf of a third party, any of your Personal Information. We will retain your information for as long as your account is active or as long as needed to provide you with our Services. We may also retain and use your information in order to comply with our legal obligations, resolve disputes, prevent abuse, and enforce our Agreements.')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacy.section10.content2', 'Our payment processing vendor uses security measures to protect your information both during the transaction and after it is complete. Our vendor is certified as compliant with card association security initiatives, including the Visa Cardholder Information Security and Compliance (CISP), MasterCard® (SDP), and Discovery Information Security and Compliance (DISC). If you have any questions about the security of your Personal Information, you may contact us at')} <a href={`mailto:${companyEmail}`} className="text-blue-600 hover:text-blue-800">{companyEmail}</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
