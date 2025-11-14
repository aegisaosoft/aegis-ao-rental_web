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

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, ArrowRight, Calendar, Users, Fuel, Settings } from 'lucide-react';
import { useQuery } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';
import AICarAssistant from '../components/AICarAssistant';
import { sanitizeFilterDates } from '../utils/rentalSearchFilters';

const SEARCH_FILTERS_STORAGE_KEY = 'rentalSearchFilters';

const Home = () => {
  const { i18n: i18nInstance, t } = useTranslation();
  const currentLanguage = (i18nInstance.language || 'en').toLowerCase();
  const { companyConfig, formatPrice } = useCompany();
  const navigate = useNavigate();

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [companyName, setCompanyName] = useState('Rentals');
  const modelsSectionRef = useRef(null);
  const filtersLoadedRef = useRef(false);
  
  // Determine effective company ID (domain context only - no fallback)
  const effectiveCompanyId = companyConfig?.id || null;
  
  // Fetch pickup locations (regular locations where companyId is null - no authentication required)
  const { data: pickupLocationsResponse } = useQuery(
    ['pickupLocations'],
    () => apiService.getPickupLocations(undefined), // undefined means get locations where companyId is null (don't include companyId param)
    {
      enabled: true, // Always enabled - public locations don't require authentication
      retry: 1,
      refetchOnWindowFocus: false
    }
  );
  
  const pickupLocationsData = pickupLocationsResponse?.data || pickupLocationsResponse;
  const companyLocations = Array.isArray(pickupLocationsData) ? pickupLocationsData : [];
  
  // Debug: Log locations to see what we're getting
  if (companyLocations.length > 0) {
    console.log('[Home] Pickup locations received:', companyLocations.length, companyLocations);
  }
  
  const showLocationDropdown = companyLocations.length > 1;
  const [selectedLocationId, setSelectedLocationId] = useState('');

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(SEARCH_FILTERS_STORAGE_KEY);
      
      // Calculate default dates (today and one week later)
      const today = new Date();
      const oneWeekLater = new Date(today);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      const defaultStartDate = today.toISOString().split('T')[0];
      const defaultEndDate = oneWeekLater.toISOString().split('T')[0];
      
      if (!savedRaw) {
        // No saved filters - set default dates
        setStartDate(defaultStartDate);
        setEndDate(defaultEndDate);
        filtersLoadedRef.current = true;
        return;
      }
      
      const parsed = JSON.parse(savedRaw);
      const { sanitized, changed } = sanitizeFilterDates(parsed);

      if (changed) {
        if (Object.keys(sanitized).length === 0) {
          localStorage.removeItem(SEARCH_FILTERS_STORAGE_KEY);
        } else {
          localStorage.setItem(SEARCH_FILTERS_STORAGE_KEY, JSON.stringify(sanitized));
        }
      }

      // Use saved filters if available, otherwise use defaults
      setStartDate(sanitized.startDate || defaultStartDate);
      setEndDate(sanitized.endDate || defaultEndDate);
      if (sanitized.category) setCategory(sanitized.category);
      if (sanitized.locationId) setSelectedLocationId(sanitized.locationId);
    } catch (error) {
      console.warn('[Home] Failed to load saved search filters:', error);
      // On error, set default dates
      const today = new Date();
      const oneWeekLater = new Date(today);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(oneWeekLater.toISOString().split('T')[0]);
    } finally {
      filtersLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!filtersLoadedRef.current) return;
    try {
      const payload = {
        startDate: startDate || '',
        endDate: endDate || '',
        category: category || '',
        locationId: selectedLocationId || '',
      };
      localStorage.setItem(SEARCH_FILTERS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('[Home] Failed to persist search filters:', error);
    }
  }, [startDate, endDate, category, selectedLocationId]);
  
  // Fetch models grouped by category - filtered by company from domain
  const { data: modelsGroupedResponse, isLoading: modelsLoading, error: modelsError } = useQuery(
    ['modelsGroupedByCategory', effectiveCompanyId],
    () => apiService.getModelsGroupedByCategory(effectiveCompanyId || null),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: true // Always fetch, but filter by company if available
    }
  );

  // Filter models by active filters
  const modelsGrouped = useMemo(() => {
    // Handle loading state - don't warn if data is still loading
    if (!modelsGroupedResponse) {
      return [];
    }
    
    // Handle different response structures
    let allModels = modelsGroupedResponse;
    
    // If response has a data property
    if (allModels?.data) {
      allModels = allModels.data;
    }
    
    // If still wrapped in result property (standardized API response)
    if (allModels?.result) {
      allModels = allModels.result;
    }
    
    // Ensure it's an array
    if (!Array.isArray(allModels)) {
      // Only warn in development and if we actually have data (not just loading)
      if (process.env.NODE_ENV === 'development' && allModels !== undefined && allModels !== null) {
        console.warn('modelsGrouped is not an array:', allModels);
      }
      return [];
    }
    
    // No filtering - show all models
    // Date availability checking removed - all vehicles are available
    return allModels;
  }, [modelsGroupedResponse]);

  const filteredModelsGrouped = useMemo(() => {
    if (!Array.isArray(modelsGrouped)) return [];

    return modelsGrouped.filter((categoryGroup = {}) => {
      const rawName =
        categoryGroup.categoryName ||
        categoryGroup.category_name ||
        categoryGroup.CategoryName ||
        '';

      const normalizedName = rawName.toString().toLowerCase();
      const slug = normalizedName.replace(/\s+/g, '-');

      const matchesCategory =
        !category ||
        normalizedName.includes(category.toLowerCase()) ||
        slug === category.toLowerCase();

      return matchesCategory;
    });
  }, [modelsGrouped, category]);
  
  // Calculate total vehicle count and available count from models
  const { fleetCount, availableCount } = useMemo(() => {
    let totalVehicles = 0;
    let totalAvailable = 0;
    
    if (modelsGrouped && Array.isArray(modelsGrouped)) {
      modelsGrouped.forEach((categoryGroup) => {
        if (categoryGroup.models && Array.isArray(categoryGroup.models)) {
          categoryGroup.models.forEach((model) => {
            const vCount = model.vehicleCount || model.VehicleCount || 0;
            const aCount = model.availableCount || model.AvailableCount || 0;
            totalVehicles += vCount;
            totalAvailable += aCount;
          });
        }
      });
    }
    
    return { fleetCount: totalVehicles, availableCount: totalAvailable };
  }, [modelsGrouped]);

  const availableVehicles = useMemo(() => {
    if (!Array.isArray(modelsGrouped)) return [];

    const deduped = new Map();

    modelsGrouped.forEach((categoryGroup) => {
      const categoryName =
        categoryGroup?.categoryName ||
        categoryGroup?.CategoryName ||
        categoryGroup?.category ||
        '';
      const categoryId =
        categoryGroup?.categoryId ||
        categoryGroup?.category_id ||
        categoryGroup?.id ||
        null;

      (categoryGroup?.models || []).forEach((model) => {
        const modelMake = model.make || model.Make || '';
        const modelName = model.modelName || model.model_name || model.ModelName || '';
        const modelFeatures = Array.isArray(model.features)
          ? model.features
          : Array.isArray(model.Features)
          ? model.Features
          : [];
        const modelYears = Array.isArray(model.years) ? model.years : [];

        const pushVehicle = (vehicleSource = {}, fallbackIdSuffix = '') => {
          const vehicleId =
            vehicleSource.vehicle_id ||
            vehicleSource.vehicleId ||
            vehicleSource.id ||
            vehicleSource.Id ||
            vehicleSource.VehicleId ||
            vehicleSource.VehicleID ||
            model.id ||
            model.model_id ||
            `${modelMake}-${modelName}-${fallbackIdSuffix}`;

          if (deduped.has(vehicleId)) {
            return;
          }

          const normalized = {
            id: vehicleId,
            vehicle_id: vehicleId,
            make: vehicleSource.make || vehicleSource.Make || modelMake,
            model: vehicleSource.model || vehicleSource.Model || modelName,
            year:
              vehicleSource.year ||
              vehicleSource.Year ||
              model.year ||
              model.Year ||
              model.modelYear ||
              (modelYears.length > 0 ? modelYears[0] : undefined),
            daily_rate:
              vehicleSource.daily_rate ||
              vehicleSource.dailyRate ||
              model.dailyRate ||
              model.daily_rate ||
              null,
            seats: vehicleSource.seats || vehicleSource.Seats || model.seats || model.Seats || null,
            type: vehicleSource.type || vehicleSource.Type || model.type || categoryName || '',
            categoryId: categoryId || vehicleSource.categoryId || vehicleSource.category_id || model.categoryId || model.category_id || null,
            transmission:
              vehicleSource.transmission ||
              vehicleSource.Transmission ||
              model.transmission ||
              model.Transmission ||
              '',
            fuel_type:
              vehicleSource.fuel_type ||
              vehicleSource.fuelType ||
              vehicleSource.FuelType ||
              model.fuelType ||
              model.FuelType ||
              '',
            features: Array.isArray(vehicleSource.features)
              ? vehicleSource.features
              : modelFeatures,
          };

          normalized.dailyRate = normalized.daily_rate;

          deduped.set(vehicleId, normalized);
        };

        const vehiclesArray =
          (model.vehicles || model.Vehicles || model.vehiclesByCategory || []) || [];

        if (Array.isArray(vehiclesArray) && vehiclesArray.length > 0) {
          vehiclesArray.forEach((vehicle, index) => pushVehicle(vehicle, index));
        } else {
          pushVehicle({}, 'model');
        }
      });
    });

    return Array.from(deduped.values());
  }, [modelsGrouped]);

  const vehicles = availableVehicles;

  const handleSelectVehicle = useCallback(
    (vehicle) => {
      if (!vehicle) return;
      
      // Build URL parameters
      const params = new URLSearchParams();
      
      // Add category
      const categoryId = vehicle.categoryId || vehicle.category_id;
      if (categoryId) {
        params.set('category', categoryId);
      }
      
      // Add make and model
      const make = vehicle.make || vehicle.Make || '';
      const model = vehicle.model || vehicle.Model || '';
      if (make) params.set('make', make);
      if (model) params.set('model', model);
      
      // Add companyId
      const companyId = companyConfig?.id;
      if (companyId) {
        params.set('companyId', companyId);
      }
      
      // Add dates if they are selected
      if (startDate) {
        params.set('startDate', startDate);
      }
      if (endDate) {
        params.set('endDate', endDate);
      }
      
      // Navigate to book page with all parameters
      navigate(`/book?${params.toString()}`);
    },
    [navigate, companyConfig?.id, startDate, endDate]
  );

  const companySections = useMemo(() => {
    const rawTexts = companyConfig?.texts;

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
          console.warn('[Home] Unable to parse company texts JSON:', err);
          return [];
        }
      }

      return [];
    };

    return normalizeSections(rawTexts);
  }, [companyConfig]);

  const heroSection = useMemo(() => {
    const fallback = {
      title: 'Meet our newest fleet yet',
      description: "New rental cars. No lines. Let's go!",
      video: (companyConfig?.videoLink || companyConfig?.video || companyConfig?.videoURL || '')
        ?.toString()
        ?.trim()
    };

    const firstSection = companySections[0];
    if (!firstSection) {
      return fallback;
    }

    const videoUrl =
        (companyConfig?.videoLink || companyConfig?.video || companyConfig?.videoURL || '')
        ?.toString()
        ?.trim();

    if (videoUrl) {
      return {
        title: '',
        description: '',
        video: videoUrl
      };
    }

    const heroTitle = translate(firstSection.title, fallback.title);
    const heroDescription = translate(firstSection.description, fallback.description);

    return {
      title: heroTitle || fallback.title,
      description: heroDescription || fallback.description,
      video: fallback.video
    };
  }, [companySections, translate, companyConfig?.videoLink, companyConfig?.video, companyConfig?.videoURL]);

  const sectionNotes = useMemo(() => {
    const firstSection = companySections[0];
    const videoUrl =
      (companyConfig?.videoLink || companyConfig?.video || companyConfig?.videoURL || '')
        ?.toString()
        ?.trim();

    if (videoUrl) {
      return { notes: [], layout: 'horizontal' };
    }

    if (!firstSection?.notes?.length) {
      return { notes: [], layout: 'vertical' };
    }

    const notes =
      firstSection.notes?.map((note) => {
        const title = translate(note.title) || '';
        const caption = translate(note.caption) || '';
        const description = translate(note.text) || '';

        const svg =
          typeof note.symbol === 'string' && note.symbol.trim().startsWith('<')
            ? note.symbol
            : null;

        return {
          title,
          caption,
          description,
          svg,
          icon: null,
          foreColor: note.symbolForeColor || '#FACC15',
          backColor: note.backColor || 'rgba(255,255,255,0.08)'
        };
      }) || [];

    return {
      notes,
      layout: (firstSection.notesLayout || 'vertical').toLowerCase()
    };
  }, [
    companySections,
    translate,
    companyConfig?.videoLink,
    companyConfig?.video,
    companyConfig?.videoURL
  ]);

  const { sectionsAfterModels, sectionsStartIndex } = useMemo(() => {
    if (!Array.isArray(companySections) || companySections.length === 0) {
      return { sectionsAfterModels: [], sectionsStartIndex: 0 };
    }

    const rawVideo =
      (companyConfig?.videoLink || companyConfig?.video || companyConfig?.videoURL || '')
        ?.toString()
        ?.trim();

    const startIndex = rawVideo ? 0 : 1;

    return {
      sectionsAfterModels: companySections.slice(startIndex),
      sectionsStartIndex: startIndex
    };
  }, [companySections, companyConfig?.videoLink, companyConfig?.video, companyConfig?.videoURL]);
  
  // Update company name - show "Unknown" if no company
  useEffect(() => {
    if (companyConfig?.companyName) {
      setCompanyName(companyConfig.companyName);
    } else {
      setCompanyName('Unknown');
    }
  }, [companyConfig]);

  const bannerLink = companyConfig?.bannerLink || companyConfig?.BannerLink;

  return (
    <>
      {/* Hero Section with Booking Form and Video - With banner if exists, otherwise original style */}
      <section 
        className="relative min-h-[400px] bg-black w-full"
        style={bannerLink ? {
          backgroundImage: `url(${bannerLink})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      >
        {/* Dark overlay for better content readability when banner exists */}
        {bannerLink && (
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        )}
        
        {/* Fallback gradient overlay when no banner - original style */}
        {!bannerLink && (
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(135deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 152, 0, 0.2) 50%, transparent 100%)'
            }}></div>
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Booking Form - Left Side */}
            <div className="bg-white rounded-lg shadow-2xl p-6 lg:p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {t('home.bookYourCar')}
              </h2>

              {/* Start and End Dates */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.startDate')}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.endDate')}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Car Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('home.carCategory')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">{t('home.selectCategory')}</option>
                  <option value="economy">{t('categories.economy')}</option>
                  <option value="compact">{t('categories.compact')}</option>
                  <option value="mid-size">{t('categories.mid-size')}</option>
                  <option value="full-size">{t('categories.full-size')}</option>
                  <option value="suv">{t('categories.suv')}</option>
                  <option value="luxury">{t('categories.luxury')}</option>
                  <option value="sports">{t('categories.sports')}</option>
                </select>
              </div>

              {/* Location Dropdown - Only show if company has more than 1 location */}
              {showLocationDropdown && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.location')}
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">{t('home.selectLocation')}</option>
                    {companyLocations.map((location) => (
                      <option key={location.id || location.Id} value={location.id || location.Id}>
                        {location.locationName || location.location_name || location.LocationName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* View Vehicles Button */}
              <button
                onClick={() => {
                  // Scroll to models section
                  setTimeout(() => {
                    modelsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="w-full bg-yellow-500 text-black font-bold py-4 px-6 rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center"
              >
                {t('home.viewVehicles')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>

            {/* Promotional Content - Right Side */}
            <div className="text-white w-full">
              {heroSection.video ? (
                <div className="w-full aspect-video rounded-lg overflow-hidden shadow-2xl">
                  <video
                    className="w-full h-full object-cover"
                    src={heroSection.video}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    <source src={heroSection.video} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <>
                  <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
                    {heroSection.title}
                  </h1>
                  <p className="text-2xl mb-8 text-gray-200">
                    {heroSection.description}
                  </p>
                </>
              )}

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {sectionNotes.notes.map((feature, index) => (
                  <div key={index} className="flex flex-col items-start">
                    <div className="mb-2">
                      {feature.svg ? (
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: feature.backColor || 'rgba(255,255,255,0.08)',
                            color: feature.foreColor || '#FACC15'
                          }}
                        >
                          <span
                            className="h-6 w-6"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{ __html: feature.svg }}
                          />
                        </div>
                      ) : feature.icon ? (
                        feature.icon
                      ) : (
                        <Car className="h-8 w-8 text-yellow-400" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                    <p className="text-gray-300 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available Models by Category Section */}
      <section ref={modelsSectionRef} className="py-20 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {t('home.availableModelsTitle')}
              </h2>
              {effectiveCompanyId && fleetCount > 0 && (
                <span className="text-lg font-normal text-gray-600 bg-gray-100 px-4 py-1 rounded-full">
                  {fleetCount} / {availableCount}
                </span>
              )}
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('home.availableModelsSubtitle')}
            </p>
          </div>

          {modelsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              <p className="mt-4 text-gray-600">{t('home.loadingModels')}</p>
            </div>
          ) : modelsError ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{t('home.errorLoadingModels')}: {modelsError.message}</p>
              <p className="text-gray-600 text-sm">{t('home.checkConsole')}</p>
            </div>
          ) : !Array.isArray(modelsGrouped) || modelsGrouped.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">{t('home.noModelsAvailable')}</p>
              <p className="text-gray-500 text-sm">Response: {JSON.stringify(modelsGroupedResponse?.slice?.(0, 200) || modelsGroupedResponse)}</p>
            </div>
          ) : filteredModelsGrouped.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-2">
                {t('home.noModelsMatchFilters', 'No vehicles match your filters. Try another category.')}
              </p>
              <button
                type="button"
                onClick={() => setCategory('')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                {t('home.resetFilters', 'Reset filters')}
              </button>
            </div>
          ) : (
              <div className="space-y-16">
                {filteredModelsGrouped.map((categoryGroup) => {
                  const categoryName = categoryGroup.categoryName || categoryGroup.category_name || '';
                  const categoryId = categoryGroup.categoryId || categoryGroup.category_id;
                  
                  // Determine default image based on category
                  const getDefaultImage = (category) => {
                    const cat = (category || '').toLowerCase();
                    if (cat.includes('suv')) return '/SUV.png';
                    if (cat.includes('luxury') || cat.includes('premium')) return '/luxury.jpg';
                    if (cat.includes('sedan') || cat.includes('mid-size') || cat.includes('full-size')) return '/sedan.jpg';
                    if (cat.includes('compact')) return '/compact.jpg';
                    if (cat.includes('van')) return '/compact.jpg';
                    return '/economy.jpg'; // default fallback
                  };
                  
                  const defaultImage = getDefaultImage(categoryName);
                  
                  return (
                    <div key={categoryId} className="space-y-6">
                      {/* Category Header */}
                      <div className="text-center">
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                          {t(`categories.${(categoryName || '').toLowerCase().replace(/\s+/g, '-')}`) || categoryName}
                        </h3>
                      </div>

                      {/* Group models by make and modelName */}
                      {(() => {
                        const models = categoryGroup.models || [];
                        const grouped = models.reduce((acc, model) => {
                          const make = (model.make || '').toUpperCase();
                          const modelName = (model.modelName || model.model_name || '').toUpperCase();
                          const key = `${make}_${modelName}`;
                          
                          if (!acc[key]) {
                            acc[key] = {
                              make,
                              modelName,
                              years: [],
                              seats: model.seats || 0,
                              fuelType: model.fuelType || model.fuel_type || '',
                              transmission: model.transmission || '',
                              dailyRate: model.dailyRate || model.daily_rate || null,
                              features: model.features || [],
                              vehicleCount: 0,
                              availableCount: 0,
                              ids: []
                            };
                          }
                          
                          const year = model.year || 0;
                          if (year && !acc[key].years.includes(year)) {
                            acc[key].years.push(year);
                          }
                          
                          // Take the highest daily rate if multiple exist
                          const modelRate = model.dailyRate || model.daily_rate;
                          if (modelRate && (!acc[key].dailyRate || modelRate > acc[key].dailyRate)) {
                            acc[key].dailyRate = modelRate;
                          }
                          
                          // Combine features
                          if (model.features && Array.isArray(model.features)) {
                            acc[key].features = [...new Set([...acc[key].features, ...model.features])];
                          }
                          
                          // Sum up vehicle counts and available counts
                          acc[key].vehicleCount += model.vehicleCount || 0;
                          acc[key].availableCount += model.availableCount || 0;
                          
                          acc[key].ids.push(model.id || model.model_id);
                          
                          return acc;
                        }, {});
                        
                        const groupedModels = Object.values(grouped)
                          .map(group => ({
                            ...group,
                            years: group.years.sort((a, b) => b - a) // Sort years descending
                          }));
                        
                        return (
                          <div className="overflow-x-auto pb-4 -mx-4 px-4 model-cards-scroll">
                            <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
                              {groupedModels.map((group, index) => {
                              const yearsDisplay = group.years.length > 0 
                                ? group.years.length === 1
                                  ? group.years[0].toString()
                                  : `${Math.min(...group.years)}-${Math.max(...group.years)}`
                                : '';
                              
                              // Construct model image path: use direct /models/ path (served by Create React App from public/)
                              const makeUpper = (group.make || '').toUpperCase();
                              const modelUpper = (group.modelName || '').toUpperCase().replace(/\s+/g, '_');
                              // Use /models/ path - served statically by Express in both dev and production
                              const modelImagePath = `/models/${makeUpper}_${modelUpper}.png`;
                              
                              const bookingParams = new URLSearchParams();
                              if (categoryId) bookingParams.set('category', categoryId);
                              if (group.make) bookingParams.set('make', group.make);
                              if (group.modelName) bookingParams.set('model', group.modelName);
                              if (effectiveCompanyId) bookingParams.set('companyId', effectiveCompanyId);
                              if (startDate) bookingParams.set('startDate', startDate);
                              if (endDate) bookingParams.set('endDate', endDate);
                              if (category) bookingParams.set('searchCategory', category);
                              if (selectedLocationId) bookingParams.set('locationId', selectedLocationId);
                              const bookingUrl = effectiveCompanyId ? `/book?${bookingParams.toString()}` : '#';

                              return (
                                <div key={`${group.make}_${group.modelName}_${index}`} className="vehicle-card flex-shrink-0" style={{ width: '320px', minWidth: '320px' }}>
                                  <div className="relative">
                                    <img
                                      src={modelImagePath}
                                      alt={`${group.make} ${group.modelName}`}
                                      className="vehicle-image"
                                      onError={(e) => {
                                        // Fallback to category default image if model-specific image doesn't exist
                                        // Only change if it's not already the default to prevent infinite loops
                                        if (e.target.src !== window.location.origin + defaultImage) {
                                          e.target.src = defaultImage;
                                        }
                                      }}
                                      onLoad={(e) => {
                                        // If image fails to load, the onError will handle it
                                        // This ensures the image loads correctly
                                      }}
                                    />
                                    {group.dailyRate && (
                                      <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold">
                                        {formatPrice(group.dailyRate)}/{t('vehicles.day') || 'day'}
                                      </div>
                                    )}
                                    {effectiveCompanyId && group.vehicleCount > 0 && (
                                      <div className="absolute bottom-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                        {group.availableCount}/{group.vehicleCount} {t('status.available')}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="vehicle-info">
                                    <h3 className="vehicle-title">
                                      {group.make} {group.modelName}
                                    </h3>
                                    {yearsDisplay && (
                                      <p className="text-sm text-gray-600 mb-2">
                                        {t('vehicles.years') || 'Years'}: {yearsDisplay}
                                      </p>
                                    )}
                                    
                                    <div className="vehicle-details space-y-2">
                                      {group.seats > 0 && (
                                        <div className="flex items-center text-gray-600">
                                          <Users className="h-4 w-4 mr-2" />
                                          <span>{group.seats} {t('vehicles.seats') || 'seats'}</span>
                                        </div>
                                      )}
                                      
                                      {group.fuelType && (
                                        <div className="flex items-center text-gray-600">
                                          <Fuel className="h-4 w-4 mr-2" />
                                          <span>{t(`fuelTypes.${(group.fuelType || '').toString().toLowerCase()}`) || group.fuelType}</span>
                                        </div>
                                      )}
                                      
                                      {group.transmission && (
                                        <div className="flex items-center text-gray-600">
                                          <Settings className="h-4 w-4 mr-2" />
                                          <span>{t(`transmission.${(group.transmission || '').toString().toLowerCase()}`) || group.transmission}</span>
                                        </div>
                                      )}
                                    </div>

                                    {group.features && group.features.length > 0 && (
                                      <div className="vehicle-features mt-2">
                                        {group.features.slice(0, 3).map((feature, idx) => (
                                          <span key={idx} className="feature-tag">
                                            {feature}
                                          </span>
                                        ))}
                                        {group.features.length > 3 && (
                                          <span className="feature-tag">
                                            +{group.features.length - 3} {t('vehicles.more') || 'more'}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex justify-between items-center mt-4">
                                      {group.dailyRate && (
                                        <div className="vehicle-price">
                                          {formatPrice(group.dailyRate)}
                                          <span className="text-sm text-gray-600">/{t('vehicles.day') || 'day'}</span>
                                        </div>
                                      )}
                                      <Link
                                        to={bookingUrl}
                                        className={`btn-primary text-sm ${!effectiveCompanyId ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                        onClick={(e) => {
                                          if (!effectiveCompanyId) {
                                            e.preventDefault();
                                            alert('Booking is not available. Please access via a company subdomain.');
                                          }
                                        }}
                                      >
                                        {t('vehicles.book') || 'Book'}
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const models = categoryGroup.models || [];
                        const grouped = models.reduce((acc, model) => {
                          const make = (model.make || '').toUpperCase();
                          const modelName = (model.modelName || model.model_name || '').toUpperCase();
                          const key = `${make}_${modelName}`;
                          if (!acc[key]) {
                            acc[key] = { make, modelName };
                          }
                          return acc;
                        }, {});
                        
                        // Count unique models
                        const uniqueModels = Object.values(grouped);
                        const uniqueModelsCount = uniqueModels.length;
                        
                        return uniqueModelsCount > 6 && (
                          <div className="text-center pt-4">
                            <Link
                              to={`/?category=${categoryId}`}
                              className="text-yellow-500 hover:text-yellow-600 font-semibold inline-flex items-center text-lg"
                            >
                              {t('home.viewAllModels', { 
                                count: uniqueModelsCount, 
                                category: t(`categories.${(categoryName || '').toLowerCase().replace(/\s+/g, '-')}`) || categoryName 
                              })}
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
          )}
        </div>
      </section>

      {/* Company Sections - Page Wide */}
      {sectionsAfterModels.length > 0 && (
        <div className="space-y-0">
          {sectionsAfterModels.map((section, index) => {
            const sectionNumber = sectionsStartIndex + index + 1;
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
              : { backgroundColor: '#ffffff' };
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
              ...cardStyle,
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
                key={`company-section-${sectionNumber}`}
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
                                key={`section-${sectionNumber}-note-${noteIndex}`}
                                className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-lg"
                                style={{ backgroundColor: noteBackground }}
                              >
                                <div className="flex-shrink-0 flex flex-col items-start gap-3 min-w-[56px]">
                                  {notePicture && (
                                    <img
                                      src={notePicture}
                                      alt={noteTitle || `Section ${sectionNumber} note ${noteIndex + 1}`}
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
                              key={`section-${sectionNumber}-note-${noteIndex}`}
                              className="rounded-lg p-6"
                              style={{ backgroundColor: noteBackground }}
                            >
                              {notePicture && (
                                <img
                                  src={notePicture}
                                  alt={noteTitle || `Section ${sectionNumber} note ${noteIndex + 1}`}
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
      )}

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('home.ctaTitle')}
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {t('home.ctaSubtitle', { companyName })}
          </p>
          <Link
            to="/"
            className="bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-yellow-400 transition-colors inline-flex items-center"
          >
            {t('home.browseFleet')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {vehicles.length > 0 && (
        <AICarAssistant
          onSelectVehicle={handleSelectVehicle}
          availableVehicles={vehicles}
        />
      )}
    </>
  );
};

export default Home;
