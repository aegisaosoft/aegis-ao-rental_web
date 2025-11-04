import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useCompany } from '../context/CompanyContext';

const MobileVehicles = () => {
  const { companyConfig } = useCompany();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pickupDate = searchParams.get('pickupDate') || '';
  const returnDate = searchParams.get('returnDate') || '';
  // Use company from domain context only
  const companyId = companyConfig?.id || null;

  const { data, isLoading } = useQuery(
    ['m-vehicles', companyId, pickupDate, returnDate],
    () => {
      const params = { 
        companyId, 
        status: 'Available', 
        pageSize: 50 // Reduced from 1000 - only load first page
      };
      
      // Add date filters if provided
      if (pickupDate) params.availableFrom = pickupDate;
      if (returnDate) params.availableTo = returnDate;
      
      return apiService.getVehicles(params);
    },
    { enabled: !!companyId }
  );

  const items = Array.isArray(data?.data?.items) ? data.data.items : (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));

  const select = (vehicleId) => {
    const params = new URLSearchParams();
    params.set('vehicleId', vehicleId);
    params.set('pickupDate', pickupDate);
    params.set('returnDate', returnDate);
    if (companyId) params.set('companyId', companyId);
    navigate(`/m/booking?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Choose Vehicle</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-3">
          {items.map(v => {
            const id = v.vehicle_id || v.vehicleId || v.id;
            const title = `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim();
            const makeUpper = (v.make || '').toUpperCase();
            const modelUpper = (v.model || '').toUpperCase().replace(/\s+/g, '_');
            const img = `/models/${makeUpper}_${modelUpper}.png`;
            return (
              <button key={id} onClick={() => select(id)} className="w-full bg-white rounded-md shadow p-3 flex items-center">
                <img src={img} alt={title} className="w-20 h-14 object-cover rounded mr-3"
                     onError={(e)=>{ if (!e.target.src.includes('/economy.jpg')) e.target.src='/economy.jpg'; }} />
                <div className="text-left">
                  <div className="font-semibold text-gray-900 text-sm">{title}</div>
                  <div className="text-gray-600 text-xs">${(v.daily_rate || v.dailyRate || 0)} per day</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileVehicles;


