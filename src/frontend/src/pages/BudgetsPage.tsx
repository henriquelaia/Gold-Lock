import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useBudgets, useCreateBudget, useDeleteBudget } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useTransactions';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

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

interface Budget {
  id: string;
  category_id?: string;
  name: string;
  amount_limit: number;
  spent: number;
  period: string;
  alert_threshold: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

function BudgetCard({ budget, delay, onDelete }: { budget: Budget; delay: number; onDelete: (id: string) => void }) {
  const limit = Number(budget.amount_limit);
  const spent = Number(budget.spent || 0);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const remaining = limit - spent;
  const isOver = spent > limit;
  const isAlert = pct >= budget.alert_threshold && !isOver;
  const barColor = isOver ? '#ef4444' : isAlert ? '#f59e0b' : 'var(--gold)';

  return (
    <motion.div {...fadeUp(delay)} className="rounded-2xl p-5" style={card}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${budget.category_color || '#9E9E9E'}18` }}>
            <span className="text-base">{budget.category_icon || '•'}</span>
          </div>
          <div>
            <p className="font-semibold text-[14px]" style={{ color: 'var(--ink-900)' }}>{budget.name}</p>
            <p className="text-[11px]" style={{ color: 'var(--ink-300)' }}>
              {budget.category_name || 'Geral'} · Mensal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isOver || isAlert) && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${
              isOver ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <AlertTriangle size={9} />
              {isOver ? 'Excedido' : 'Atenção'}
            </div>
          )}
          <button onClick={() => onDelete(budget.id)}
            className="p-1 rounded-lg opacity-30 hover:opacity-70 transition-opacity">
            <X size={12} style={{ color: 'var(--ink-900)' }} />
          </button>
        </div>
      </div>

      <div className="flex justify-between text-xs mb-2">
        <span style={{ color: 'var(--ink-300)' }}>
          Gasto: <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{eur(spent)}</span>
        </span>
        <span style={{ color: 'var(--ink-300)' }}>
          Limite: <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{eur(limit)}</span>
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--ink-100)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.15, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: isOver ? '#ef4444' : 'var(--ink-300)' }}>
          {isOver ? `Excedido em ${eur(Math.abs(remaining))}` : `Disponível: ${eur(remaining)}`}
        </p>
        <p className="text-[11px] font-semibold tabular-nums"
          style={{ color: isOver ? '#ef4444' : isAlert ? '#f59e0b' : 'var(--ink-300)' }}>
          {Math.round(pct)}%
        </p>
      </div>
    </motion.div>
  );
}

function CreateBudgetModal({ onClose }: { onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const { mutate: create, isPending } = useCreateBudget();
  const [form, setForm] = useState({
    name: '', categoryId: '', amountLimit: '', alertThreshold: '80',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.amountLimit) { setError('Nome e limite são obrigatórios'); return; }
    if (Number(form.amountLimit) <= 0) { setError('O limite deve ser maior que zero'); return; }
    create(
      {
        name: form.name,
        categoryId: form.categoryId || undefined,
        amountLimit: Number(form.amountLimit),
        alertThreshold: Number(form.alertThreshold),
        startDate: form.startDate,
        period: 'monthly',
      },
      { onSuccess: onClose, onError: () => setError('Erro ao criar orçamento') }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,16,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--ink-900)' }}>Novo Orçamento</h2>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--ink-400)' }} /></button>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Nome</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Supermercado"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Categoria</label>
            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}>
              <option value="">Sem categoria</option>
              {categories.filter((c: { is_expense: boolean }) => c.is_expense).map((c: { id: string; name_pt: string }) => (
                <option key={c.id} value={c.id}>{c.name_pt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Limite Mensal (€)</label>
            <input type="number" min="1" step="0.01" value={form.amountLimit}
              onChange={e => setForm(f => ({ ...f, amountLimit: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>
              Alerta em (%) — actual: {form.alertThreshold}%
            </label>
            <input type="range" min="50" max="100" step="5" value={form.alertThreshold}
              onChange={e => setForm(f => ({ ...f, alertThreshold: e.target.value }))}
              className="w-full accent-[var(--gold)]" />
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--ink-900)' }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isPending ? 'A criar…' : 'Criar Orçamento'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function BudgetsPage() {
  const { data: budgets = [], isLoading } = useBudgets();
  const { mutate: deleteBudget, isPending: isDeleting } = useDeleteBudget();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalLimit = budgets.reduce((s: number, b: Budget) => s + Number(b.amount_limit), 0);
  const totalSpent = budgets.reduce((s: number, b: Budget) => s + Number(b.spent || 0), 0);
  const overBudget = budgets.filter((b: Budget) => Number(b.spent || 0) > Number(b.amount_limit));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <>
      <AnimatePresence>
        {showCreate && <CreateBudgetModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
      <ConfirmDialog
        open={deleteId !== null}
        title="Apagar orçamento"
        description="Esta ação é permanente e não pode ser desfeita."
        isLoading={isDeleting}
        onConfirm={() => { if (deleteId) deleteBudget(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />

      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <motion.div {...fadeUp(0)} className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>Orçamentos</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-300)' }}>Controlo de despesas por categoria</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--ink-900)' }}>
            <Plus size={14} />
            Novo Orçamento
          </button>
        </motion.div>

        {budgets.length > 0 && (
          <motion.div {...fadeUp(0.05)} className="rounded-2xl p-5" style={card}>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-300)' }}>Orçamentado</p>
                <p className="text-xl font-bold" style={{ color: 'var(--ink-900)' }}>{eur(totalLimit)}</p>
              </div>
              <div className="text-center" style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-300)' }}>Gasto</p>
                <p className="text-xl font-bold" style={{ color: 'var(--ink-900)' }}>{eur(totalSpent)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-300)' }}>Excedidas</p>
                <p className={`text-xl font-bold ${overBudget.length > 0 ? 'text-red-500' : 'text-green-600'}`}>{overBudget.length}</p>
              </div>
            </div>

            {totalLimit > 0 && (
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
            )}
          </motion.div>
        )}

        {overBudget.length > 0 && (
          <motion.div {...fadeUp(0.08)} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {overBudget.length} {overBudget.length === 1 ? 'categoria excedida' : 'categorias excedidas'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>
                {overBudget.map((b: Budget) => b.category_name || b.name).join(', ')}
              </p>
            </div>
          </motion.div>
        )}

        {budgets.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Sem orçamentos"
            description="Cria o teu primeiro orçamento para controlar as despesas por categoria."
            action={{ label: 'Criar Orçamento', onClick: () => setShowCreate(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {budgets.map((budget: Budget, i: number) => (
              <BudgetCard key={budget.id} budget={budget} delay={0.10 + i * 0.05}
                onDelete={(id) => setDeleteId(id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
