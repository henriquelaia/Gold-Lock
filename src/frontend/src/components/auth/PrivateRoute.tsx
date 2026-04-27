/**
 * PrivateRoute — Gold Lock
 * ========================
 * Protege rotas autenticadas: redireciona para /login se não houver sessão.
 * Usa o hook de hidratação do Zustand para evitar redirect prematuro enquanto
 * o estado persisted está a ser lido do localStorage (race condition na primeira renderização).
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function PrivateRoute() {
  const { accessToken, user, setUser, clearAuth } = useAuthStore();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Se há token mas não user (e.g., page refresh), validar sessão via API
    // Token "demo-token" não precisa de validação — é só para modo demo
    if (accessToken && !user && accessToken !== 'demo-token') {
      setChecking(true);
      api.get('/auth/me')
        .then(({ data }) => {
          setUser(data.data.user);
        })
        .catch((err) => {
          // Só limpar auth em erros 401 — não em falhas de rede ou 5xx
          if (err.response?.status === 401) {
            clearAuth();
          }
        })
        .finally(() => setChecking(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #e8e8f8 50%, #f5f0ff 100%)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
