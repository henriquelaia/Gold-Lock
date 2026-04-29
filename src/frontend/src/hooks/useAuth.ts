/**
 * useAuth — Gold Lock
 * ===================
 * Hook de autenticação. Usa o authStore (Zustand) como fonte de verdade.
 * Expõe login, register, logout e o estado do utilizador atual.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export function useAuth() {
  const navigate = useNavigate();
  const { user, setUser, setTokens, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const login = useCallback(async (
    email: string,
    password: string,
    totpCode?: string
  ): Promise<'ok' | 'totp_required'> => {
    setLoading(true);
    setError(null);
    setNeedsEmailVerification(false);
    try {
      const { data } = await authApi.login({ email, password, totpCode });

      if (data.status === 'totp_required') {
        return 'totp_required';
      }

      setTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
      setUser(data.data.user);
      navigate('/');
      return 'ok';
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string }; status?: number } };
      const message = apiError?.response?.data?.message ?? 'Erro ao fazer login.';
      if (apiError?.response?.status === 403 && message === 'email_not_verified') {
        setNeedsEmailVerification(true);
        setPendingEmail(email);
        setError('Por favor verifica o teu email antes de fazer login.');
      } else {
        setError(message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate, setTokens, setUser]);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await authApi.register({ name, email, password });
      setTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
      setUser(data.data.user);
      navigate('/');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erro ao criar conta.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate, setTokens, setUser]);

  const logout = useCallback(async (): Promise<void> => {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {});
    }
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  return { user, loading, error, needsEmailVerification, pendingEmail, login, register, logout };
}
