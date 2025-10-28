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

// Debug JWT Token - Check if admin role is being set correctly

// Run this in browser console after logging in
const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (token) {
    // Decode JWT token (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    console.log('Role:', payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
    console.log('Customer ID:', payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier']);
    console.log('Company ID:', payload.company_id);
    
    // Check all claims
    console.log('All claims:', payload);
} else {
    console.log('No token found');
}
