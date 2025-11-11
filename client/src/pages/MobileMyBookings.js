import React from 'react';
import { useQuery, useMutation } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const MobileMyBookings = () => {
  const { companyConfig } = useCompany();
  const { isAuthenticated } = useAuth();
  const companyId = companyConfig?.id || null;
  const { data, refetch } = useQuery(
    ['m-my-bookings', companyId], 
    () => apiService.getBookings({ companyId, pageSize: 100 }), 
    { enabled: isAuthenticated && !!companyId }
  );
  const cancelMutation = useMutation((id) => apiService.cancelBooking(id));

  const items = Array.isArray(data?.data?.items)
    ? data.data.items
    : (Array.isArray(data?.data)
        ? data.data
        : (Array.isArray(data?.bookings)
            ? data.bookings
            : (Array.isArray(data) ? data : [])));

  const cancel = async (id) => {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Cancelled');
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">My Bookings</h1>
      <div className="space-y-3">
        {items.map(b => (
          <div key={b.id || b.reservation_id} className="bg-white rounded-md shadow p-3 text-sm">
            <div className="font-semibold text-gray-900">#{b.reservation_number || b.id}</div>
            <div className="text-gray-600">{b.vehicle?.year} {b.vehicle?.make} {b.vehicle?.model}</div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-600">{b.pickup_date || b.pickupDate}</span>
              <span className="text-gray-600">{b.return_date || b.returnDate}</span>
            </div>
            <button onClick={()=>cancel(b.id || b.reservation_id)} className="mt-3 w-full bg-red-600 text-white py-2 rounded-md font-semibold">Cancel</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileMyBookings;


