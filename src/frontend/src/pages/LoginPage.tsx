import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'register'

export function LoginPage() {
  const { login, register, loading, error } = useAuth()
  const [mode, setMode] = useState<Mode>('login')

  // Campos do formulário
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 p-4">

      {/* Blobs de fundo (Liquid Glass aesthetic) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Card com efeito glass */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">

          {/* Logo e título */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white">FinTwin</h1>
            <p className="text-slate-400 mt-1 text-sm">Gestão Financeira Pessoal</p>
          </div>

          {/* Tabs Login / Criar conta */}
          <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <InputField
                    icon={<User size={16} />}
                    type="text"
                    placeholder="Nome completo"
                    value={name}
                    onChange={setName}
                    required={mode === 'register'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField
              icon={<Mail size={16} />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              required
            />

            <div className="relative">
              <InputField
                icon={<Lock size={16} />}
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={setPassword}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Erro */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-500 hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> A processar...</>
              ) : (
                mode === 'login' ? 'Entrar' : 'Criar conta'
              )}
            </button>
          </form>

          {/* Requisitos de password (apenas no registo) */}
          <AnimatePresence>
            {mode === 'register' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-slate-500 text-center mt-4"
              >
                A password precisa de 8+ caracteres, uma maiúscula e um número.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

// ── Sub-componente: campo de input ─────────────────────────────────────────

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
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-primary-400/50 focus-within:bg-white/10 transition-all duration-200">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
      />
    </div>
  )
}
