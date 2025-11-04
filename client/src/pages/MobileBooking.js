import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { toast } from 'react-toastify';

const MobileBooking = () => {
  const { companyConfig } = useCompany();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const vehicleId = searchParams.get('vehicleId');
  const pickupDate = searchParams.get('pickupDate');
  const returnDate = searchParams.get('returnDate');
  // Use company from domain context only
  const companyId = companyConfig?.id || null;

  const { data } = useQuery(['m-vehicle', vehicleId], () => apiService.getVehicle(vehicleId), { enabled: !!vehicleId });
  const vehicle = useMemo(()=> (data?.data || data || null), [data]);

  const createMutation = useMutation((payload) => apiService.createReservation(payload));

  const confirm = async () => {
    // Prohibit booking if no company
    if (!companyId) {
      toast.error('Booking is not available. Please access via a company subdomain.');
      navigate('/');
      return;
    }
    
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: `/m/booking?${searchParams.toString()}` } });
      return;
    }
    try {
      await createMutation.mutateAsync({
        vehicleId,
        companyId,
        customerId: user?.id || user?.customer_id || user?.customerId,
        pickupDate,
        returnDate,
        pickupLocation: vehicle?.location || '',
        returnLocation: vehicle?.location || '',
        dailyRate: vehicle?.daily_rate || vehicle?.dailyRate || 0,
        taxAmount: 0,
        insuranceAmount: 0,
        additionalFees: 0,
        additionalNotes: ''
      });
      toast.success('Booking created');
      navigate('/m/my-bookings');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  if (!vehicle) return (
    <div className="min-h-screen bg-gray-50 p-4">
      <p>Loading...</p>
    </div>
  );

  const title = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
  const makeUpper = (vehicle.make || '').toUpperCase();
  const modelUpper = (vehicle.model || '').toUpperCase().replace(/\s+/g, '_');
  const img = `/models/${makeUpper}_${modelUpper}.png`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Confirm Booking</h1>
      <div className="bg-white rounded-md shadow p-3 mb-3 flex items-center">
        <img src={img} alt={title} className="w-20 h-14 object-cover rounded mr-3"
             onError={(e)=>{ if (!e.target.src.includes('/economy.jpg')) e.target.src='/economy.jpg'; }} />
        <div className="text-left">
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
          <div className="text-gray-600 text-xs">${(vehicle.daily_rate || vehicle.dailyRate || 0)} per day</div>
        </div>
      </div>
      <div className="bg-white rounded-md shadow p-3 mb-6 text-sm">
        <div className="flex justify-between mb-1"><span className="text-gray-600">Pickup</span><span>{pickupDate}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Return</span><span>{returnDate}</span></div>
      </div>
      <button onClick={confirm} className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold mb-2">Book</button>
      <button onClick={()=>navigate('/m/vehicles')} className="w-full bg-gray-200 text-gray-800 py-3 rounded-md font-semibold">Back</button>
    </div>
  );
};

export default MobileBooking;


