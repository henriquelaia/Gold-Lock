import { motion } from 'framer-motion';
import { Plus, AlertTriangle } from 'lucide-react';
import { MOCK_BUDGETS, CATEGORIES } from '../data/mock';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay },
});

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
} as const;

function BudgetCard({ budget, delay }: { budget: typeof MOCK_BUDGETS[0]; delay: number }) {
  const cat = CATEGORIES[budget.categoryId];
  const pct = Math.min((budget.spent / budget.limit) * 100, 100);
  const remaining = budget.limit - budget.spent;
  const isOver = budget.spent > budget.limit;
  const isAlert = pct >= budget.alertThreshold && !isOver;

  const barColor = isOver ? '#ef4444' : isAlert ? '#f59e0b' : 'var(--gold)';

  return (
    <motion.div {...fadeUp(delay)} className="rounded-2xl p-5" style={card}>

      {/* Header do card */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${cat?.color}12` }}>
            <span className="text-base">{cat?.icon}</span>
          </div>
          <div>
            <p className="font-semibold text-[14px]" style={{ color: 'var(--ink-900)' }}>
              {budget.name}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--ink-300)' }}>
              Mensal
            </p>
          </div>
        </div>
        {(isOver || isAlert) && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${
            isOver ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
          }`}>
            <AlertTriangle size={9} />
            {isOver ? 'Excedido' : 'Atenção'}
          </div>
        )}
      </div>

      {/* Valores */}
      <div className="flex justify-between text-xs mb-2">
        <span style={{ color: 'var(--ink-300)' }}>
          Gasto: <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{eur(budget.spent)}</span>
        </span>
        <span style={{ color: 'var(--ink-300)' }}>
          Limite: <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{eur(budget.limit)}</span>
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--ink-100)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.15, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>

      {/* Restante */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium"
          style={{ color: isOver ? '#ef4444' : 'var(--ink-300)' }}>
          {isOver
            ? `Excedido em ${eur(Math.abs(remaining))}`
            : `Disponível: ${eur(remaining)}`}
        </p>
        <p className="text-[11px] font-semibold tabular-nums"
          style={{ color: isOver ? '#ef4444' : isAlert ? '#f59e0b' : 'var(--ink-300)' }}>
          {Math.round(pct)}%
        </p>
      </div>
    </motion.div>
  );
}

export function BudgetsPage() {
  const totalLimit = MOCK_BUDGETS.reduce((s, b) => s + b.limit, 0);
  const totalSpent = MOCK_BUDGETS.reduce((s, b) => s + b.spent, 0);
  const overBudget = MOCK_BUDGETS.filter(b => b.spent > b.limit);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>
            Orçamentos
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
            Controlo de despesas por categoria
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--ink-900)' }}>
          <Plus size={14} />
          Novo Orçamento
        </button>
      </motion.div>

      {/* Resumo global */}
      <motion.div {...fadeUp(0.05)} className="rounded-2xl p-5" style={card}>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--ink-300)' }}>
              Orçamentado
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--ink-900)' }}>
              {eur(totalLimit)}
            </p>
          </div>
          <div className="text-center" style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--ink-300)' }}>
              Gasto
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--ink-900)' }}>
              {eur(totalSpent)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--ink-300)' }}>
              Excedidas
            </p>
            <p className={`text-xl font-bold ${overBudget.length > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {overBudget.length}
            </p>
          </div>
        </div>

        {/* Barra geral */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'var(--ink-300)' }}>Utilização total</span>
            <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>
              {Math.min(Math.round((totalSpent / totalLimit) * 100), 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-100)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%` }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: overBudget.length > 0 ? '#ef4444' : 'var(--gold)' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Alerta se houver categorias excedidas */}
      {overBudget.length > 0 && (
        <motion.div {...fadeUp(0.08)}
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {overBudget.length} {overBudget.length === 1 ? 'categoria excedida' : 'categorias excedidas'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>
              {overBudget.map(b => CATEGORIES[b.categoryId]?.name).join(', ')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Grid de orçamentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MOCK_BUDGETS.map((budget, i) => (
          <BudgetCard key={budget.id} budget={budget} delay={0.10 + i * 0.05} />
        ))}
      </div>
    </div>
  );
}
