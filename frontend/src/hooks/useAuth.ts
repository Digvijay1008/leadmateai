'use client';
import { useState } from 'react';
import { authService } from '@/services/auth.service';
import { LoginCredentials, SignupCredentials } from '@/types/auth';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(credentials);
      localStorage.setItem('tenant_token', data.token);
      setLoading(false);
      router.push('/dashboard');
      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
      return false;
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.signup(credentials);
      localStorage.setItem('tenant_token', data.token);
      setLoading(false);
      router.push('/onboarding');
      return true;
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      setLoading(false);
      return false;
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setSuccess('Reset link sent to your email.');
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to send link');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (password: string, token: string) => {
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(password, token);
      setSuccess('Password updated successfully.');
      setTimeout(() => router.push('/login'), 2000);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { login, signup, forgotPassword, resetPassword, loading, error, success };
}
