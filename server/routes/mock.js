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

const express = require('express');
const router = express.Router();

// Mock data for development
const mockVehicles = [
  {
    vehicle_id: '1',
    make: 'Toyota',
    model: 'Camry',
    year: 2023,
    color: 'Silver',
    license_plate: 'ABC123',
    mileage: 15000,
    fuel_type: 'Gasoline',
    transmission: 'Automatic',
    seats: 5,
    daily_rate: 45.00,
    status: 'available',
    location: 'Downtown Branch',
    image_url: 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=400',
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Air Conditioning'],
    category_name: 'Mid-Size',
    company_name: 'Aegis-AO Rentals'
  },
  {
    vehicle_id: '2',
    make: 'Honda',
    model: 'Civic',
    year: 2023,
    color: 'Blue',
    license_plate: 'DEF456',
    mileage: 12000,
    fuel_type: 'Gasoline',
    transmission: 'Automatic',
    seats: 5,
    daily_rate: 35.00,
    status: 'available',
    location: 'Airport Branch',
    image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
    features: ['GPS', 'Bluetooth', 'Air Conditioning'],
    category_name: 'Compact',
    company_name: 'Aegis-AO Rentals'
  },
  {
    vehicle_id: '3',
    make: 'BMW',
    model: 'X5',
    year: 2023,
    color: 'Black',
    license_plate: 'GHI789',
    mileage: 8000,
    fuel_type: 'Gasoline',
    transmission: 'Automatic',
    seats: 7,
    daily_rate: 120.00,
    status: 'available',
    location: 'Downtown Branch',
    image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400',
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Air Conditioning', 'Leather Seats', 'Sunroof'],
    category_name: 'Luxury SUV',
    company_name: 'Aegis-AO Rentals'
  }
];

const mockCategories = [
  { category_id: '1', category_name: 'Economy', description: 'Budget-friendly vehicles' },
  { category_id: '2', category_name: 'Compact', description: 'Small, efficient cars' },
  { category_id: '3', category_name: 'Mid-Size', description: 'Comfortable sedans' },
  { category_id: '4', category_name: 'Luxury SUV', description: 'Premium SUVs' }
];

// Mock authentication
router.post('/auth/register', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  
  // Generate mock JWT token
  const token = 'mock_jwt_token_' + Date.now();
  
  res.json({
    message: 'User registered successfully',
    token,
    user: {
      customerId: 'mock_customer_' + Date.now(),
      email,
      firstName,
      lastName,
      isVerified: false
    }
  });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Generate mock JWT token
  const token = 'mock_jwt_token_' + Date.now();
  
  res.json({
    message: 'Login successful',
    token,
    user: {
      customerId: 'mock_customer_123',
      email,
      firstName: 'John',
      lastName: 'Doe',
      isVerified: true
    }
  });
});

router.get('/auth/profile', (req, res) => {
  res.json({
    customerId: 'mock_customer_123',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    dateOfBirth: '1990-01-01',
    driversLicense: {
      number: 'DL123456789',
      state: 'CA',
      expiry: '2025-12-31'
    },
    address: {
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: '94102'
    },
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z'
  });
});

// Mock vehicles
router.get('/vehicles', (req, res) => {
  const { category, make, minPrice, maxPrice, location } = req.query;
  
  let filteredVehicles = [...mockVehicles];
  
  if (category) {
    filteredVehicles = filteredVehicles.filter(v => 
      v.category_name?.toLowerCase().includes(category.toLowerCase())
    );
  }
  
  if (make) {
    filteredVehicles = filteredVehicles.filter(v => 
      v.make.toLowerCase().includes(make.toLowerCase())
    );
  }
  
  if (minPrice) {
    filteredVehicles = filteredVehicles.filter(v => v.daily_rate >= parseFloat(minPrice));
  }
  
  if (maxPrice) {
    filteredVehicles = filteredVehicles.filter(v => v.daily_rate <= parseFloat(maxPrice));
  }
  
  if (location) {
    filteredVehicles = filteredVehicles.filter(v => 
      v.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  res.json({
    vehicles: filteredVehicles,
    pagination: {
      page: 1,
      limit: 20,
      total: filteredVehicles.length,
      pages: 1
    }
  });
});

router.get('/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const vehicle = mockVehicles.find(v => v.vehicle_id === id);
  
  if (!vehicle) {
    return res.status(404).json({ message: 'Vehicle not found' });
  }
  
  res.json(vehicle);
});

router.get('/vehicles/categories/list', (req, res) => {
  res.json(mockCategories);
});

router.get('/vehicles/makes/list', (req, res) => {
  const makes = [...new Set(mockVehicles.map(v => v.make))];
  res.json(makes);
});

router.get('/vehicles/locations/list', (req, res) => {
  const locations = [...new Set(mockVehicles.map(v => v.location))];
  res.json(locations);
});

// Mock reservations
router.get('/reservations', (req, res) => {
  res.json([]);
});

router.post('/reservations', (req, res) => {
  const reservation = {
    reservation_id: 'res_' + Date.now(),
    reservation_number: 'RES' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    ...req.body,
    status: 'confirmed',
    total_amount: 150.00,
    created_at: new Date().toISOString()
  };
  
  res.status(201).json(reservation);
});

module.exports = router;

