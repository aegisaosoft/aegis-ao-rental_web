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

const STORAGE_KEY_FALLBACK = 'rentalSearchFilters';

const getTodayString = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

export const isDateBeforeToday = (value) => {
  if (!value) return false;

  const trimmed = value.toString().trim();
  if (!trimmed) return false;

  const todayString = getTodayString();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed < todayString;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const comparable = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return comparable < todayString;
};

export const sanitizeFilterDates = (filters) => {
  if (!filters || typeof filters !== 'object') {
    return { sanitized: {}, changed: false };
  }

  const sanitized = { ...filters };
  let changed = false;

  const dateKeys = ['startDate', 'endDate', 'pickupDate', 'returnDate'];

  dateKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(sanitized, key)) {
      return;
    }

    const value = sanitized[key];
    if (!value || isDateBeforeToday(value)) {
      delete sanitized[key];
      changed = true;
    }
  });

  return { sanitized, changed };
};

export const clearStoredFilterDates = (storageKey = STORAGE_KEY_FALLBACK) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const { sanitized, changed } = sanitizeFilterDates(parsed);

    if (!changed) return;

    if (Object.keys(sanitized).length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(sanitized));
    }
  } catch (error) {
    console.warn('[rentalSearchFilters] Failed to clear stored filter dates:', error);
  }
};
