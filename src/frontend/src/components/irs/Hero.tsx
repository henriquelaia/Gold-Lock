import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, Percent, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export interface HeroAction {
  label: string;
  amount: number;
  cta: string;
  onClick: () => void;
}

export interface HeroProps {
  result: number; // negativo = reembolso, positivo = a pagar (mantém convenção do backend irsCalculator)
  optimizationPotentialEur: number;
  score: number;
  scoreBadge: string;
  marginalRatePct: number;
  monthsRemaining: number;
  action?: HeroAction;
  loadingFooter?: ReactNode;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

export function Hero({
  result,
  optimizationPotentialEur,
  score,
  scoreBadge,
  marginalRatePct,
  monthsRemaining,
  action,
  loadingFooter,
}: HeroProps) {
  const isRefund = result <= 0;
  const refundAmount = Math.abs(result);

  return (
    <motion.div
      {...fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--ink-900)', color: 'white' }}
    >
      <div className="px-6 pt-6 pb-5">
        <div
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest mb-2.5"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <Calendar size={11} />
          IRS 2026 · ano fiscal corrente
        </div>

        <div className="flex items-baseline gap-3.5">
          <span
            className="text-[52px] font-black leading-none tabular-nums"
            style={{ color: 'var(--gold)', letterSpacing: '-1px' }}
          >
            {isRefund ? '+' : '−'}{eur(refundAmount)}
          </span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {isRefund ? 'vais receber' : 'vais pagar'}
          </span>
        </div>

        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {isRefund ? 'prevista entrega entre 1 abr e 30 jun de 2027' : 'pagamento estimado entre 1 abr e 30 ago de 2027'}
          {optimizationPotentialEur > 0 && (
            <>
              {' · podes ainda ganhar '}
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                +{eur(optimizationPotentialEur)} extra
              </span>
            </>
          )}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <KpiTile
            icon={<ShieldCheck size={10} />}
            label="Score Fiscal"
            value={
              <>
                {score}
                <small className="text-[10px] font-medium ml-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>/100</small>
                <span
                  className="text-[9px] font-bold ml-1.5"
                  style={{ color: 'var(--gold)' }}
                >
                  {scoreBadge.toUpperCase()}
                </span>
              </>
            }
          />
          <KpiTile
            icon={<Percent size={10} />}
            label="Taxa marginal"
            value={`${marginalRatePct.toFixed(1).replace('.', ',')}%`}
          />
          <KpiTile
            icon={<Clock size={10} />}
            label="Faltam"
            value={`${monthsRemaining} ${monthsRemaining === 1 ? 'mês' : 'meses'}`}
          />
        </div>
      </div>

      {(action || loadingFooter) && (
        <>
          <div className="h-px mx-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="px-6 py-4 flex items-center gap-3">
            {loadingFooter ?? (action && <ActionFooter action={action} />)}
          </div>
        </>
      )}
    </motion.div>
  );
}

function KpiTile({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div
        className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        {icon}
        {label}
      </div>
      <div className="text-base font-bold mt-1 text-white tabular-nums leading-tight">
        {value}
      </div>
    </div>
  );
}

function ActionFooter({ action }: { action: HeroAction }) {
  return (
    <>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(201,162,39,0.15)', color: 'var(--gold)' }}
      >
        <Sparkles size={18} />
      </div>
      <div className="flex-1 text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>
        <p
          className="text-[9px] uppercase tracking-wider mb-0.5"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          Próxima ação · maior poupança
        </p>
        <span style={{ color: 'white', fontWeight: 700 }}>{action.label}</span>
        {' — poupas '}
        <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{eur(action.amount)}</span>
      </div>
      <button
        type="button"
        onClick={action.onClick}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 shrink-0"
        style={{ background: 'var(--gold)', color: 'var(--ink-900)' }}
      >
        {action.cta}
        <ArrowRight size={12} />
      </button>
    </>
  );
}
