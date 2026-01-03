/*
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Check,
  ExternalLink,
  Smartphone,
  Globe,
  Building2,
  Link2,
  Camera,
  Users,
  MessageSquare,
  Settings,
  AlertCircle
} from 'lucide-react';

// Instagram Icon Component
const InstagramIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// Facebook Icon Component
const FacebookIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramSetupGuideModal = ({ t, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'intro',
      icon: <InstagramIcon className="h-8 w-8 text-pink-500" />,
      title: t('instagramGuide.step0.title', 'Welcome to Instagram Business Setup'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('instagramGuide.step0.intro', 'This guide will help you create and connect your Instagram Business account for your car rental company. Follow these simple steps to start promoting your vehicles on Instagram!')}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">
                  {t('instagramGuide.step0.requirements', 'Requirements')}
                </p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• {t('instagramGuide.step0.req1', 'A smartphone with Instagram app installed')}</li>
                  <li>• {t('instagramGuide.step0.req2', 'A Facebook account (required for Business accounts)')}</li>
                  <li>• {t('instagramGuide.step0.req3', 'Your company logo and photos')}</li>
                  <li>• {t('instagramGuide.step0.req4', 'About 15-20 minutes of your time')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'create-instagram',
      icon: <Smartphone className="h-8 w-8 text-pink-500" />,
      title: t('instagramGuide.step1.title', 'Step 1: Create Instagram Account'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 font-medium">
            {t('instagramGuide.step1.subtitle', 'If you already have Instagram, skip to Step 2')}
          </p>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step1.action1', 'Download Instagram app from App Store (iPhone) or Google Play (Android)')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step1.action2', 'Open the app and tap "Sign Up"')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step1.action3', 'Choose "Sign up with Email" and enter your business email')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step1.action4', 'Create a username for your business (e.g., "yourcompany_rentals")')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('instagramGuide.step1.tip1', 'Tip: Keep it short, memorable, and related to your business name')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step1.action5', 'Create a strong password and complete registration')}</p>
              </div>
            </li>
          </ol>
        </div>
      )
    },
    {
      id: 'facebook-page',
      icon: <FacebookIcon className="h-8 w-8 text-blue-600" />,
      title: t('instagramGuide.step2.title', 'Step 2: Create Facebook Business Page'),
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              {t('instagramGuide.step2.why', 'A Facebook Page is required to use Instagram Business features and to connect to our system.')}
            </p>
          </div>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step2.action1', 'Open Facebook.com on your computer or phone')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step2.action2', 'Click the menu (☰) and select "Pages"')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step2.action3', 'Click "Create New Page"')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step2.action4', 'Enter your business name (e.g., "Your Company Car Rentals")')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step2.action5', 'Select category "Car Rental" or "Automotive"')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">6</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step2.action6', 'Add a short description of your rental business')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">7</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step2.action7', 'Upload your company logo as profile picture')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">8</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step2.action8', 'Click "Create Page"')}</p>
              </div>
            </li>
          </ol>
        </div>
      )
    },
    {
      id: 'switch-business',
      icon: <Building2 className="h-8 w-8 text-purple-500" />,
      title: t('instagramGuide.step3.title', 'Step 3: Switch to Business Account'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('instagramGuide.step3.intro', 'Now convert your Instagram to a Business account:')}
          </p>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step3.action1', 'Open Instagram app and go to your profile (tap person icon)')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step3.action2', 'Tap the menu (☰) in top right corner')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step3.action3', 'Tap "Settings and privacy"')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step3.action4', 'Scroll down and tap "Account type and tools"')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step3.action5', 'Tap "Switch to professional account"')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">6</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step3.action6', 'Select "Business" (not Creator)')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">7</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step3.action7', 'Select category "Car Rental" and tap "Done"')}</p>
              </div>
            </li>
          </ol>
        </div>
      )
    },
    {
      id: 'link-facebook',
      icon: <Link2 className="h-8 w-8 text-green-500" />,
      title: t('instagramGuide.step4.title', 'Step 4: Link Instagram to Facebook Page'),
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              {t('instagramGuide.step4.important', 'This step is critical! Without linking to Facebook, our system cannot connect to your Instagram.')}
            </p>
          </div>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step4.action1', 'In Instagram, go to Profile → Menu (☰) → Settings')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step4.action2', 'Tap "Business" or "Creator" section')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step4.action3', 'Tap "Connect or Create" under Facebook Page')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step4.action4', 'Log in to Facebook if prompted')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step4.action5', 'Select the Facebook Page you created in Step 2')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">6</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step4.action6', 'Confirm the connection')}</p>
              </div>
            </li>
          </ol>
        </div>
      )
    },
    {
      id: 'setup-profile',
      icon: <Camera className="h-8 w-8 text-orange-500" />,
      title: t('instagramGuide.step5.title', 'Step 5: Complete Your Profile'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('instagramGuide.step5.intro', 'Make your profile attractive to potential customers:')}
          </p>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step5.action1', 'Upload your company logo as profile picture')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step5.action2', 'Write a compelling bio (max 150 characters)')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('instagramGuide.step5.bioExample', 'Example: "🚗 Premium Car Rentals | 📍 Miami, FL | ✨ Best Prices | 📞 Call Now!"')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step5.action3', 'Add your website URL (copy from browser address bar, e.g. yourcompany.aegis-rental.com)')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('instagramGuide.step5.urlTip', 'Open your rental website in browser, copy the address from the top bar')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step5.action4', 'Add contact button with phone number and email')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step5.action5', 'Add your business address')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">6</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step5.action6', 'Post 3-5 photos of your best vehicles')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('instagramGuide.step5.photoTip', 'Tip: Use high-quality photos with good lighting')}</p>
              </div>
            </li>
          </ol>
        </div>
      )
    },
    {
      id: 'connect-system',
      icon: <Settings className="h-8 w-8 text-indigo-500" />,
      title: t('instagramGuide.step6.title', 'Step 6: Connect to Our System'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('instagramGuide.step6.intro', 'Now connect your Instagram Business account to our system:')}
          </p>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step6.action1', 'Close this guide')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step6.action2', 'Click the "Connect with Facebook" button on this page')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step6.action3', 'Log in with your Facebook account')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step6.action4', 'Select the Facebook Page linked to your Instagram')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step6.action5', 'Click "Continue" to grant all permissions (do NOT uncheck anything)')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('instagramGuide.step6.permissionNote', 'We need all permissions to post vehicles and manage your page. Just click Continue/Allow on each screen.')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">6</span>
              <div>
                <p className="text-gray-900">{t('instagramGuide.step6.action6', 'Click "Done" to complete the connection')}</p>
              </div>
            </li>
          </ol>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <div className="flex gap-3">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">
                  {t('instagramGuide.step6.success', "That's it! You're all set!")}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {t('instagramGuide.step6.successDesc', 'Once connected, you can automatically post your vehicles to Instagram and reach more customers.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      icon: <Users className="h-8 w-8 text-teal-500" />,
      title: t('instagramGuide.step7.title', 'Tips for Success'),
      content: (
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Camera className="h-5 w-5 text-pink-500" />
                {t('instagramGuide.step7.tip1Title', 'Post Quality Photos')}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {t('instagramGuide.step7.tip1Desc', 'Use natural lighting, clean backgrounds, and show vehicles from multiple angles. Photos sell!')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                {t('instagramGuide.step7.tip2Title', 'Engage with Followers')}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {t('instagramGuide.step7.tip2Desc', 'Respond to comments and messages quickly. Good customer service builds trust.')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                {t('instagramGuide.step7.tip3Title', 'Use Relevant Hashtags')}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {t('instagramGuide.step7.tip3Desc', 'Include hashtags like #carrental #rentacar #[yourcity] to reach more people.')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-500" />
                {t('instagramGuide.step7.tip4Title', 'Post Regularly')}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {t('instagramGuide.step7.tip4Desc', 'Aim for 3-5 posts per week. Consistency helps you stay visible to potential customers.')}
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {steps[currentStep].icon}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {steps[currentStep].title}
              </h2>
              <p className="text-sm text-gray-500">
                {t('instagramGuide.stepOf', 'Step {{current}} of {{total}}', { current: currentStep + 1, total: steps.length })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-pink-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {steps[currentStep].content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
            {t('common.previous', 'Previous')}
          </button>

          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                <Check className="h-5 w-5" />
                {t('instagramGuide.startConnecting', 'Start Connecting')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                {t('common.next', 'Next')}
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramSetupGuideModal;
