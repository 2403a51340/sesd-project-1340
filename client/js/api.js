/**
 * CertiTrust Central API Client
 * Enterprise-grade Fetch wrapper with credentials and unified error handling
 */
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Attach token from localStorage if available (in addition to cookies)
    const token = localStorage.getItem('certitrust_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
      credentials: 'include', // Send HTTP-only cookies
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Auth Endpoints
  auth: {
    login: (credentials) => API.request('/auth/login', { method: 'POST', body: credentials }),
    register: (userData) => API.request('/auth/register', { method: 'POST', body: userData }),
    logout: () => API.request('/auth/logout', { method: 'POST' }),
    getMe: () => API.request('/auth/me', { method: 'GET' }),
    forgotPassword: (email) => API.request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (payload) => API.request('/auth/reset-password', { method: 'POST', body: payload }),
  },

  // Verification & Public Endpoints
  verification: {
    verify: (certificateId, source = 'web_manual') =>
      API.request('/verification/verify', { method: 'POST', body: { certificateId, source } }),
    getRecent: () => API.request('/verification/recent', { method: 'GET' }),
    getCertificate: (id) => API.request(`/certificates/${encodeURIComponent(id)}`, { method: 'GET' }),
    getDirectory: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return API.request(`/certificates${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    getPdfUrl: (id) => `/api/certificates/${encodeURIComponent(id)}/pdf`,
  },

  // Institution Endpoints
  institution: {
    getDashboard: () => API.request('/institution/dashboard', { method: 'GET' }),
    issueCertificate: (payload) => API.request('/institution/certificates', { method: 'POST', body: payload }),
    getCertificates: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return API.request(`/institution/certificates${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    getCertificateById: (id) => API.request(`/institution/certificates/${id}`, { method: 'GET' }),
    requestRevocation: (id, reason) =>
      API.request(`/institution/certificates/${id}/revoke-request`, { method: 'POST', body: { reason } }),
    getVerificationHistory: () => API.request('/institution/verification-history', { method: 'GET' }),
    updateProfile: (profile) => API.request('/institution/profile', { method: 'PUT', body: profile }),
  },

  // Admin Endpoints
  admin: {
    getDashboard: () => API.request('/admin/dashboard', { method: 'GET' }),
    getInstitutions: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return API.request(`/admin/institutions${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    approveInstitution: (id) => API.request(`/admin/institutions/${id}/approve`, { method: 'PATCH' }),
    rejectInstitution: (id, reason) =>
      API.request(`/admin/institutions/${id}/reject`, { method: 'PATCH', body: { reason } }),
    suspendInstitution: (id) => API.request(`/admin/institutions/${id}/suspend`, { method: 'PATCH' }),
    getCertificates: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return API.request(`/admin/certificates${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    revokeCertificate: (id, reason) =>
      API.request(`/admin/certificates/${id}/revoke`, { method: 'PATCH', body: { reason } }),
    getVerificationLogs: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return API.request(`/admin/verification-logs${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    getSuspiciousActivity: () => API.request('/admin/suspicious-activity', { method: 'GET' }),
    getAuditLogs: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return API.request(`/admin/audit-logs${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
  },
};

window.API = API;
