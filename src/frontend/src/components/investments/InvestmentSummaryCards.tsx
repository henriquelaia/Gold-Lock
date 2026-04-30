import { motion } from 'framer-motion';
import { Shield, Flame, Minus, Loader2 } from 'lucide-react';

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

const RISK_CONFIG = {
  guaranteed: { label: 'Garantido', color: '#10B981', bg: 'rgba(16,185,129,0.10)', Icon: Shield },
  moderate:   { label: 'Moderado',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', Icon: Minus },
  high:       { label: 'Alto',      color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  Icon: Flame },
} as const;

type RiskLevel = keyof typeof RISK_CONFIG;

export interface RiskStat {
  risk: RiskLevel;
  pct: number;
}

interface Props {
  totalPortfolioValue: number;
  totalPL: number;
  totalCost: number;
  hasAnyLivePrice: boolean;
  positionCount: number;
  assetClassCount: number;
  riskStats: RiskStat[];
}

export function InvestmentSummaryCards({
  totalPortfolioValue,
  totalPL,
  totalCost,
  hasAnyLivePrice,
  positionCount,
  assetClassCount,
  riskStats,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Carteira Total */}
      <motion.div {...fadeUp(0.06)} className="rounded-2xl p-5 flex flex-col justify-between"
        style={{ background: 'var(--ink-900)', minHeight: 130 }}>
        <span className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          Carteira Total
        </span>
        <div>
          <p className="text-[26px] font-black text-white tabular-nums leading-none">
            {eur(totalPortfolioValue)}
          </p>
          <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {positionCount} posições · {assetClassCount} classes de ativos
            {hasAnyLivePrice && ' · cotações live'}
          </p>
        </div>
      </motion.div>

      {/* Rentabilidade Total (P&L) */}
      <motion.div {...fadeUp(0.10)} className="rounded-2xl p-5 flex flex-col justify-between" style={card}>
        <span className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--ink-300)' }}>
          Rentabilidade Total
        </span>
        <div>
          {!hasAnyLivePrice ? (
            <>
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--ink-300)' }} />
                <p className="text-[22px] font-black tabular-nums leading-none"
                  style={{ color: 'var(--ink-400)' }}>—</p>
              </div>
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--ink-300)' }}>
                A carregar cotações…
              </p>
            </>
          ) : (
            <>
              <p className="text-[22px] font-black tabular-nums leading-none"
                style={{ color: totalPL >= 0 ? '#22c55e' : '#ef4444' }}>
                {totalPL >= 0 ? '+' : ''}{eur(totalPL)}
              </p>
              <p className="text-xs mt-1.5 font-medium"
                style={{ color: totalPL >= 0 ? '#22c55e' : '#ef4444' }}>
                {totalCost > 0 ? `${((totalPL / totalCost) * 100).toFixed(2)}%` : ''} · preço real
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Por Nível de Risco */}
      <motion.div {...fadeUp(0.14)} className="rounded-2xl p-5" style={card}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--ink-300)' }}>
          Por Nível de Risco
        </p>
        <div className="space-y-2">
          {riskStats.map(({ risk, pct }) => {
            const cfg = RISK_CONFIG[risk];
            return (
              <div key={risk} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                  style={{ background: cfg.bg }}>
                  <cfg.Icon size={11} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--ink-700)' }}>
                      {cfg.label}
                    </span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'var(--ink-100)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cfg.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
