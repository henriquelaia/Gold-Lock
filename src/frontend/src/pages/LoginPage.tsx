import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, Zap } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

type Mode = 'login' | 'register'

export function LoginPage() {
  const { login, register, loading, error } = useAuth()
  const { setUser, setTokens } = useAuthStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')

  const enterDemoMode = () => {
    setTokens({ accessToken: 'demo-token', refreshToken: 'demo-refresh' })
    setUser({
      id: 'demo',
      name: 'Utilizador Demo',
      email: 'demo@goldlock.pt',
      email_verified: true,
      totp_enabled: false,
      created_at: new Date().toISOString(),
    })
    navigate('/')
  }

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      await login(email, password)
    } else {
      await register(name, email, password)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'var(--ink-900)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <rect x="2.5" y="7.5" width="11" height="7" rx="1.5" stroke="white" strokeWidth="1.2"/>
              <path d="M5 7.5V5C5 3.343 6.343 2 8 2C9.657 2 11 3.343 11 5V7.5"
                stroke="#C9A227" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="11" r="1.2" fill="#C9A227"/>
            </svg>
          </div>
          <span className="text-white font-black text-lg tracking-tight">
            Gold<span style={{ color: 'var(--gold)' }}>Lock</span>
          </span>
        </div>

        {/* Citação central */}
        <div>
          <p className="text-3xl font-bold text-white leading-snug mb-6">
            As tuas finanças,<br />
            <span style={{ color: 'var(--gold)' }}>inteligentes</span> e organizadas.
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Open Banking · Simulador IRS · IA Financeira
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Utilizadores', value: '2.400+' },
              { label: 'Poupado (média)', value: '€340/mês' },
              { label: 'Bancos ligados', value: '12' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>
          © 2024 GoldLock · Universidade da Beira Interior
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--ink-900)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2.5" y="7.5" width="11" height="7" rx="1.5" stroke="white" strokeWidth="1.2"/>
                <path d="M5 7.5V5C5 3.343 6.343 2 8 2C9.657 2 11 3.343 11 5V7.5"
                  stroke="#C9A227" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="8" cy="11" r="1.2" fill="#C9A227"/>
              </svg>
            </div>
            <span className="font-black text-lg" style={{ color: 'var(--ink-900)' }}>
              Gold<span style={{ color: 'var(--gold)' }}>Lock</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--ink-900)' }}>
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-500)' }}>
            {mode === 'login'
              ? 'Entra para acederes às tuas finanças'
              : 'Começa a gerir as tuas finanças hoje'}
          </p>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--ink-100)' }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: mode === m ? 'var(--surface)' : 'transparent',
                  color: mode === m ? 'var(--ink-900)' : 'var(--ink-500)',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div key="name"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <InputField icon={<User size={15} />} type="text" placeholder="Nome completo"
                    value={name} onChange={setName} required={mode === 'register'} />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField icon={<Mail size={15} />} type="email" placeholder="Email"
              value={email} onChange={setEmail} required />

            <div className="relative">
              <InputField icon={<Lock size={15} />} type={showPass ? 'text' : 'password'}
                placeholder="Password" value={password} onChange={setPassword} required />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--ink-300)' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <a href="/forgot-password" className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--gold)' }}>
                  Esqueceste a password?
                </a>
              </div>
            )}

            {/* Erro */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-red-700"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all mt-2 flex items-center justify-center gap-2"
              style={{
                background: loading ? 'var(--ink-400)' : 'var(--ink-900)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> A processar...</>
                : mode === 'login' ? 'Entrar' : 'Criar conta'
              }
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-center mt-4" style={{ color: 'var(--ink-300)' }}>
              8+ caracteres, uma maiúscula e um número.
            </p>
          )}

          {/* Modo demo */}
          <button
            type="button"
            onClick={enterDemoMode}
            className="w-full mt-3 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'rgba(201,162,39,0.1)',
              border: '1px solid rgba(201,162,39,0.3)',
              color: 'var(--gold)',
            }}
          >
            <Zap size={15} />
            Entrar em modo demo
          </button>

          {/* Separador */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--ink-300)' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Segurança */}
          <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--ink-300)' }}>
            <span className="flex items-center gap-1">
              <span style={{ color: 'var(--gold)' }}>🔒</span> Dados encriptados
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span style={{ color: 'var(--gold)' }}>🏛️</span> Regulado pelo Banco de Portugal
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

interface InputFieldProps {
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}

function InputField({ icon, type, placeholder, value, onChange, required }: InputFieldProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'}
      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
    >
      <span style={{ color: 'var(--ink-300)' }} className="shrink-0">{icon}</span>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} required={required}
        className="flex-1 bg-transparent text-sm outline-none"
        style={{ color: 'var(--ink-900)' }}
      />
    </div>
  )
}
