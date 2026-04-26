/**
 * SettingsPage — Gold Lock
 * ========================
 * Tabs: Perfil | Segurança | 2FA
 * Permite editar nome/avatar, alterar password, ativar/desativar TOTP.
 */

import { useState } from 'react';
import { User, Shield, Smartphone } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { PageHeader } from '../components/ui/PageHeader';
import { TotpSetupModal } from '../components/auth/TotpSetupModal';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

type Tab = 'profile' | 'security' | '2fa';

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [tab, setTab]               = useState<Tab>('profile');
  const [name, setName]             = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl]   = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Change password
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [changingPw, setChangingPw]   = useState(false);
  const [pwMsg, setPwMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: 'As passwords novas não coincidem.' }); return; }
    if (newPw.length < 8) { setPwMsg({ type: 'err', text: 'A nova password deve ter pelo menos 8 caracteres.' }); return; }
    setChangingPw(true);
    setPwMsg(null);
    try {
      await authApi.changePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwMsg({ type: 'ok', text: 'Password alterada com sucesso. Por favor faz login novamente.' });
    } catch {
      setPwMsg({ type: 'err', text: 'Password atual incorreta ou requisitos não cumpridos.' });
    } finally {
      setChangingPw(false);
    }
  }

  // 2FA
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [disablingTotp, setDisablingTotp] = useState(false);
  const [totpPassword, setTotpPassword]   = useState('');
  const [totpMsg, setTotpMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const { data } = await authApi.updateProfile({ name, avatarUrl: avatarUrl || undefined });
      setUser(data.data.user);
      setProfileMsg({ type: 'ok', text: 'Perfil atualizado com sucesso.' });
    } catch {
      setProfileMsg({ type: 'err', text: 'Erro ao guardar. Tenta novamente.' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function disableTotp(e: React.FormEvent) {
    e.preventDefault();
    setDisablingTotp(true);
    setTotpMsg(null);
    try {
      await authApi.disable2fa(totpPassword);
      setUser({ ...user!, totp_enabled: false });
      setTotpPassword('');
      setTotpMsg({ type: 'ok', text: '2FA desativado.' });
    } catch {
      setTotpMsg({ type: 'err', text: 'Password incorreta.' });
    } finally {
      setDisablingTotp(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile',  label: 'Perfil',    icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: '2fa',      label: '2FA',       icon: Smartphone },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader title="Definições" subtitle="Gere o teu perfil e segurança" />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgba(73,62,229,0.06)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'text-[var(--gold)] shadow-sm' : 'text-[var(--ink-500)]/60 hover:text-[var(--ink-500)]'
            }`}
            style={tab === id ? { background: 'rgba(255,255,255,0.85)' } : {}}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Perfil */}
      {tab === 'profile' && (
        <GlassCard>
          <h3 className="text-base font-bold text-[var(--ink-900)] mb-4">Informação pessoal</h3>
          {profileMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${profileMsg.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-[#ba1a1a] bg-[#ffdad6]'}`}>
              {profileMsg.text}
            </div>
          )}
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-[var(--gold)]/40 transition-colors"
                style={{ background: 'rgba(0,0,0,0.03)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[var(--ink-500)]/50 cursor-not-allowed"
                style={{ background: 'rgba(0,0,0,0.03)' }}
              />
              <p className="text-xs text-[var(--ink-500)]/40 mt-1">O email não pode ser alterado.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">URL do avatar (opcional)</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-[var(--gold)]/40 transition-colors"
                style={{ background: 'rgba(0,0,0,0.03)' }}
              />
            </div>
            <GlassButton type="submit" loading={savingProfile}>Guardar alterações</GlassButton>
          </form>
        </GlassCard>
      )}

      {/* Tab: Segurança */}
      {tab === 'security' && (
        <GlassCard>
          <h3 className="text-base font-bold text-[var(--ink-900)] mb-1">Alterar Password</h3>
          <p className="text-sm text-[var(--ink-500)]/60 mb-5">
            A nova password deve ter pelo menos 8 caracteres, uma maiúscula, um número e um carácter especial.
          </p>
          {pwMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${pwMsg.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-[#ba1a1a] bg-[#ffdad6]'}`}>
              {pwMsg.text}
            </div>
          )}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">Password atual</label>
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-[var(--gold)]/40 transition-colors"
                style={{ background: 'rgba(0,0,0,0.03)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">Nova password</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-[var(--gold)]/40 transition-colors"
                style={{ background: 'rgba(0,0,0,0.03)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-500)] mb-1.5 uppercase tracking-wider">Confirmar nova password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-[var(--gold)]/40 transition-colors"
                style={{ background: 'rgba(0,0,0,0.03)' }}
              />
            </div>
            <GlassButton type="submit" loading={changingPw}>
              <Shield className="w-4 h-4" />
              Alterar password
            </GlassButton>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--gold)]/10">
            <h4 className="text-sm font-semibold text-[var(--ink-900)] mb-1">Email verificado</h4>
            <p className="text-sm text-[var(--ink-500)]/60">
              {user?.email_verified
                ? '✓ O teu email está verificado.'
                : '✗ Email ainda não verificado — verifica a tua caixa de entrada.'}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Tab: 2FA */}
      {tab === '2fa' && (
        <GlassCard>
          <h3 className="text-base font-bold text-[var(--ink-900)] mb-1">Autenticação de dois fatores</h3>
          <p className="text-sm text-[var(--ink-500)]/60 mb-6">
            O TOTP (Time-based One-Time Password) gera um código de 6 dígitos a cada 30 segundos,
            compatível com Google Authenticator, Authy e outros.
          </p>

          {totpMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${totpMsg.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-[#ba1a1a] bg-[#ffdad6]'}`}>
              {totpMsg.text}
            </div>
          )}

          {user?.totp_enabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                2FA ativo
              </div>
              <p className="text-sm text-[var(--ink-500)]/60">
                Para desativar, confirma a tua password atual.
              </p>
              <form onSubmit={disableTotp} className="space-y-3">
                <input
                  type="password"
                  value={totpPassword}
                  onChange={(e) => setTotpPassword(e.target.value)}
                  placeholder="Password atual"
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-[var(--gold)]/40"
                  style={{ background: 'rgba(0,0,0,0.03)' }}
                />
                <GlassButton variant="danger" type="submit" loading={disablingTotp} size="sm">
                  Desativar 2FA
                </GlassButton>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-[var(--ink-500)]/50 font-medium">
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                2FA inativo
              </div>
              <GlassButton onClick={() => setShowTotpModal(true)}>
                <Smartphone className="w-4 h-4" />
                Ativar autenticador
              </GlassButton>
            </div>
          )}
        </GlassCard>
      )}

      {showTotpModal && (
        <TotpSetupModal
          onClose={() => setShowTotpModal(false)}
          onEnabled={() => {
            setUser({ ...user!, totp_enabled: true });
            setShowTotpModal(false);
            setTotpMsg({ type: 'ok', text: '2FA ativado com sucesso!' });
          }}
        />
      )}
    </div>
  );
}
