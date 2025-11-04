import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';

const MobileHome = () => {
  const { companyConfig } = useCompany();
  const navigate = useNavigate();
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const go = () => {
    if (!pickupDate || !returnDate) return;
    const params = new URLSearchParams();
    params.set('pickupDate', pickupDate);
    params.set('returnDate', returnDate);
    // Priority: domain context > localStorage
    const companyId = companyConfig?.id || localStorage.getItem('selectedCompanyId');
    if (companyId) params.set('companyId', companyId);
    navigate(`/m/vehicles?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Mobile Booking</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date</label>
          <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={today}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
          <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} min={pickupDate || today}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <button onClick={go} disabled={!pickupDate || !returnDate}
                className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold disabled:opacity-50">Continue</button>
      </div>
    </div>
  );
};

export default MobileHome;


