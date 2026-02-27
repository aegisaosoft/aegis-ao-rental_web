/*
 * TerminalSection - Stripe Terminal management dashboard section
 * Slim orchestrator: tab navigation + routing to sub-components
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { Smartphone, List, Settings, MapPin } from 'lucide-react';
import { Card } from '../../components/common';
import { useCompany } from '../../context/CompanyContext';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { ReaderStatusPanel, StatsCards } from './TerminalReaderPanel';
import PaymentHistoryList from './TerminalPaymentHistory';
import TerminalSetupPanel from './TerminalSetupPanel';

const TerminalSection = ({ currentCompanyId, isAuthenticated }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCompany();
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'history' | 'setup'
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // Fetch locations for the location selector
  const { data: locationsResponse } = useQuery(
    ['terminalLocations', currentCompanyId],
    async () => {
      const res = await apiService.getTerminalLocations(currentCompanyId);
      return res.data || res;
    },
    { enabled: isAuthenticated && !!currentCompanyId }
  );

  const locations = useMemo(() => {
    if (Array.isArray(locationsResponse)) return locationsResponse;
    return [];
  }, [locationsResponse]);

  const tabs = [
    { id: 'terminal', label: t('terminal.tabs.terminal', 'Terminal'), icon: Smartphone },
    { id: 'history', label: t('terminal.tabs.history', 'Payment History'), icon: List },
    { id: 'setup', label: t('terminal.tabs.setup', 'Setup'), icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Terminal Tab — Reader status + Stats */}
      {activeTab === 'terminal' && (
        <>
          <StatsCards
            t={t}
            currentCompanyId={currentCompanyId}
            isAuthenticated={isAuthenticated}
            formatPrice={formatPrice}
          />

          {locations.length > 0 && (
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              >
                <option value="">{t('terminal.setup.allLocations', 'All Locations')}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.displayName} — {loc.address?.city}, {loc.address?.state}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ReaderStatusPanel t={t} locationId={selectedLocationId || null} locationsCount={locations.length} />
        </>
      )}

      {/* Payment History Tab */}
      {activeTab === 'history' && (
        <Card title={t('terminal.history.title', 'Terminal Payment History')}>
          <PaymentHistoryList
            t={t}
            currentCompanyId={currentCompanyId}
            isAuthenticated={isAuthenticated}
            formatPrice={formatPrice}
          />
        </Card>
      )}

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <TerminalSetupPanel
          currentCompanyId={currentCompanyId}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
};

export default TerminalSection;
