import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Info, Shield, Flame, Minus, Plus, X, Loader2,
} from 'lucide-react';
import { useInvestments, useCreateInvestment, useDeleteInvestment } from '../hooks/useInvestments';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

import { EUR_RATE } from '../config/constants';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);


const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.30, delay, ease: [0.22, 1, 0.36, 1] },
});

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
} as const;

type InvestmentType = 'stock' | 'etf' | 'bond' | 'crypto' | 'certificado' | 'deposito';
type RiskLevel = 'guaranteed' | 'moderate' | 'high';

interface Investment {
  id: string;
  name: string;
  ticker?: string;
  type: InvestmentType;
  quantity: number;
  purchase_price: number;
  current_price?: number;
  currency?: string;
  risk_level: RiskLevel;
  annual_rate?: number;
  institution?: string;
}

const TABS: { id: 'todos' | InvestmentType; label: string }[] = [
  { id: 'todos',       label: 'Todos' },
  { id: 'stock',       label: 'Ações' },
  { id: 'etf',         label: 'ETFs' },
  { id: 'bond',        label: 'Obrigações' },
  { id: 'crypto',      label: 'Crypto' },
  { id: 'certificado', label: 'Cert. Aforro' },
  { id: 'deposito',    label: 'Dep. a Prazo' },
];

const TYPE_LABELS: Record<InvestmentType, string> = {
  stock:       'Ação',
  etf:         'ETF',
  bond:        'Obrigação',
  crypto:      'Crypto',
  certificado: 'Cert. Aforro',
  deposito:    'Dep. a Prazo',
};

