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
import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

export function PrivateRoute() {
  const { accessToken, user, setUser, clearAuth } = useAuthStore();

  // Evitar redirect prematuro: Zustand persist reidrata de forma assíncrona.
  // Na primeira renderização, accessToken pode ser null antes de estar disponível.
  // Usar um ref para garantir que só verificamos depois da hidratação (useEffect).
  const hasHydrated = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Marcar como hidratado após o primeiro render (localStorage já foi lido)
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

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
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated || checking) {
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
