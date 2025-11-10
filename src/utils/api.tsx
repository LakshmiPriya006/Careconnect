import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from './supabase/client';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-de4eab6a`;

// Helper function to get a fresh access token
async function getFreshToken(): Promise<string | null> {
  const supabase = createClient();
  
  try {
    // Try to get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('⚠️ Error getting session:', error.message);
      return null;
    }
    
    if (!session) {
      console.log('⚠️ No session found');
      return null;
    }
    
    // Check if token is expired or about to expire (within 1 minute)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const isExpiringSoon = expiresAt ? (expiresAt - now < 60) : false;
    
    if (isExpiringSoon) {
      console.log('🔄 Token expiring soon, refreshing...');
      
      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Failed to refresh session:', refreshError.message);
        return null;
      }
      
      if (refreshedSession) {
        // Save the new token
        localStorage.setItem('access_token', refreshedSession.access_token);
        console.log('✅ Session refreshed successfully');
        return refreshedSession.access_token;
      }
    }
    
    // Session is valid and not expiring soon
    localStorage.setItem('access_token', session.access_token);
    return session.access_token;
  } catch (err) {
    console.error('❌ Exception in getFreshToken:', err);
    return null;
  }
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  // First, try to get a fresh token
  let token = await getFreshToken();
  
  // Define public endpoints that don't require authentication
  const publicEndpoints = [
    '/auth/check-admin', 
    '/auth/check-email', 
    '/auth/signup/client',
    '/auth/signup/provider',
    '/auth/signup/admin',
    '/services'
  ];
  const isPublicEndpoint = publicEndpoints.some(pub => endpoint.includes(pub));
  
  // Fallback to localStorage if session check fails
  if (!token) {
    token = localStorage.getItem('access_token');
    console.log('⚠️ No session found, falling back to localStorage token');
    
    // If still no token and this is a protected endpoint, we can't proceed
    if (!token && !isPublicEndpoint) {
      console.error('❌ No access token available for protected endpoint:', endpoint);
      console.error('💡 User needs to log in. Clearing stale state...');
      // Clear any stale data
      localStorage.removeItem('access_token');
      throw new Error('Authentication required. Please log in.');
    }
  }
  
  // Log token info for debugging (only first/last few chars for security)
  if (token && !isPublicEndpoint) {
    const tokenPreview = token.length > 20 
      ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
      : '[short token]';
    console.log(`🔑 [${endpoint}] Using token: ${tokenPreview}`);
  } else if (!token && isPublicEndpoint) {
    console.log(`🌐 [${endpoint}] Public endpoint, using anon key`);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
    });

    // Get response text first to handle both JSON and non-JSON responses
    const text = await response.text();
    
    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(text);
      } catch (e) {
        console.error(`API Error on ${endpoint} (non-JSON response):`, text);
        throw new Error(`Request failed with status ${response.status}`);
      }
      console.error(`API Error on ${endpoint}:`, error);
      
      // If unauthorized, might be a token issue
      if (response.status === 401) {
        console.error('🔐 Unauthorized error - token might be expired or invalid');
        console.error('💡 Please try logging out and logging back in');
      }
      
      throw new Error(error.error || error.message || 'Request failed');
    }

    // Parse successful response
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`Failed to parse response from ${endpoint}:`, text);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed');
  }
}

// Auth API
export const auth = {
  checkAdminExists: async () => {
    return apiRequest('/auth/check-admin', {
      method: 'GET',
    });
  },

  signUpClient: async (data: any) => {
    return apiRequest('/auth/signup/client', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  signUpProvider: async (data: any) => {
    return apiRequest('/auth/signup/provider', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  initAdmin: async (email: string, password: string, name: string) => {
    return apiRequest('/auth/init-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  checkEmail: async (email: string) => {
    return apiRequest('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

// Client API
export const client = {
  createRequest: async (data: any) => {
    return apiRequest('/requests/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getProviders: async () => {
    return apiRequest('/providers', {
      method: 'GET',
    });
  },

  getServices: async () => {
    return apiRequest('/services', {
      method: 'GET',
    });
  },

  getBookings: async () => {
    return apiRequest('/bookings/client', {
      method: 'GET',
    });
  },

  cancelRequest: async (requestId: string) => {
    return apiRequest('/requests/cancel', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    });
  },

  // Provider Verification
  submitRating: async (bookingId: number, rating: number, review: string) => {
    return apiRequest('/bookings/rate', {
      method: 'POST',
      body: JSON.stringify({ bookingId, rating, review }),
    });
  },

  // Profile Management
  getProfile: async () => {
    return apiRequest('/client/profile', {
      method: 'GET',
    });
  },

  addLocation: async (location: any) => {
    return apiRequest('/client/locations', {
      method: 'POST',
      body: JSON.stringify(location),
    });
  },

  updateLocation: async (locationId: string, location: any) => {
    return apiRequest(`/client/locations/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(location),
    });
  },

  deleteLocation: async (locationId: string) => {
    return apiRequest(`/client/locations/${locationId}`, {
      method: 'DELETE',
    });
  },

  addFamilyMember: async (member: any) => {
    return apiRequest('/client/family-members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  updateFamilyMember: async (memberId: string, member: any) => {
    return apiRequest(`/client/family-members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(member),
    });
  },

  deleteFamilyMember: async (memberId: string) => {
    return apiRequest(`/client/family-members/${memberId}`, {
      method: 'DELETE',
    });
  },

  getProviderVerification: async (providerId: string) => {
    return apiRequest(`/verification/${providerId}`, {
      method: 'GET',
    });
  },

  sendVerificationOtp: async (providerId: string, type: 'email' | 'mobile') => {
    return apiRequest('/verification/send-otp', {
      method: 'POST',
      body: JSON.stringify({ providerId, type }),
    });
  },

  verifyOtp: async (providerId: string, type: 'email' | 'mobile', otp: string) => {
    return apiRequest('/verification/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ providerId, type, otp }),
    });
  },

  submitVerificationStage: async (providerId: string, stage: string, data: any) => {
    return apiRequest('/verification/submit-stage', {
      method: 'POST',
      body: JSON.stringify({ providerId, stage, data }),
    });
  },

  updateProviderAvailability: async (available: boolean) => {
    return apiRequest('/provider/availability', {
      method: 'POST',
      body: JSON.stringify({ available }),
    });
  },

  // Service listing
  getServices: async () => {
    return apiRequest('/services', {
      method: 'GET',
    });
  },

  // Detail pages
  getClientById: async (clientId: string) => {
    return apiRequest(`/client/${clientId}`, {
      method: 'GET',
    });
  },

  getProviderById: async (providerId: string) => {
    return apiRequest(`/provider/${providerId}`, {
      method: 'GET',
    });
  },

  getAdminUserById: async (userId: string) => {
    return apiRequest(`/admin/user/${userId}`, {
      method: 'GET',
    });
  },

  // Wallet API
  getWallet: async () => {
    return apiRequest('/wallet', {
      method: 'GET',
    });
  },

  addMoney: async (amount: number, paymentMethod: string, paymentId?: string) => {
    return apiRequest('/wallet/add', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod, paymentId }),
    });
  },

  withdrawMoney: async (amount: number, bankAccount: string, accountHolder: string) => {
    return apiRequest('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, bankAccount, accountHolder }),
    });
  },

  payWithWallet: async (amount: number, bookingId: string, providerId: string, description?: string) => {
    return apiRequest('/wallet/pay', {
      method: 'POST',
      body: JSON.stringify({ amount, bookingId, providerId, description }),
    });
  },

  // Favorites Management
  getFavorites: async () => {
    return apiRequest('/client/favorites', {
      method: 'GET',
    });
  },

  addFavorite: async (providerId: string) => {
    return apiRequest('/client/favorites/add', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  },

  removeFavorite: async (providerId: string) => {
    return apiRequest('/client/favorites/remove', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  },

  sendEmergencyAlert: async () => {
    return apiRequest('/emergency/alert', {
      method: 'POST',
    });
  },

  // Location tracking
  updateLocation: async (bookingId: string, latitude: number, longitude: number) => {
    return apiRequest(`/client/location/${bookingId}`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  getBookingLocation: async (bookingId: string) => {
    return apiRequest(`/booking/${bookingId}/provider-location`, {
      method: 'GET',
    });
  },
};

// Provider API
export const provider = {
  getJobs: async () => {
    return apiRequest('/provider/jobs', {
      method: 'GET',
    });
  },

  getJobRequests: async () => {
    return apiRequest('/jobs/requests', {
      method: 'GET',
    });
  },

  updateLocation: async (bookingId: string, latitude: number, longitude: number) => {
    return apiRequest(`/provider/location/${bookingId}`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  getBookings: async () => {
    return apiRequest('/bookings/provider', {
      method: 'GET',
    });
  },

  updateAvailability: async (available: boolean) => {
    return apiRequest('/provider/availability', {
      method: 'POST',
      body: JSON.stringify({ available }),
    });
  },

  getReviews: async () => {
    return apiRequest('/provider/reviews', {
      method: 'GET',
    });
  },

  updateJobStatus: async (jobId: string, status: string, notes?: string) => {
    return apiRequest('/jobs/update-status', {
      method: 'POST',
      body: JSON.stringify({ jobId, status, notes }),
    });
  },

  updateJobNotes: async (jobId: string, notes: string) => {
    return apiRequest('/jobs/update-notes', {
      method: 'POST',
      body: JSON.stringify({ jobId, notes }),
    });
  },

  // Wallet API (same as client)
  getWallet: async () => {
    return apiRequest('/wallet', {
      method: 'GET',
    });
  },

  withdrawMoney: async (amount: number, bankAccount: string, accountHolder: string) => {
    return apiRequest('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, bankAccount, accountHolder }),
    });
  },
};

// Admin API
export const admin = {
  getUsers: async () => {
    return apiRequest('/admin/users', {
      method: 'GET',
    });
  },

  getPendingProviders: async () => {
    return apiRequest('/admin/pending-providers', {
      method: 'GET',
    });
  },

  approveProvider: async (providerId: string) => {
    return apiRequest('/admin/approve-provider', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  },

  getBookings: async () => {
    return apiRequest('/admin/bookings', {
      method: 'GET',
    });
  },

  getStats: async () => {
    return apiRequest('/admin/stats', {
      method: 'GET',
    });
  },

  // Verification Management
  getPendingVerifications: async () => {
    return apiRequest('/admin/verifications/pending', {
      method: 'GET',
    });
  },

  reviewVerificationStage: async (providerId: string, stage: string, action: 'approve' | 'reject', notes?: string) => {
    return apiRequest('/admin/verifications/review', {
      method: 'POST',
      body: JSON.stringify({ providerId, stage, action, notes }),
    });
  },

  getProviderVerificationDetails: async (providerId: string) => {
    return apiRequest(`/admin/verifications/${providerId}`, {
      method: 'GET',
    });
  },

  // Service Management
  getServices: async () => {
    return apiRequest('/admin/services', {
      method: 'GET',
    });
  },

  createService: async (service: any) => {
    return apiRequest('/admin/services', {
      method: 'POST',
      body: JSON.stringify(service),
    });
  },

  updateService: async (serviceId: string, service: any) => {
    return apiRequest(`/admin/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(service),
    });
  },

  deleteService: async (serviceId: string) => {
    return apiRequest(`/admin/services/${serviceId}`, {
      method: 'DELETE',
    });
  },

  // User Management
  rejectProvider: async (providerId: string, reason?: string) => {
    return apiRequest('/admin/reject-provider', {
      method: 'POST',
      body: JSON.stringify({ providerId, reason }),
    });
  },

  blacklistProvider: async (providerId: string, reason?: string) => {
    return apiRequest('/admin/blacklist-provider', {
      method: 'POST',
      body: JSON.stringify({ providerId, reason }),
    });
  },

  removeBlacklist: async (providerId: string) => {
    return apiRequest('/admin/remove-blacklist', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  },

  unapproveProvider: async (providerId: string) => {
    return apiRequest('/admin/unapprove-provider', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  },

  fixProviderVerification: async (providerId: string) => {
    return apiRequest('/admin/fix-provider-verification', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  },

  toggleUserStatus: async (userId: string) => {
    return apiRequest('/admin/toggle-status', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  deleteUser: async (userId: string) => {
    return apiRequest(`/admin/user/${userId}`, {
      method: 'DELETE',
    });
  },

  getAllClients: async () => {
    return apiRequest('/admin/clients', {
      method: 'GET',
    });
  },

  getAllProviders: async () => {
    return apiRequest('/admin/providers', {
      method: 'GET',
    });
  },

  createProvider: async (providerData: any) => {
    return apiRequest('/admin/providers', {
      method: 'POST',
      body: JSON.stringify(providerData),
    });
  },

  getAdminUsers: async () => {
    return apiRequest('/admin/admin-users', {
      method: 'GET',
    });
  },

  // Review Management
  getAllReviews: async () => {
    return apiRequest('/admin/reviews', {
      method: 'GET',
    });
  },

  hideReview: async (reviewId: string, reason?: string) => {
    return apiRequest('/admin/reviews/hide', {
      method: 'POST',
      body: JSON.stringify({ reviewId, reason }),
    });
  },

  unhideReview: async (reviewId: string) => {
    return apiRequest('/admin/reviews/unhide', {
      method: 'POST',
      body: JSON.stringify({ reviewId }),
    });
  },

  deleteReview: async (reviewId: string) => {
    return apiRequest(`/admin/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  },

  // Clear all client and provider data
  clearAllData: async () => {
    return apiRequest('/admin/clear-all-data', {
      method: 'POST',
    });
  },

  // Client Profile Management (for admin)
  getClientProfile: async (clientId: string) => {
    return apiRequest(`/admin/clients/${clientId}/profile`, {
      method: 'GET',
    });
  },

  // Family Member Management (for admin)
  addClientFamilyMember: async (clientId: string, member: any) => {
    return apiRequest(`/admin/clients/${clientId}/family-members`, {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  updateClientFamilyMember: async (clientId: string, memberId: string, member: any) => {
    return apiRequest(`/admin/clients/${clientId}/family-members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(member),
    });
  },

  deleteClientFamilyMember: async (clientId: string, memberId: string) => {
    return apiRequest(`/admin/clients/${clientId}/family-members/${memberId}`, {
      method: 'DELETE',
    });
  },

  // Book service on behalf of client
  createBookingForClient: async (bookingData: any) => {
    return apiRequest('/admin/bookings/create', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Platform Settings
  getSettings: async () => {
    return apiRequest('/admin/settings', {
      method: 'GET',
    });
  },

  updateSettings: async (settings: any) => {
    return apiRequest('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Admin Team & Roles
  getRoles: async () => {
    return apiRequest('/admin/roles', {
      method: 'GET',
    });
  },

  createRole: async (roleData: any) => {
    return apiRequest('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  },

  updateRole: async (roleId: string, roleData: any) => {
    return apiRequest(`/admin/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  },

  deleteRole: async (roleId: string) => {
    return apiRequest(`/admin/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  getAdminTeam: async () => {
    return apiRequest('/admin/team', {
      method: 'GET',
    });
  },

  createAdminUser: async (userData: any) => {
    return apiRequest('/admin/team', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateAdminUser: async (userId: string, userData: any) => {
    return apiRequest(`/admin/team/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deleteAdminUser: async (userId: string) => {
    return apiRequest(`/admin/team/${userId}`, {
      method: 'DELETE',
    });
  },

  resetAdminUserPassword: async (userId: string, passwordData: any) => {
    return apiRequest(`/admin/team/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  fixAdminMetadata: async () => {
    return apiRequest('/admin/team/fix-metadata', {
      method: 'POST',
    });
  },

  getCurrentAdminUser: async () => {
    return apiRequest('/admin/me', {
      method: 'GET',
    });
  },

  // Wallet API
  getAllWallets: async () => {
    return apiRequest('/admin/wallets', {
      method: 'GET',
    });
  },

  // Emergency Alerts
  getEmergencyAlerts: async () => {
    return apiRequest('/admin/emergency-alerts', {
      method: 'GET',
    });
  },

  // Booking Management
  getBookingById: async (bookingId: string) => {
    return apiRequest(`/admin/booking/${bookingId}`, {
      method: 'GET',
    });
  },

  removeProviderFromBooking: async (bookingId: string) => {
    return apiRequest(`/admin/booking/${bookingId}/remove-provider`, {
      method: 'POST',
    });
  },

  reassignBookingToProvider: async (bookingId: string, providerId: string) => {
    return apiRequest(`/admin/booking/${bookingId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  },

  resolveEmergencyAlert: async (alertId: string) => {
    return apiRequest('/admin/emergency-alerts/resolve', {
      method: 'POST',
      body: JSON.stringify({ alertId }),
    });
  },
};