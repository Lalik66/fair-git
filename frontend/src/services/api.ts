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

  getLogs: async () => {
    const response = await api.get('/admin/logs');
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
};

export default api;
