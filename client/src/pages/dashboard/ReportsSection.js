/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION").
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import React from 'react';
import { Card } from '../../components/common';

const ReportsSection = ({ t }) => {
  return (
    <Card title={t('admin.viewReports')}>
      <p className="text-gray-500 text-center py-4">{t('admin.reportsComingSoon')}</p>
    </Card>
  );
};

export default ReportsSection;
