import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import type { User } from '../services/authService';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Verificar sessão ao carregar
  useEffect(() => {
    if (!authService.isLoggedIn()) {
      setState({ user: null, loading: false, error: null });
      return;
    }

    authService.getMe()
      .then(user => setState({ user, loading: false, error: null }))
      .catch(() => {
        authService.clearTokens();
        setState({ user: null, loading: false, error: null });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.login(email, password);
      setState({ user, loading: false, error: null });
      navigate('/');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erro ao fazer login.';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [navigate]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.register(name, email, password);
      setState({ user, loading: false, error: null });
      navigate('/');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erro ao criar conta.';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    await authService.logout();
    setState({ user: null, loading: false, error: null });
    navigate('/login');
  }, [navigate]);

  return { ...state, login, register, logout };
}
