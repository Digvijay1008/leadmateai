import { fetchApi } from './apiClient';
import { LoginCredentials, SignupCredentials, AuthResponse, Tenant } from '@/types/auth';

export const authService = {
  login: async (credentials: LoginCredentials) => {
    return fetchApi<AuthResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  
  signup: async (credentials: SignupCredentials) => {
    return fetchApi<AuthResponse>('/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getCurrentUser: async () => {
    return fetchApi<Tenant>('/v1/auth/me', {
      method: 'GET',
    });
  },

  forgotPassword: async (email: string) => {
    return fetchApi<{ message: string }>('/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (password: string, token: string) => {
    return fetchApi<{ message: string }>('/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password, token }),
    });
  }
};
