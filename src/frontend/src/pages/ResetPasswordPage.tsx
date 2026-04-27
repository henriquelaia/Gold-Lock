/**
 * ResetPasswordPage — Gold Lock
 * ==============================
 * Lê o token da query string, valida os requisitos de password
 * e submete o novo hash via POST /api/auth/reset-password.
 */

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';

const PASSWORD_RULES = [
  { label: 'Pelo menos 8 caracteres',       test: (p: string) => p.length >= 8 },
  { label: 'Uma letra maiúscula',            test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Um número',                      test: (p: string) => /[0-9]/.test(p) },
  { label: 'Um carácter especial (@$!%*?&)', test: (p: string) => /[@$!%*?&#\+\-_]/.test(p) },
];

export function ResetPasswordPage() {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [done, setDone]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const token = searchParams.get('token') ?? '';
  const allRulesPassed = PASSWORD_RULES.every(r => r.test(password));
  const passwordsMatch = password === confirm && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRulesPassed || !passwordsMatch) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Token inválido ou expirado. Solicita um novo link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #e8e8f8 50%, #f5f0ff 100%)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/60 p-10"
        style={{
          background: 'rgba(255,255,255,0.78)',
          
          boxShadow: '0 8px 40px rgba(73,62,229,0.10)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--ink-900)' }}
          >
            <Lock className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black tracking-tighter text-[var(--ink-900)]">
            Gold<span className="text-[var(--gold)]">Lock</span>
          </span>
        </div>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[var(--ink-900)] mb-2">Password redefinida!</h2>
            <p className="text-sm text-[var(--ink-500)]/70">
              Todas as sessões ativas foram terminadas. A redirecionar para o login…
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-[var(--ink-900)] tracking-tight mb-1">Nova password</h2>
            <p className="text-sm text-[var(--ink-500)]/60 mb-6">Escolhe uma password forte para a tua conta.</p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm text-[#ba1a1a]" style={{ background: '#ffdad6' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">
                  Nova password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-[var(--ink-900)] outline-none border border-transparent focus:border-[var(--gold)]/40 transition-colors"
                    style={{ background: 'rgba(0,0,0,0.03)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]/40 hover:text-[var(--ink-500)]"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Regras */}
                {password.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {PASSWORD_RULES.map(rule => (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.test(password) ? 'text-green-600' : 'text-[var(--ink-500)]/50'}`}>
                        <span>{rule.test(password) ? '✓' : '○'}</span>
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Confirmar */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">
                  Confirmar password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-xl text-sm text-[var(--ink-900)] outline-none border transition-colors ${
                    confirm && !passwordsMatch ? 'border-red-400/60' : 'border-transparent focus:border-[var(--gold)]/40'
                  }`}
                  style={{ background: 'rgba(0,0,0,0.03)' }}
                />
                {confirm && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1">As passwords não coincidem.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!allRulesPassed || !passwordsMatch || loading}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--ink-900)' }}
              >
                {loading ? 'A guardar…' : 'Definir nova password'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-[var(--ink-500)]/60 hover:text-[var(--gold)] transition-colors">
                Voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
