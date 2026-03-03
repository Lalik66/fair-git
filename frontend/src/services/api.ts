import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don't redirect on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  updateLanguage: async (language: string) => {
    const response = await api.put('/auth/language', { language });
    return response.data;
  },

  /**
   * Upgrade current user from visitor (role='user') to vendor
   * Feature 6: Visitor upgrades to vendor role
   */
  upgradeToVendor: async () => {
    const response = await api.post('/auth/upgrade-to-vendor');
    return response.data;
  },

  /**
   * Select role for first-time OAuth users
   * Feature 3: Google OAuth sign-in for visitors
   * Feature 221: First-time user onboarding via OAuth
   */
  selectRole: async (role: 'user' | 'vendor') => {
    const response = await api.post('/auth/select-role', { role });
    return response.data;
  },

  /**
   * Check which OAuth providers are configured on the server
   * Used by frontend to conditionally show OAuth buttons
   */
  getOAuthStatus: async () => {
    const response = await api.get('/auth/oauth-status');
    return response.data as { googleEnabled: boolean };
  },

  /**
   * Get the URL to initiate Google OAuth flow
   * Frontend redirects to this URL to start OAuth
   */
  getGoogleOAuthUrl: () => {
    return `${API_URL}/auth/google`;
  },
};

// Admin API
export const adminApi = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  createAdmin: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    currentPassword: string;
  }) => {
    const response = await api.post('/admin/create-admin', data);
    return response.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    const response = await api.patch(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  },

  getLogs: async (params?: { action?: string; fromDate?: string; toDate?: string }) => {
    const response = await api.get('/admin/logs', { params });
    return response.data;
  },

  // Fair management
  getFairs: async () => {
    const response = await api.get('/admin/fairs');
    return response.data;
  },

  getFair: async (fairId: string) => {
    const response = await api.get(`/admin/fairs/${fairId}`);
    return response.data;
  },

  createFair: async (data: {
    name: string;
    descriptionAz?: string;
    descriptionEn?: string;
    startDate: string;
    endDate: string;
    locationAddress?: string;
    mapCenterLat?: number;
    mapCenterLng?: number;
    bannerImageUrl?: string;
    status?: string;
  }) => {
    const response = await api.post('/admin/fairs', data);
    return response.data;
  },

  updateFair: async (fairId: string, data: {
    name?: string;
    descriptionAz?: string;
    descriptionEn?: string;
    startDate?: string;
    endDate?: string;
    locationAddress?: string;
    mapCenterLat?: number;
    mapCenterLng?: number;
    bannerImageUrl?: string;
    status?: string;
  }) => {
    const response = await api.put(`/admin/fairs/${fairId}`, data);
    return response.data;
  },

  deleteFair: async (fairId: string) => {
    const response = await api.delete(`/admin/fairs/${fairId}`);
    return response.data;
  },

  // Archive fairs that ended 30+ days ago
  archiveFairs: async () => {
    const response = await api.post('/admin/fairs/archive');
    return response.data;
  },

  // Get past/archived fairs
  getPastFairs: async () => {
    const response = await api.get('/admin/fairs/past');
    return response.data;
  },

  // Get detailed fair information with vendor participation data
  getFairDetails: async (fairId: string) => {
    const response = await api.get(`/admin/fairs/${fairId}/details`);
    return response.data;
  },

  // Application management
  getApplications: async (params?: {
    status?: string;
    fairId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const response = await api.get('/admin/applications', { params });
    return response.data;
  },

  getApplicationStats: async () => {
    const response = await api.get('/admin/applications/stats');
    return response.data;
  },

  getApplicationDetails: async (applicationId: string) => {
    const response = await api.get(`/admin/applications/${applicationId}`);
    return response.data.application;
  },

  approveApplication: async (applicationId: string, adminNotes?: string) => {
    const response = await api.put(`/admin/applications/${applicationId}/approve`, { adminNotes });
    return response.data;
  },

  rejectApplication: async (applicationId: string, rejectionReason: string) => {
    const response = await api.put(`/admin/applications/${applicationId}/reject`, { rejectionReason });
    return response.data;
  },

  updateApplicationNotes: async (applicationId: string, adminNotes: string) => {
    const response = await api.put(`/admin/applications/${applicationId}/notes`, { adminNotes });
    return response.data;
  },

  deleteApplication: async (applicationId: string) => {
    const response = await api.delete(`/admin/applications/${applicationId}`);
    return response.data;
  },

  // Booking management
  getBookings: async (params?: { fairId?: string; isArchived?: boolean }) => {
    const response = await api.get('/admin/bookings', { params });
    return response.data;
  },

  // Archive bookings for a specific fair
  archiveFairBookings: async (fairId: string) => {
    const response = await api.post(`/admin/fairs/${fairId}/archive-bookings`);
    return response.data;
  },

  // Vendor house management
  createVendorHouse: async (data: {
    houseNumber: string;
    areaSqm?: number | null;
    price?: number | null;
    description?: string | null;
    latitude: number;
    longitude: number;
  }) => {
    const response = await api.post('/admin/vendor-houses', data);
    return response.data;
  },

  getVendorHouses: async () => {
    const response = await api.get('/admin/vendor-houses');
    return response.data;
  },

  getVendorHouse: async (houseId: string) => {
    const response = await api.get(`/admin/vendor-houses/${houseId}`);
    return response.data;
  },

  updateVendorHouse: async (houseId: string, data: {
    houseNumber?: string;
    areaSqm?: number | null;
    price?: number | null;
    description?: string | null;
    isEnabled?: boolean;
  }) => {
    const response = await api.put(`/admin/vendor-houses/${houseId}`, data);
    return response.data;
  },

  updateVendorHousePanorama: async (houseId: string, panorama360Url: string) => {
    const response = await api.put(`/admin/vendor-houses/${houseId}/panorama`, { panorama360Url });
    return response.data;
  },

  uploadVendorHousePanorama: async (houseId: string, file: File) => {
    const formData = new FormData();
    formData.append('panorama', file);
    const response = await api.post(`/admin/vendor-houses/${houseId}/panorama-upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteVendorHouse: async (houseId: string) => {
    const response = await api.delete(`/admin/vendor-houses/${houseId}`);
    return response.data;
  },

  // Facility management
  getFacilities: async () => {
    const response = await api.get('/admin/facilities');
    return response.data;
  },

  createFacility: async (data: {
    name: string;
    type: string;
    description?: string;
    latitude: number;
    longitude: number;
    photoUrl?: string;
    icon?: string;
    color?: string;
  }) => {
    const response = await api.post('/admin/facilities', data);
    return response.data;
  },

  updateFacility: async (facilityId: string, data: {
    name?: string;
    type?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    photoUrl?: string;
    icon?: string;
    color?: string;
  }) => {
    const response = await api.put(`/admin/facilities/${facilityId}`, data);
    return response.data;
  },

  deleteFacility: async (facilityId: string) => {
    const response = await api.delete(`/admin/facilities/${facilityId}`);
    return response.data;
  },
};

// Vendor API
export const vendorApi = {
  getBookings: async () => {
    const response = await api.get('/vendor/bookings');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/vendor/profile');
    return response.data;
  },

  updateProfile: async (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    companyName?: string;
    businessDescription?: string;
    productCategory?: string;
  }) => {
    const response = await api.put('/vendor/profile', data);
    return response.data;
  },

  getApplications: async () => {
    const response = await api.get('/vendor/applications');
    return response.data;
  },

  submitApplication: async (fairId: string, vendorHouseId: string) => {
    const response = await api.post('/vendor/applications', { fairId, vendorHouseId });
    return response.data;
  },

  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post('/vendor/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteLogo: async () => {
    const response = await api.delete('/vendor/logo');
    return response.data;
  },

  uploadProductImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/vendor/product-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteProductImage: async (imageId: string) => {
    const response = await api.delete(`/vendor/product-images/${imageId}`);
    return response.data;
  },
};

// Public API (no authentication required)
export const publicApi = {
  getNextFair: async () => {
    const response = await api.get('/public/next-fair');
    return response.data;
  },

  getFairs: async () => {
    const response = await api.get('/public/fairs');
    return response.data;
  },

  getAboutUs: async () => {
    const response = await api.get('/public/about-us');
    return response.data;
  },

  getPastEvents: async () => {
    const response = await api.get('/public/past-events');
    return response.data;
  },

  getVendorHouses: async (fairId?: string) => {
    const response = await api.get('/public/vendor-houses', {
      params: fairId ? { fairId } : undefined,
    });
    return response.data;
  },

  getFacilities: async () => {
    const response = await api.get('/public/facilities');
    return response.data;
  },

  getMapObjects: async (params?: { search?: string; types?: string; fairId?: string }) => {
    const response = await api.get('/public/map-objects', { params });
    return response.data;
  },
};

// Admin About Us API
export const adminAboutUsApi = {
  getContent: async () => {
    const response = await api.get('/admin/about-us');
    return response.data;
  },

  updateSection: async (sectionKey: string, contentAz: string, contentEn: string) => {
    const response = await api.put(`/admin/about-us/${sectionKey}`, { contentAz, contentEn });
    return response.data;
  },
};

// Invite API
export const inviteApi = {
  /**
   * Create a new invite link (24h expiry)
   */
  create: async () => {
    const response = await api.post('/invite/create');
    return response.data as {
      token: string;
      url: string;
      expiresAt: string;
    };
  },

  /**
   * Validate an invite token (no auth required)
   */
  validate: async (token: string) => {
    const response = await api.get(`/invite/${token}`);
    return response.data as {
      isValid: boolean;
      inviterName?: string;
      inviterId?: string;
      error?: string;
      code?: string;
    };
  },

  /**
   * Accept an invite and become friends
   */
  accept: async (token: string) => {
    const response = await api.post(`/invite/${token}/accept`);
    return response.data as {
      success: boolean;
      message: string;
      inviterName?: string;
      error?: string;
      code?: string;
    };
  },
};

// AI Chat API (public - no auth required)
export const aiApi = {
  chat: async (message: string) => {
    const response = await api.post('/ai/chat', { message });
    return response.data as { reply: string };
  },
};

export default api;
