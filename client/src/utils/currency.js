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

const FALLBACK_SYMBOLS = {
  USD: '$',
  CAD: '$',
  MXN: '$',
  EUR: '€',
  GBP: '£',
  BBD: '$',
  BZD: '$',
  BMD: '$',
  BSD: '$',
  COP: '$',
  CLP: '$',
  PEN: 'S/',
  PAB: 'B/.',
  CRC: '₡',
  CUP: '$',
  DKK: 'kr',
  GTQ: 'Q',
  GYD: '$',
  HNL: 'L',
  HTG: 'G',
  JMD: '$',
  KYD: '$',
  NIO: 'C$',
  TTD: '$',
  ARS: '$',
  BOB: 'Bs',
  BRL: 'R$',
  PYG: '₲',
  SRD: '$',
  UYU: '$',
  VES: 'Bs',
  XCD: '$'
};

export const normalizeCurrencyCode = (code) => {
  if (typeof code !== 'string' || !code.trim()) return 'USD';
  return code.trim().toUpperCase();
};

export const formatCurrency = (amount, currencyCode = 'USD', options = {}) => {
  if (amount === null || amount === undefined || amount === '') return '';

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return '';

  const code = normalizeCurrencyCode(currencyCode);
  const {
    locale,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  try {
    const formatter = new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits,
      maximumFractionDigits
    });
    return formatter.format(numericAmount);
  } catch (err) {
    const symbol = FALLBACK_SYMBOLS[code] || FALLBACK_SYMBOLS.USD;
    return `${symbol}${numericAmount.toFixed(Math.max(minimumFractionDigits, 0))}`;
  }
};

export const getCurrencySymbol = (currencyCode = 'USD') => {
  const code = normalizeCurrencyCode(currencyCode);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value || FALLBACK_SYMBOLS[code] || FALLBACK_SYMBOLS.USD;
  } catch (err) {
    return FALLBACK_SYMBOLS[code] || FALLBACK_SYMBOLS.USD;
  }
};

