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

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import apiService from '../services/api';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiService.forgotPassword({ email });
      
      // Check if email doesn't exist - redirect to signup
      if (response.data?.emailNotFound || response.data?.redirectToSignup) {
        toast.info(t('forgotPassword.emailNotFound') || 'Email not found. Redirecting to signup...');
        setTimeout(() => {
          navigate('/register', { state: { email } });
        }, 1500);
        return;
      }
      
      setEmailSent(true);
      toast.success(response.data?.message || t('forgotPassword.emailSent') || 'If the email exists, a password reset link has been sent.');
    } catch (error) {
      toast.error(error.response?.data?.message || t('forgotPassword.error') || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Car className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          {t('forgotPassword.title') || 'Forgot Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('forgotPassword.subtitle') || 'Enter your email address and we\'ll send you a link to reset your password.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {emailSent ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {t('forgotPassword.checkEmail') || 'Check your email'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {t('forgotPassword.emailSentMessage') || 'We\'ve sent a password reset link to your email address.'}
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('forgotPassword.backToLogin') || 'Back to Login'}
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('forgotPassword.emailAddress') || 'Email address'}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder={t('forgotPassword.emailPlaceholder') || 'Enter your email'}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('forgotPassword.sending') || 'Sending...'}
                    </div>
                  ) : (
                    t('forgotPassword.sendResetLink') || 'Send Reset Link'
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  <ArrowLeft className="inline h-4 w-4 mr-1" />
                  {t('forgotPassword.backToLogin') || 'Back to Login'}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

