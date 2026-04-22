import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { MOCK_GOALS } from '../data/mock';

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

// Progresso circular SVG
function CircleProgress({ pct, color, size = 76 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--ink-100)" strokeWidth={7} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

function GoalCard({ goal, delay }: { goal: typeof MOCK_GOALS[0]; delay: number }) {
  const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const daysLeft = differenceInDays(parseISO(goal.deadline), new Date());
  const isDone = pct >= 100;
  const isUrgent = daysLeft < 30 && !isDone;

  return (
    <motion.div {...fadeUp(delay)}
      className="rounded-2xl p-5"
      style={{ ...card, ...(isDone ? { borderColor: 'rgba(34,197,94,0.25)' } : {}) }}>

      <div className="flex items-center gap-4">
        {/* Progresso circular */}
        <div className="relative shrink-0">
          <CircleProgress pct={pct} color={isDone ? '#22c55e' : goal.color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg">{goal.icon}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-[14px] truncate" style={{ color: 'var(--ink-900)' }}>
              {goal.name}
            </p>
            {isDone && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700 shrink-0">
                ✓ Concluída
              </span>
            )}
            {isUrgent && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 shrink-0">
                ⚡ Urgente
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--ink-100)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, delay: delay + 0.15 }}
              className="h-full rounded-full"
              style={{ background: isDone ? '#22c55e' : goal.color }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--ink-300)' }}>
              {eur(goal.currentAmount)}
              <span style={{ color: 'var(--ink-100)' }}> / </span>
              {eur(goal.targetAmount)}
            </span>
            <span className={`font-semibold ${isUrgent ? 'text-amber-600' : ''}`}
              style={{ color: isUrgent ? undefined : 'var(--ink-300)' }}>
              {isDone ? '🎉 Meta atingida!' : daysLeft > 0 ? `${daysLeft}d restantes` : 'Prazo expirado'}
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      {!isDone && (
        <div className="mt-4 pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-300)' }}>
              Falta poupar
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ink-900)' }}>
              {eur(remaining)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-300)' }}>
              Prazo
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ink-900)' }}>
              {format(parseISO(goal.deadline), "MMM yyyy", { locale: pt })}
            </p>
          </div>
          <button className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-80"
            style={{ background: goal.color }}>
            Adicionar
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function GoalsPage() {
  const totalTarget = MOCK_GOALS.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = MOCK_GOALS.reduce((s, g) => s + g.currentAmount, 0);
  const completed = MOCK_GOALS.filter(g => g.currentAmount >= g.targetAmount).length;
  const overallPct = Math.round((totalSaved / totalTarget) * 100);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>
            Metas de Poupança
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
            Acompanha os teus objetivos financeiros
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--ink-900)' }}>
          <Plus size={14} />
          Nova Meta
        </button>
      </motion.div>

      {/* Resumo */}
      <motion.div {...fadeUp(0.05)} className="rounded-2xl p-5" style={card}>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--ink-300)' }}>
              Total Poupado
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>
              {eur(totalSaved)}
            </p>
          </div>
          <div className="text-center" style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--ink-300)' }}>
              Total Objetivo
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--ink-900)' }}>
              {eur(totalTarget)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--ink-300)' }}>
              Concluídas
            </p>
            <p className="text-xl font-bold text-green-600">
              {completed}/{MOCK_GOALS.length}
            </p>
          </div>
        </div>

        {/* Barra geral */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'var(--ink-300)' }}>Progresso global</span>
            <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{overallPct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-100)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'var(--gold)' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Metas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MOCK_GOALS.map((goal, i) => (
          <GoalCard key={goal.id} goal={goal} delay={0.08 + i * 0.06} />
        ))}
      </div>
    </div>
  );
}
