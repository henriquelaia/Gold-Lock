import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useGoals, useCreateGoal, useDeleteGoal, useDepositGoal } from '../hooks/useGoals';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { toast } from '../store/toastStore';

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

const GOAL_ICONS = ['🎯','✈️','🏠','💻','🚗','🏖️','📚','💍','🎓','🛡️'];
const GOAL_COLORS = ['var(--gold)','#0C8CE8','#22C55E','#F59E0B','#8B5CF6','#EC4899','#EF4444'];

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  icon?: string;
  color?: string;
}

function CircleProgress({ pct, color, size = 76 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={7} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

function GoalCard({ goal, delay }: { goal: Goal; delay: number }) {
  const { mutate: del, isPending: isDeleting } = useDeleteGoal();
  const { mutate: deposit, isPending: isDepositing } = useDepositGoal();
  const [depositAmount, setDepositAmount] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const target = Number(goal.target_amount);
  const current = Number(goal.current_amount);
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = target - current;
  const isDone = pct >= 100;
  const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null;
  const isUrgent = daysLeft !== null && daysLeft < 30 && !isDone;
  const goalColor = goal.color || 'var(--gold)';

  function handleDeposit() {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) { toast.error('Introduz um valor válido maior que zero'); return; }
    deposit({ id: goal.id, amount: amt }, {
      onSuccess: () => { setDepositAmount(''); setShowDeposit(false); },
    });
  }

  return (
    <>
    <motion.div {...fadeUp(delay)} className="rounded-2xl p-5"
      style={{ ...card, ...(isDone ? { borderColor: 'rgba(34,197,94,0.25)' } : {}) }}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <CircleProgress pct={pct} color={isDone ? '#22c55e' : goalColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg">{goal.icon || '🎯'}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-[14px] truncate" style={{ color: 'var(--ink-900)' }}>{goal.name}</p>
            {isDone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700 shrink-0">✓ Concluída</span>}
            {isUrgent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 shrink-0">⚡ Urgente</span>}
            <button onClick={() => setConfirmDelete(true)} className="ml-auto p-1 rounded-lg opacity-20 hover:opacity-60 transition-opacity">
              <X size={11} style={{ color: 'var(--ink-900)' }} />
            </button>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--ink-100)' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, delay: delay + 0.15 }}
              className="h-full rounded-full" style={{ background: isDone ? '#22c55e' : goalColor }} />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--ink-300)' }}>
              {eur(current)}<span style={{ color: 'var(--ink-100)' }}> / </span>{eur(target)}
            </span>
            <span className={`font-semibold ${isUrgent ? 'text-amber-600' : ''}`}
              style={{ color: isUrgent ? undefined : 'var(--ink-300)' }}>
              {isDone ? '🎉 Meta atingida!'
                : daysLeft === null ? `${Math.round(pct)}%`
                : daysLeft > 0 ? `${daysLeft}d restantes`
                : 'Prazo expirado'}
            </span>
          </div>
        </div>
      </div>

      {!isDone && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {showDeposit ? (
            <div className="flex items-center gap-2">
              <input type="number" min="0.01" step="0.01" value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="Valor (€)"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
              <button onClick={handleDeposit} disabled={isDepositing}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: goalColor }}>
                {isDepositing ? <Loader2 size={12} className="animate-spin" /> : 'OK'}
              </button>
              <button onClick={() => setShowDeposit(false)} className="px-3 py-2 rounded-xl text-xs"
                style={{ color: 'var(--ink-400)' }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-300)' }}>Falta poupar</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ink-900)' }}>{eur(remaining)}</p>
              </div>
              {goal.deadline && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-300)' }}>Prazo</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ink-900)' }}>
                    {format(parseISO(goal.deadline), 'MMM yyyy', { locale: pt })}
                  </p>
                </div>
              )}
              <button onClick={() => setShowDeposit(true)}
                className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-80"
                style={{ background: goalColor }}>
                Adicionar
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
    <ConfirmDialog
      open={confirmDelete}
      title="Apagar meta"
      description="Esta ação é permanente e não pode ser desfeita."
      isLoading={isDeleting}
      onConfirm={() => { del(goal.id); setConfirmDelete(false); }}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  );
}

function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const { mutate: create, isPending } = useCreateGoal();
  const [form, setForm] = useState({
    name: '', targetAmount: '', deadline: '', icon: '🎯', color: 'var(--gold)',
  });
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.targetAmount) { setError('Nome e valor objetivo são obrigatórios'); return; }
    create(
      { name: form.name, targetAmount: Number(form.targetAmount), deadline: form.deadline || undefined, icon: form.icon, color: form.color },
      { onSuccess: onClose, onError: () => setError('Erro ao criar meta') }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,16,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--ink-900)' }}>Nova Meta</h2>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--ink-400)' }} /></button>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Nome</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Fundo de Emergência"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Objetivo (€)</label>
            <input type="number" min="1" step="0.01" value={form.targetAmount}
              onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Prazo (opcional)</label>
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Ícone</label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className="w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all"
                  style={{ background: form.icon === ic ? 'rgba(201,162,39,0.12)' : 'var(--ink-50)',
                    border: form.icon === ic ? '1.5px solid var(--gold)' : '1px solid var(--border)' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Cor</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--ink-900)' }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isPending ? 'A criar…' : 'Criar Meta'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals();
  const [showCreate, setShowCreate] = useState(false);

  const totalTarget = goals.reduce((s: number, g: Goal) => s + Number(g.target_amount), 0);
  const totalSaved  = goals.reduce((s: number, g: Goal) => s + Number(g.current_amount), 0);
  const completed   = goals.filter((g: Goal) => Number(g.current_amount) >= Number(g.target_amount)).length;
  const overallPct  = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <>
      <AnimatePresence>
        {showCreate && <CreateGoalModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>

      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <motion.div {...fadeUp(0)} className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>Metas de Poupança</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-300)' }}>Acompanha os teus objetivos financeiros</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--ink-900)' }}>
            <Plus size={14} />
            Nova Meta
          </button>
        </motion.div>

        {goals.length > 0 && (
          <motion.div {...fadeUp(0.05)} className="rounded-2xl p-5" style={card}>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-300)' }}>Total Poupado</p>
                <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{eur(totalSaved)}</p>
              </div>
              <div className="text-center" style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-300)' }}>Total Objetivo</p>
                <p className="text-xl font-bold" style={{ color: 'var(--ink-900)' }}>{eur(totalTarget)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-300)' }}>Concluídas</p>
                <p className="text-xl font-bold text-green-600">{completed}/{goals.length}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div className="flex justify-between text-xs mb-2">
                <span style={{ color: 'var(--ink-300)' }}>Progresso global</span>
                <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{overallPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-100)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                  className="h-full rounded-full" style={{ background: 'var(--gold)' }} />
              </div>
            </div>
          </motion.div>
        )}

        {goals.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Sem metas definidas"
            description="Define a tua primeira meta de poupança e começa a acompanhar o progresso."
            action={{ label: 'Criar Meta', onClick: () => setShowCreate(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {goals.map((goal: Goal, i: number) => (
              <GoalCard key={goal.id} goal={goal} delay={0.08 + i * 0.06} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
