import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Label,
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank,
  ArrowUpRight, ArrowDownRight, Zap,
  BarChart2, ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  MOCK_TRANSACTIONS, MOCK_ACCOUNTS, CATEGORIES,
  MONTHLY_TREND, SPENDING_BY_CATEGORY,
  totalBalance, monthIncome, monthExpenses, monthSavings,
  totalPortfolioValue, totalPortfolioReturn,
  MOCK_BUDGETS, MOCK_GOALS,
} from '../data/mock';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] },
});

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
} as const;

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
      <p className="font-semibold mb-1.5" style={{ color: 'var(--ink-900)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--ink-500)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{eur(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();

  const recentTxs = [...MOCK_TRANSACTIONS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const savingsRate = monthIncome > 0
    ? ((monthSavings / monthIncome) * 100).toFixed(0)
    : '0';

  const totalSpendingThisMonth = SPENDING_BY_CATEGORY.reduce((s, c) => s + c.value, 0);

  // Insights automáticos
  const insights: { icon: string; text: string; color: string; route: string }[] = [];

  const overBudget = MOCK_BUDGETS.filter(b => (b.spent / b.limit) > 0.8);
  if (overBudget.length > 0) {
    insights.push({
      icon: '⚠️',
      text: `${overBudget[0].name}: ${Math.round((overBudget[0].spent / overBudget[0].limit) * 100)}% do orçamento`,
      color: '#F59E0B',
      route: '/budgets',
    });
  }

  const nearGoal = MOCK_GOALS.find(g => (g.currentAmount / g.targetAmount) >= 0.85 && g.currentAmount < g.targetAmount);
  if (nearGoal) {
    insights.push({
      icon: '🎯',
      text: `${nearGoal.name}: ${Math.round((nearGoal.currentAmount / nearGoal.targetAmount) * 100)}% concluído`,
      color: '#22C55E',
      route: '/goals',
    });
  }

  insights.push({
    icon: '💡',
    text: `Taxa de poupança este mês: ${savingsRate}%`,
    color: 'var(--gold)',
    route: '/transactions',
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>
            Dashboard
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-400)' }}>
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: pt })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
          <Zap size={11} />
          Dados atualizados
        </div>
      </motion.div>

      {/* Insights rápidos */}
      <motion.div {...fadeUp(0.04)} className="flex gap-2 flex-wrap">
        {insights.map((ins, i) => (
          <button key={i} onClick={() => navigate(ins.route)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-700)' }}>
            <span>{ins.icon}</span>
            <span>{ins.text}</span>
            <ChevronRight size={11} style={{ color: 'var(--ink-300)' }} />
          </button>
        ))}
      </motion.div>

      {/* Hero + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

        {/* Hero — Saldo Total */}
        <motion.div {...fadeUp(0.08)} className="lg:col-span-1 rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: 'var(--ink-900)', minHeight: 140 }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Saldo Total
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Wallet size={13} style={{ color: 'var(--gold)' }} />
            </div>
          </div>
          <div>
            <p className="text-[26px] font-black leading-none text-white tabular-nums">
              {eur(totalBalance)}
            </p>
            <p className="text-xs mt-2 flex items-center gap-1 font-medium" style={{ color: 'rgba(255,255,255,0.40)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              3 contas ligadas
            </p>
          </div>
        </motion.div>

        {/* Stats secundárias */}
        {[
          {
            label: 'Receitas', value: eur(monthIncome), sub: '+2,1% vs mês anterior',
            positive: true, icon: <TrendingUp size={14} />, delay: 0.12,
          },
          {
            label: 'Despesas', value: eur(monthExpenses), sub: '-5,3% vs mês anterior',
            positive: true, icon: <TrendingDown size={14} />, delay: 0.16,
          },
          {
            label: 'Taxa Poupança', value: `${savingsRate}%`, sub: `${eur(monthSavings)} guardados`,
            positive: monthSavings > 0, icon: <PiggyBank size={14} />, delay: 0.20,
          },
        ].map(s => (
          <motion.div key={s.label} {...fadeUp(s.delay)} className="rounded-2xl p-5 flex flex-col gap-4" style={card}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-300)' }}>
                {s.label}
              </span>
              <span style={{ color: 'var(--ink-300)' }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-[20px] font-bold leading-none tabular-nums" style={{ color: 'var(--ink-900)' }}>
                {s.value}
              </p>
              <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${s.positive ? 'text-green-600' : 'text-red-500'}`}>
                {s.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {s.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Tendência mensal */}
        <motion.div {...fadeUp(0.24)} className="lg:col-span-2 rounded-2xl p-5" style={card}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-300)' }}>
                Últimos 6 meses
              </p>
              <h2 className="text-sm font-bold mt-0.5" style={{ color: 'var(--ink-900)' }}>
                Receitas vs Despesas
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ink-400)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--gold)' }} />
                Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                Despesas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_TREND} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A227" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-300)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-300)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="income" name="Receitas" stroke="#C9A227" strokeWidth={2} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4, fill: '#C9A227' }} />
              <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#f87171" strokeWidth={2} fill="url(#expGrad)" dot={false} activeDot={{ r: 4, fill: '#f87171' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Donut por categoria */}
        <motion.div {...fadeUp(0.28)} className="rounded-2xl p-5" style={card}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--ink-300)' }}>
            Este mês
          </p>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ink-900)' }}>
            Por Categoria
          </h2>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={SPENDING_BY_CATEGORY} cx="50%" cy="50%"
                innerRadius={38} outerRadius={56}
                paddingAngle={2} dataKey="value" strokeWidth={0}>
                {SPENDING_BY_CATEGORY.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                <Label
                  value={eur(totalSpendingThisMonth)}
                  position="center"
                  style={{ fontSize: 11, fontWeight: 700, fill: 'var(--ink-900)' }}
                />
              </Pie>
              <Tooltip formatter={(v: any) => eur(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {SPENDING_BY_CATEGORY.slice(0, 5).map(cat => (
              <div key={cat.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-500)' }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
                  {cat.name}
                </span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>
                  {eur(cat.value)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Terceira linha: Transações + Contas + Investimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Transações recentes */}
        <motion.div {...fadeUp(0.32)} className="lg:col-span-2 rounded-2xl overflow-hidden" style={card}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>Transações Recentes</h2>
            <button onClick={() => navigate('/transactions')} className="text-xs font-medium hover:underline"
              style={{ color: 'var(--gold)' }}>
              Ver todas
            </button>
          </div>
          <div>
            {recentTxs.map((tx, i) => {
              const cat = CATEGORIES[tx.categoryId];
              return (
                <motion.div key={tx.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.36 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 px-5 py-3 transition-colors cursor-default"
                  style={{ borderBottom: i < recentTxs.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ink-50)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: `${cat?.color}18` }}>
                    {cat?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-900)' }}>
                      {tx.description}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
                      {format(parseISO(tx.date), "d MMM", { locale: pt })}
                      {tx.isRecurring && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                          Recorrente
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm font-bold shrink-0 tabular-nums"
                    style={{ color: tx.isExpense ? 'var(--ink-900)' : '#16a34a' }}>
                    {tx.isExpense ? '−' : '+'}{eur(tx.amount)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Coluna direita: Contas + Investimentos */}
        <div className="flex flex-col gap-3">

          {/* Contas */}
          <motion.div {...fadeUp(0.36)} className="rounded-2xl overflow-hidden" style={card}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>Contas</h2>
              <button onClick={() => navigate('/accounts')} className="text-xs font-medium hover:underline"
                style={{ color: 'var(--gold)' }}>
                Gerir
              </button>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {MOCK_ACCOUNTS.map((acc, i) => (
                <motion.div key={acc.id}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.40 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0"
                    style={{ background: acc.color }}>
                    {acc.bankLogo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--ink-900)' }}>
                      {acc.accountName}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>
                      {acc.type === 'checking' ? 'Corrente' : acc.type === 'savings' ? 'Poupança' : 'Investimento'}
                    </p>
                  </div>
                  <p className="text-xs font-bold shrink-0 tabular-nums" style={{ color: 'var(--ink-900)' }}>
                    {eur(acc.balance)}
                  </p>
                </motion.div>
              ))}
            </div>
            <div className="px-4 pb-3">
              <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                {MOCK_ACCOUNTS.map(acc => (
                  <div key={acc.id}
                    style={{ width: `${(acc.balance / totalBalance) * 100}%`, background: acc.color }}
                    className="rounded-full" />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Carteira de Investimentos */}
          <motion.div {...fadeUp(0.44)} className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
            style={card}
            onClick={() => navigate('/investments')}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ink-50)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--gold-subtle)' }}>
                  <BarChart2 size={14} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--ink-900)' }}>Investimentos</p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>Carteira total</p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--ink-300)' }} />
            </div>
            <div className="px-4 pb-3">
              <p className="text-[18px] font-black tabular-nums" style={{ color: 'var(--ink-900)' }}>
                {eur(totalPortfolioValue)}
              </p>
              <p className={`text-xs mt-0.5 flex items-center gap-1 font-semibold ${totalPortfolioReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {totalPortfolioReturn >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {totalPortfolioReturn >= 0 ? '+' : ''}{eur(totalPortfolioReturn)} total
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