const TYPE_COLORS: Record<InvestmentType, string> = {
  stock:       '#3B82F6',
  etf:         '#8B5CF6',
  bond:        '#6B7280',
  crypto:      '#F59E0B',
  certificado: '#10B981',
  deposito:    '#14B8A6',
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  guaranteed: { label: 'Garantido', color: '#10B981', bg: 'rgba(16,185,129,0.10)', Icon: Shield },
  moderate:   { label: 'Moderado',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', Icon: Minus },
  high:       { label: 'Alto',      color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  Icon: Flame },
};

function getInvValue(inv: Investment) {
  const v = Number(inv.quantity) * Number(inv.purchase_price);
  return inv.currency === 'USD' ? v * EUR_RATE : v;
}

function CreateInvestmentModal({ onClose }: { onClose: () => void }) {
  const { mutate: create, isPending } = useCreateInvestment();
  const [form, setForm] = useState({
    name: '', ticker: '', type: 'stock' as InvestmentType,
    quantity: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0],
    currency: 'EUR', riskLevel: 'moderate' as RiskLevel,
    institution: '', annualRate: '', notes: '',
  });
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.quantity || !form.purchasePrice) {
      setError('Nome, quantidade e preço são obrigatórios');
      return;
    }
    if (Number(form.quantity) <= 0 || Number(form.purchasePrice) <= 0) {
      setError('Quantidade e preço devem ser maiores que zero');
      return;
    }
    create(
      {
        name: form.name,
        ticker: form.ticker || undefined,
        type: form.type,
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        purchaseDate: form.purchaseDate,
        currency: form.currency,
        riskLevel: form.riskLevel,
        institution: form.institution || undefined,
        annualRate: form.annualRate ? Number(form.annualRate) : undefined,
        notes: form.notes || undefined,
      },
      { onSuccess: onClose, onError: () => setError('Erro ao criar investimento') }
    );
  }

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,16,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--ink-900)' }}>Novo Investimento</h2>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--ink-400)' }} /></button>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Tipo</label>
            <select value={form.type} onChange={e => f('type', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Nome</label>
            <input value={form.name} onChange={e => f('name', e.target.value)}
              placeholder="Ex: iShares MSCI World"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Ticker (opcional)</label>
            <input value={form.ticker} onChange={e => f('ticker', e.target.value)}
              placeholder="Ex: IWDA.AS"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Quantidade</label>
              <input type="number" min="0" step="any" value={form.quantity} onChange={e => f('quantity', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Preço Compra</label>
              <input type="number" min="0" step="0.0001" value={form.purchasePrice} onChange={e => f('purchasePrice', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Moeda</label>
              <select value={form.currency} onChange={e => f('currency', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Risco</label>
              <select value={form.riskLevel} onChange={e => f('riskLevel', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}>
                <option value="guaranteed">Garantido</option>
                <option value="moderate">Moderado</option>
                <option value="high">Alto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Data de Compra</label>
            <input type="date" value={form.purchaseDate} onChange={e => f('purchaseDate', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          {(form.type === 'certificado' || form.type === 'deposito' || form.type === 'bond') && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Taxa Anual (%)</label>
              <input type="number" min="0" step="0.01" value={form.annualRate} onChange={e => f('annualRate', e.target.value)}
                placeholder="Ex: 3.5"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Instituição (opcional)</label>
            <input value={form.institution} onChange={e => f('institution', e.target.value)}
              placeholder="Ex: DEGIRO, Trading212, CGD"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--ink-900)' }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isPending ? 'A guardar…' : 'Adicionar Investimento'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<'todos' | InvestmentType>('todos');
  const [showNote, setShowNote] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { data: investments = [], isLoading } = useInvestments();
  const { mutate: deleteInvestment, isPending: isDeleting } = useDeleteInvestment();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const invList = investments as Investment[];

  const filtered = activeTab === 'todos' ? invList : invList.filter(i => i.type === activeTab);

  const totalPortfolioValue = invList.reduce((s, inv) => s + getInvValue(inv), 0);

  const donutData = Object.entries(
    invList.reduce<Record<string, number>>((acc, inv) => {
      const val = getInvValue(inv);
      acc[inv.type] = (acc[inv.type] || 0) + val;
      return acc;
    }, {})
  ).map(([type, value]) => ({
    name: TYPE_LABELS[type as InvestmentType],
    value,
    color: TYPE_COLORS[type as InvestmentType],
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <>
      <AnimatePresence>
        {showCreate && <CreateInvestmentModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>

      <div className="p-6 space-y-5 max-w-7xl mx-auto">

        <motion.div {...fadeUp(0)} className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>Investimentos</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-400)' }}>
              Visão completa do teu patrimônio financeiro
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNote(n => !n)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
              <Info size={12} />
              Nota
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--ink-900)' }}>
              <Plus size={14} />
              Adicionar
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="rounded-2xl px-5 py-4 text-sm"
              style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--ink-900)' }}>Investimento vs Poupança Garantida</p>
              <p style={{ color: 'var(--ink-500)' }}>
                <strong>Depósitos a Prazo</strong> e <strong>Certificados de Aforro</strong> são instrumentos de poupança com capital garantido.
                Produtos como <strong>ações, ETFs e crypto</strong> têm risco de perda de capital.
                Os valores mostrados correspondem ao custo de aquisição. Preços em tempo real serão adicionados brevemente.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {invList.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sem investimentos"
            description="Adiciona as tuas posições para acompanhar o teu portfólio."
            action={{ label: 'Adicionar Investimento', onClick: () => setShowCreate(true) }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <motion.div {...fadeUp(0.06)} className="rounded-2xl p-5 flex flex-col justify-between"
                style={{ background: 'var(--ink-900)', minHeight: 130 }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Carteira Total
                </span>
                <div>
                  <p className="text-[26px] font-black text-white tabular-nums leading-none">{eur(totalPortfolioValue)}</p>
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {invList.length} posições · {new Set(invList.map(i => i.type)).size} classes de ativos
                  </p>
                </div>
              </motion.div>

              <motion.div {...fadeUp(0.10)} className="rounded-2xl p-5 flex flex-col justify-between" style={card}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-300)' }}>
                  Rentabilidade Total
                </span>
                <div>
                  {(() => {
                    const plInvs = invList.filter(i => i.risk_level !== 'guaranteed' && i.current_price != null);
                    if (plInvs.length === 0) {
                      return (
                        <>
                          <p className="text-[22px] font-black tabular-nums leading-none" style={{ color: 'var(--ink-400)' }}>—</p>
                          <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--ink-300)' }}>
                            Preço de compra · preços reais no Sprint 10
                          </p>
                        </>
                      );
                    }
                    const totalPL = plInvs.reduce((s, inv) => {
                      const cost = Number(inv.quantity) * Number(inv.purchase_price);
                      const value = Number(inv.quantity) * Number(inv.current_price!);
                      return s + (inv.currency === 'USD' ? (value - cost) * EUR_RATE : value - cost);
                    }, 0);
                    const totalCost = plInvs.reduce((s, inv) => {
                      const cost = Number(inv.quantity) * Number(inv.purchase_price);
                      return s + (inv.currency === 'USD' ? cost * EUR_RATE : cost);
                    }, 0);
                    const plPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
                    return (
                      <>
                        <p className="text-[22px] font-black tabular-nums leading-none"
                          style={{ color: totalPL >= 0 ? '#22c55e' : '#ef4444' }}>
                          {totalPL >= 0 ? '+' : ''}{eur(totalPL)}
                        </p>
                        <p className="text-xs mt-1.5 font-medium"
                          style={{ color: totalPL >= 0 ? '#22c55e' : '#ef4444' }}>
                          {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}% · preço na compra
                        </p>
                      </>
                    );
                  })()}
                </div>
              </motion.div>

              <motion.div {...fadeUp(0.14)} className="rounded-2xl p-5" style={card}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--ink-300)' }}>
                  Por Nível de Risco
                </p>
                <div className="space-y-2">
                  {(['guaranteed', 'moderate', 'high'] as const).map(risk => {
                    const cfg = RISK_CONFIG[risk];
                    const val = invList.filter(i => i.risk_level === risk).reduce((s, i) => s + getInvValue(i), 0);
                    const pctVal = totalPortfolioValue > 0 ? (val / totalPortfolioValue) * 100 : 0;
                    return (
                      <div key={risk} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                          style={{ background: cfg.bg }}>
                          <cfg.Icon size={11} style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs font-medium" style={{ color: 'var(--ink-700)' }}>{cfg.label}</span>
                            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>
                              {pctVal.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full" style={{ background: 'var(--ink-100)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pctVal}%`, background: cfg.color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <motion.div {...fadeUp(0.18)} className="rounded-2xl p-5" style={card}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--ink-300)' }}>
                  Alocação
                </p>
                <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ink-900)' }}>Por Tipo de Ativo</h2>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%"
                      innerRadius={40} outerRadius={60}
                      paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => eur(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-500)' }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>
                        {totalPortfolioValue > 0 ? `${((d.value / totalPortfolioValue) * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div {...fadeUp(0.22)} className="lg:col-span-2 rounded-2xl overflow-hidden" style={card}>
                <div className="flex gap-0 px-4 pt-4 overflow-x-auto">
                  {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all mr-1"
                      style={{
                        background: activeTab === tab.id ? 'var(--ink-900)' : 'transparent',
                        color: activeTab === tab.id ? 'white' : 'var(--ink-400)',
                      }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-12 px-4 py-2 mt-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ink-300)', borderBottom: '1px solid var(--border)' }}>
                  <span className="col-span-5">Ativo</span>
                  <span className="col-span-2 text-right">Valor</span>
                  <span className="col-span-2 text-right">P&L</span>
                  <span className="col-span-2 text-right">Alocação</span>
                  <span className="col-span-1" />
                </div>

                <AnimatePresence mode="popLayout">
                  {filtered.map((inv, i) => {
                    const val = getInvValue(inv);
                    const alloc = totalPortfolioValue > 0 ? (val / totalPortfolioValue) * 100 : 0;
                    const risk = RISK_CONFIG[inv.risk_level] ?? RISK_CONFIG.moderate;
                    const typeColor = TYPE_COLORS[inv.type] ?? '#9E9E9E';
                    const isGuaranteed = inv.risk_level === 'guaranteed';

                    return (
                      <motion.div key={inv.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ delay: i * 0.04, duration: 0.22 }}
                        className="grid grid-cols-12 items-center px-4 py-3 transition-colors group"
                        style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ink-50)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <div className="col-span-5 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                            style={{ background: typeColor }}>
                            {inv.ticker ? inv.ticker.slice(0, 3) : TYPE_LABELS[inv.type].slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink-900)' }}>
                              {inv.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{ background: `${typeColor}18`, color: typeColor }}>
                                {TYPE_LABELS[inv.type]}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{ background: risk.bg, color: risk.color }}>
                                {risk.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 text-right">
                          <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>{eur(val)}</p>
                          {inv.annual_rate && (
                            <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>{Number(inv.annual_rate).toFixed(2)}%/ano</p>
                          )}
                        </div>

                        <div className="col-span-2 text-right">
                          {isGuaranteed ? (
                            <p className="text-xs font-medium" style={{ color: 'var(--ink-300)' }}>—</p>
                          ) : inv.current_price != null ? (() => {
                            const cost = Number(inv.quantity) * Number(inv.purchase_price);
                            const value = Number(inv.quantity) * Number(inv.current_price);
                            const pl = inv.currency === 'USD' ? (value - cost) * EUR_RATE : value - cost;
                            const plPct = cost > 0 ? (pl / cost) * 100 : 0;
                            return (
                              <div>
                                <p className="text-xs font-semibold tabular-nums"
                                  style={{ color: pl >= 0 ? '#22c55e' : '#ef4444' }}>
                                  {pl >= 0 ? '+' : ''}{eur(pl)}
                                </p>
                                <p className="text-[10px]" style={{ color: pl >= 0 ? '#22c55e' : '#ef4444' }}>
                                  {plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                                </p>
                              </div>
                            );
                          })() : (
                            <p className="text-[10px] font-medium" style={{ color: 'var(--ink-300)' }}>—</p>
                          )}
                        </div>

                        <div className="col-span-2 text-right">
                          <p className="text-xs font-semibold" style={{ color: 'var(--ink-700)' }}>{alloc.toFixed(1)}%</p>
                          <div className="h-1 rounded-full mt-1" style={{ background: 'var(--ink-100)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(alloc, 100)}%`, background: typeColor }} />
                          </div>
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => setDeleteId(inv.id)}
                            className="opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity p-1 rounded"
                            title="Remover">
                            <X size={12} style={{ color: 'var(--ink-900)' }} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filtered.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm" style={{ color: 'var(--ink-300)' }}>Nenhum ativo nesta categoria.</p>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={deleteId !== null}
        title="Remover investimento"
        description="Esta ação é permanente e não pode ser desfeita."
        confirmLabel="Remover"
        isLoading={isDeleting}
        onConfirm={() => { if (deleteId) deleteInvestment(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
