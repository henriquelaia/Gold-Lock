import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Info, Shield, Flame, Minus,
} from 'lucide-react';
import {
  MOCK_INVESTMENTS, totalPortfolioValue, totalPortfolioCost, totalPortfolioReturn,
  type InvestmentType,
} from '../data/mock';

const EUR_RATE = 0.92;

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const pct = (v: number) =>
  `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

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

type TabType = 'todos' | InvestmentType;

const TABS: { id: TabType; label: string }[] = [
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

const RISK_CONFIG = {
  guaranteed: { label: 'Garantido', color: '#10B981', bg: 'rgba(16,185,129,0.10)', Icon: Shield },
  moderate:   { label: 'Moderado',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', Icon: Minus },
  high:       { label: 'Alto',      color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  Icon: Flame },
};

function getInvValue(inv: typeof MOCK_INVESTMENTS[0]) {
  const v = inv.quantity * inv.currentPrice;
  return inv.currency === 'USD' ? v * EUR_RATE : v;
}

function getInvCost(inv: typeof MOCK_INVESTMENTS[0]) {
  const v = inv.quantity * inv.purchasePrice;
  return inv.currency === 'USD' ? v * EUR_RATE : v;
}

export function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [showNote, setShowNote] = useState(false);

  const filtered = activeTab === 'todos'
    ? MOCK_INVESTMENTS
    : MOCK_INVESTMENTS.filter(i => i.type === activeTab);

  const returnPct = totalPortfolioCost > 0
    ? ((totalPortfolioReturn / totalPortfolioCost) * 100)
    : 0;

  // Donut data por tipo
  const donutData = Object.entries(
    MOCK_INVESTMENTS.reduce<Record<string, number>>((acc, inv) => {
      const val = getInvValue(inv);
      acc[inv.type] = (acc[inv.type] || 0) + val;
      return acc;
    }, {})
  ).map(([type, value]) => ({
    name: TYPE_LABELS[type as InvestmentType],
    value,
    color: TYPE_COLORS[type as InvestmentType],
  }));

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>Investimentos</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-400)' }}>
            Visão completa do teu patrimônio financeiro
          </p>
        </div>
        <button
          onClick={() => setShowNote(n => !n)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
          <Info size={12} />
          Nota importante
        </button>
      </motion.div>

      {/* Nota contextual */}
      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="rounded-2xl px-5 py-4 text-sm"
            style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink-900)' }}>Investimento vs Poupança Garantida</p>
            <p style={{ color: 'var(--ink-500)' }}>
              <strong>Depósitos a Prazo</strong> e <strong>Certificados de Aforro</strong> são instrumentos de poupança com capital garantido —
              tecnicamente não são "investimentos" de mercado. Estão incluídos aqui para uma visão completa do teu patrimônio financeiro.
              Produtos como <strong>ações, ETFs e crypto</strong> têm risco de perda de capital.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <motion.div {...fadeUp(0.06)} className="rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: 'var(--ink-900)', minHeight: 130 }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Carteira Total
          </span>
          <div>
            <p className="text-[26px] font-black text-white tabular-nums leading-none">{eur(totalPortfolioValue)}</p>
            <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {MOCK_INVESTMENTS.length} posições · 6 classes de ativos
            </p>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.10)} className="rounded-2xl p-5 flex flex-col justify-between" style={card}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-300)' }}>
            Rentabilidade Total
          </span>
          <div>
            <p className={`text-[22px] font-black tabular-nums leading-none ${totalPortfolioReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {totalPortfolioReturn >= 0 ? '+' : ''}{eur(totalPortfolioReturn)}
            </p>
            <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${totalPortfolioReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {totalPortfolioReturn >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {pct(returnPct)} desde entrada
            </p>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.14)} className="rounded-2xl p-5" style={card}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--ink-300)' }}>
            Por Nível de Risco
          </p>
          <div className="space-y-2">
            {(['guaranteed', 'moderate', 'high'] as const).map(risk => {
              const cfg = RISK_CONFIG[risk];
              const val = MOCK_INVESTMENTS
                .filter(i => i.riskLevel === risk)
                .reduce((s, i) => s + getInvValue(i), 0);
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

      {/* Alocação + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Donut alocação */}
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
              <Tooltip formatter={(v: any) => eur(v as number)} />
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

        {/* Holdings */}
        <motion.div {...fadeUp(0.22)} className="lg:col-span-2 rounded-2xl overflow-hidden" style={card}>
          {/* Tabs */}
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

          {/* Cabeçalho tabela */}
          <div className="grid grid-cols-12 px-4 py-2 mt-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--ink-300)', borderBottom: '1px solid var(--border)' }}>
            <span className="col-span-5">Ativo</span>
            <span className="col-span-2 text-right">Valor</span>
            <span className="col-span-2 text-right">P&L</span>
            <span className="col-span-2 text-right">Alocação</span>
            <span className="col-span-1" />
          </div>

          {/* Linhas */}
          <AnimatePresence mode="popLayout">
            {filtered.map((inv, i) => {
              const val = getInvValue(inv);
              const cost = getInvCost(inv);
              const pl = val - cost;
              const plPct = cost > 0 ? ((pl / cost) * 100) : 0;
              const alloc = totalPortfolioValue > 0 ? (val / totalPortfolioValue) * 100 : 0;
              const risk = RISK_CONFIG[inv.riskLevel];
              const typeColor = TYPE_COLORS[inv.type];

              return (
                <motion.div key={inv.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: i * 0.04, duration: 0.22 }}
                  className="grid grid-cols-12 items-center px-4 py-3 transition-colors"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ink-50)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  {/* Nome + tipo */}
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

                  {/* Valor atual */}
                  <div className="col-span-2 text-right">
                    <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>{eur(val)}</p>
                    {inv.annualRate && (
                      <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>{inv.annualRate}%/ano</p>
                    )}
                  </div>

                  {/* P&L */}
                  <div className="col-span-2 text-right">
                    {inv.riskLevel === 'guaranteed' ? (
                      <p className="text-xs font-medium" style={{ color: 'var(--ink-300)' }}>—</p>
                    ) : (
                      <>
                        <p className={`text-xs font-semibold tabular-nums ${pl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {pl >= 0 ? '+' : ''}{eur(pl)}
                        </p>
                        <p className={`text-[10px] font-medium ${plPct >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {pct(plPct)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Alocação */}
                  <div className="col-span-2 text-right">
                    <p className="text-xs font-semibold" style={{ color: 'var(--ink-700)' }}>{alloc.toFixed(1)}%</p>
                    <div className="h-1 rounded-full mt-1" style={{ background: 'var(--ink-100)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(alloc, 100)}%`, background: typeColor }} />
                    </div>
                  </div>

                  {/* Trend icon */}
                  <div className="col-span-1 flex justify-end">
                    {inv.riskLevel === 'guaranteed' ? (
                      <Shield size={13} style={{ color: '#10B981' }} />
                    ) : pl >= 0 ? (
                      <TrendingUp size={13} className="text-green-500" />
                    ) : (
                      <TrendingDown size={13} className="text-red-400" />
                    )}
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
    </div>
  );
}
