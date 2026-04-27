/**
 * ForgotPasswordPage — Gold Lock
 * ================================
 * Solicita reset de password por email.
 * Resposta sempre igual independentemente de o email existir (previne enumeração).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';

export function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Ocorreu um erro. Tenta novamente.');
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

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[var(--ink-900)] mb-2">Email enviado!</h2>
            <p className="text-sm text-[var(--ink-500)]/70 mb-6">
              Se o endereço estiver registado, receberás um email com instruções para recuperar a password.
              O link é válido por <strong>1 hora</strong>.
            </p>
            <Link to="/login" className="text-sm text-[var(--gold)] font-medium hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-[var(--ink-900)] tracking-tight mb-1">Recuperar password</h2>
            <p className="text-sm text-[var(--ink-500)]/60 mb-6">
              Introduz o teu email e enviaremos um link de recuperação.
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm text-[#ba1a1a]"
                   style={{ background: '#ffdad6' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="o.teu@email.pt"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm text-[var(--ink-900)] outline-none border border-transparent focus:border-[var(--gold)]/40 transition-colors"
                  style={{ background: 'rgba(0,0,0,0.03)' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
                style={{ background: 'var(--ink-900)' }}
              >
                {loading ? 'A enviar…' : 'Enviar link de recuperação'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-500)]/60 hover:text-[var(--gold)] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
