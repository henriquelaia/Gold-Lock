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
import { useTransactions, useTransactionSummary } from '../hooks/useTransactions';
import { useInvestments } from '../hooks/useInvestments';
import { useBudgets } from '../hooks/useBudgets';
import { useGoals } from '../hooks/useGoals';
import { useAccounts } from '../hooks/useAccounts';
import { EUR_RATE } from '../config/constants';

const PT_MONTHS: Record<number, string> = {
  1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez',
};

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

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
      <p className="font-semibold mb-1.5" style={{ color: 'var(--ink-900)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--ink-500)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{eur(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

interface Investment {
  id: string;
  quantity: number;
  purchase_price: number;
  currency?: string;
  risk_level?: string;
}

interface Budget {
  id: string;
  name: string;
  amount_limit: number;
  spent?: number;
  category_name?: string;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: summary } = useTransactionSummary();
  const { data: txData } = useTransactions({ limit: 5 });
  const { data: accounts = [] } = useAccounts();
  const { data: investments = [] } = useInvestments();
  const { data: budgets = [] } = useBudgets();
  const { data: goals = [] } = useGoals();

  const recentTxs = txData?.data ?? [];

  const monthIncome = Number(summary?.income ?? 0);
  const monthExpenses = Number(summary?.expenses ?? 0);
  const monthSavings = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? ((monthSavings / monthIncome) * 100).toFixed(0) : '0';

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance ?? 0), 0);

  const totalPortfolioValue = (investments as Investment[]).reduce((s, inv) => {
    const val = Number(inv.quantity) * Number(inv.purchase_price);
    return s + (inv.currency === 'USD' ? val * EUR_RATE : val);
  }, 0);

  // Monthly trend from API (byMonth comes sorted DESC — reverse for chart)
  const monthlyTrend = [...(summary?.byMonth ?? [])]
    .slice(0, 6)
    .reverse()
    .map((m: { year: number; month: number; income: number; expenses: number }) => ({
      month: PT_MONTHS[m.month] ?? String(m.month),
      income: Number(m.income),
      expenses: Number(m.expenses),
    }));

  // Spending donut from byCategory
  const spendingByCategory = (summary?.byCategory ?? [])
    .slice(0, 6)
    .map((c: { category_name: string; category_icon: string; category_color: string; total: number }) => ({
      name: c.category_name ?? 'Outros',
      value: Number(c.total),
      color: c.category_color ?? '#9E9E9E',
    }));

  const totalSpendingThisMonth = spendingByCategory.reduce((s: number, c: { value: number }) => s + c.value, 0);

  // Auto insights
  const insights: { icon: string; text: string; route: string }[] = [];

  const overBudget = (budgets as Budget[]).filter(b => Number(b.spent ?? 0) > Number(b.amount_limit) * 0.8);
  if (overBudget.length > 0) {
    const b = overBudget[0];
    const pct = Math.round((Number(b.spent ?? 0) / Number(b.amount_limit)) * 100);
    insights.push({ icon: '⚠️', text: `${b.name}: ${pct}% do orçamento`, route: '/budgets' });
  }

  const nearGoal = (goals as Goal[]).find(g =>
    Number(g.current_amount) / Number(g.target_amount) >= 0.85 &&
    Number(g.current_amount) < Number(g.target_amount)
  );
  if (nearGoal) {
    const pct = Math.round((Number(nearGoal.current_amount) / Number(nearGoal.target_amount)) * 100);
    insights.push({ icon: '🎯', text: `${nearGoal.name}: ${pct}% concluído`, route: '/goals' });
  }

  insights.push({ icon: '💡', text: `Taxa de poupança este mês: ${savingsRate}%`, route: '/transactions' });

  const BANK_COLORS = ['#1A56DB', '#D97706', '#059669', '#7C3AED', '#DC2626'];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>Dashboard</h1>
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

      {insights.length > 0 && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
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
              {accounts.length > 0
                ? `${accounts.length} conta${accounts.length > 1 ? 's' : ''} ligada${accounts.length > 1 ? 's' : ''}`
                : 'Sem contas ligadas'}
            </p>
          </div>
        </motion.div>

        {[
          {
            label: 'Receitas', value: eur(monthIncome), sub: 'Este mês',
            positive: true, icon: <TrendingUp size={14} />, delay: 0.12,
          },
          {
            label: 'Despesas', value: eur(monthExpenses), sub: 'Este mês',
            positive: false, icon: <TrendingDown size={14} />, delay: 0.16,
          },
          {
            label: 'Taxa Poupança', value: `${savingsRate}%`, sub: `${eur(monthSavings)} guardados`,
            positive: monthSavings >= 0, icon: <PiggyBank size={14} />, delay: 0.20,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
            <AreaChart data={monthlyTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
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
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-300)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="income" name="Receitas" stroke="#C9A227" strokeWidth={2} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4, fill: '#C9A227' }} />
              <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#f87171" strokeWidth={2} fill="url(#expGrad)" dot={false} activeDot={{ r: 4, fill: '#f87171' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div {...fadeUp(0.28)} className="rounded-2xl p-5" style={card}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--ink-300)' }}>
            Este mês
          </p>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ink-900)' }}>
            Por Categoria
          </h2>
          {spendingByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={spendingByCategory} cx="50%" cy="50%"
                    innerRadius={38} outerRadius={56}
                    paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {spendingByCategory.map((_: unknown, i: number) => (
                      <Cell key={i} fill={spendingByCategory[i].color} />
                    ))}
                    <Label
                      value={eur(totalSpendingThisMonth)}
                      position="center"
                      style={{ fontSize: 11, fontWeight: 700, fill: 'var(--ink-900)' }}
                    />
                  </Pie>
                  <Tooltip formatter={(v: number) => eur(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {spendingByCategory.slice(0, 5).map((cat: { name: string; value: number; color: string }) => (
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
            </>
          ) : (
            <p className="text-xs text-center py-8" style={{ color: 'var(--ink-300)' }}>
              Sem dados de despesas este mês
            </p>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        <motion.div {...fadeUp(0.32)} className="lg:col-span-2 rounded-2xl overflow-hidden" style={card}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>Transações Recentes</h2>
            <button onClick={() => navigate('/transactions')} className="text-xs font-medium hover:underline"
              style={{ color: 'var(--gold)' }}>
              Ver todas
            </button>
          </div>
          <div>
            {recentTxs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--ink-300)' }}>
                Sem transações recentes
              </p>
            ) : recentTxs.map((tx: {
              id: string; description: string; transaction_date: string;
              amount: string; category_icon?: string | null; category_color?: string | null;
              category_name?: string | null; is_recurring?: boolean;
            }, i: number) => (
              <motion.div key={tx.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.36 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 px-5 py-3 transition-colors cursor-default"
                style={{ borderBottom: i < recentTxs.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ink-50)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ background: `${tx.category_color || '#9E9E9E'}18` }}>
                  {tx.category_icon || '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-900)' }}>
                    {tx.description}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
                    {format(parseISO(tx.transaction_date), "d MMM", { locale: pt })}
                    {tx.is_recurring && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                        Recorrente
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-sm font-bold shrink-0 tabular-nums"
                  style={{ color: Number(tx.amount) >= 0 ? '#16a34a' : 'var(--ink-900)' }}>
                  {Number(tx.amount) >= 0 ? '+' : ''}{eur(Math.abs(Number(tx.amount)))}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">

          <motion.div {...fadeUp(0.36)} className="rounded-2xl overflow-hidden" style={card}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>Contas</h2>
              <button onClick={() => navigate('/accounts')} className="text-xs font-medium hover:underline"
                style={{ color: 'var(--gold)' }}>
                Gerir
              </button>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {accounts.length === 0 ? (
                <button onClick={() => navigate('/accounts')}
                  className="w-full text-xs text-center py-3 rounded-xl transition-colors hover:opacity-80"
                  style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                  + Ligar conta bancária
                </button>
              ) : accounts.map((acc, i) => (
                <motion.div key={acc.id}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.40 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0"
                    style={{ background: BANK_COLORS[i % BANK_COLORS.length] }}>
                    {(acc.bank_name ?? 'BK').slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--ink-900)' }}>
                      {acc.account_name ?? acc.bank_name ?? 'Conta'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>
                      {acc.account_type === 'checking' ? 'Corrente' : acc.account_type === 'savings' ? 'Poupança' : 'Conta'}
                    </p>
                  </div>
                  <p className="text-xs font-bold shrink-0 tabular-nums" style={{ color: 'var(--ink-900)' }}>
                    {eur(Number(acc.balance))}
                  </p>
                </motion.div>
              ))}
            </div>
            {accounts.length > 0 && totalBalance > 0 && (
              <div className="px-4 pb-3">
                <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                  {accounts.map((acc, i) => (
                    <div key={acc.id}
                      style={{ width: `${(Number(acc.balance) / totalBalance) * 100}%`, background: BANK_COLORS[i % BANK_COLORS.length] }}
                      className="rounded-full" />
                  ))}
                </div>
              </div>
            )}
          </motion.div>

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
                  <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>
                    {(investments as Investment[]).length} posições
                  </p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--ink-300)' }} />
            </div>
            <div className="px-4 pb-3">
              <p className="text-[18px] font-black tabular-nums" style={{ color: 'var(--ink-900)' }}>
                {eur(totalPortfolioValue)}
              </p>
              <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--ink-300)' }}>
                Valor investido
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
