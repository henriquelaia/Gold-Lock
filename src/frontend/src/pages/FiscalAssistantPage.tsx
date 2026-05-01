import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain, TrendingDown, AlertTriangle,
  ChevronRight, CheckCircle2, Loader2, RefreshCw, Sparkles,
} from 'lucide-react';
import { useFiscalAssistant, useTrainFiscalModels } from '../hooks/useFiscalAssistant';
import type { FiscalScenario, CategoryPrediction, DeductionRecommendation } from '../hooks/useFiscalAssistant';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] },
});

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '1rem',
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  saude: 'Saúde',
  educacao: 'Educação',
  habitacao: 'Habitação',
  restauracao: 'Restauração',
  ppr: 'PPR',
};

const DEDUCTION_TYPE_LABELS: Record<string, string> = {
  saude_dedutivel: 'Saúde',
  educacao_dedutivel: 'Educação',
  habitacao_dedutivel: 'Habitação',
  encargos_gerais_dedutivel: 'Encargos Gerais',
  ppr_dedutivel: 'PPR',
  nao_dedutivel: 'Não dedutível',
};

// ── Score Card ────────────────────────────────────────────────────────────────

function ScoreCard({ score, badge, optimizationPotential, marginalRate }: {
  score: number;
  badge: string;
  optimizationPotential: number;
  marginalRate: number;
}) {
  const badgeColors: Record<string, { bg: string; text: string }> = {
    'Expert':          { bg: '#10B981', text: 'white' },
    'Otimizado':       { bg: '#22C55E', text: 'white' },
    'Em Progresso':    { bg: '#F59E0B', text: 'white' },
    'Não Otimizado':   { bg: '#EF4444', text: 'white' },
  };
  const bc = badgeColors[badge] ?? badgeColors['Em Progresso'];
  const pct = Math.min(100, score);
  const color = score >= 66 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <motion.div {...fadeUp(0.04)} className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: 'var(--ink-900)', minHeight: 160 }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            Score Fiscal 2024
          </p>
          <div className="flex items-end gap-2">
            <span className="text-[48px] font-black leading-none text-white tabular-nums">{score}</span>
            <span className="text-xl font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>/100</span>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold mt-1"
          style={{ background: bc.bg, color: bc.text }}>
          {badge}
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        />
      </div>

      <div className="flex gap-4">
        <div>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Potencial</p>
          <p className="text-sm font-bold text-white">+{eur(optimizationPotential)}</p>
        </div>
        <div>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Taxa Marginal</p>
          <p className="text-sm font-bold text-white">{marginalRate}%</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

function ScenariosCard({ scenarios }: { scenarios: FiscalScenario[] }) {
  const navigate = useNavigate();
  const nonBaseline = scenarios.filter(s => s.scenario_id !== 'baseline');
  const baseline = scenarios.find(s => s.scenario_id === 'baseline');

  return (
    <motion.div {...fadeUp(0.10)} className="p-5" style={card}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-4"
        style={{ color: 'var(--ink-300)' }}>
        Cenários de Otimização
      </p>

      {baseline && (
        <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--ink-400)' }}>Situação actual</span>
            <span className="font-semibold tabular-nums"
              style={{ color: baseline.new_result < 0 ? '#22c55e' : '#ef4444' }}>
              {baseline.new_result >= 0 ? '+' : ''}{eur(baseline.new_result)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {nonBaseline.slice(0, 4).map((s) => (
          <div key={s.scenario_id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(34,197,94,0.1)' }}>
              <TrendingDown size={14} style={{ color: '#22c55e' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--ink-800)' }}>
                  {s.label}
                </p>
                <span className="text-xs font-bold shrink-0 tabular-nums" style={{ color: '#22c55e' }}>
                  -{eur(s.tax_saving_eur)}
                </span>
              </div>
              {s.actions[0] && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-400)' }}>
                  {s.actions[0]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {nonBaseline.length === 0 && (
        <div className="text-center py-6">
          <CheckCircle2 size={28} style={{ color: '#22c55e', margin: '0 auto 8px' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--ink-400)' }}>
            Perfil fiscal já optimizado
          </p>
        </div>
      )}

      <button
        onClick={() => navigate('/irs')}
        className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
        style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
        Ver no Simulador IRS
        <ChevronRight size={12} />
      </button>
    </motion.div>
  );
}

// ── Predictions ───────────────────────────────────────────────────────────────

function PredictionsCard({ predictions }: { predictions: Record<string, CategoryPrediction> }) {
  return (
    <motion.div {...fadeUp(0.14)} className="p-5" style={card}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-4"
        style={{ color: 'var(--ink-300)' }}>
        Previsão Fim-de-Ano
      </p>
      <div className="space-y-4">
        {Object.entries(predictions).map(([cat, pred]) => {
          const pct = Math.min(100, Math.round((pred.predicted_year_end / pred.limit_expense) * 100));
          const barColor = pred.will_reach_limit ? '#22c55e' : pct > 40 ? 'var(--gold)' : '#94a3b8';
          const isAtRisk = pred.predicted_year_end > pred.limit_expense;

          return (
            <div key={cat}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--ink-700)' }}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  {isAtRisk && <AlertTriangle size={11} style={{ color: '#f59e0b' }} />}
                </div>
                <span className="text-xs tabular-nums" style={{ color: 'var(--ink-500)' }}>
                  {eur(pred.predicted_year_end)} / {eur(pred.limit_expense)}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-100)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--ink-300)' }}>
                {pred.alert}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Deduction Recommendations ─────────────────────────────────────────────────

function DeductionsCard({ recommendations }: { recommendations: DeductionRecommendation[] }) {
  const dedutible = recommendations.filter(r => r.is_deductible).slice(0, 8);

  return (
    <motion.div {...fadeUp(0.18)} className="p-5" style={card}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--ink-300)' }}>
          Deduções Identificadas
        </p>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
          {recommendations.filter(r => r.is_deductible).length} dedutíveis
        </span>
      </div>

      {dedutible.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--ink-300)' }}>
          Nenhuma transação dedutível identificada este ano
        </p>
      ) : (
        <div className="space-y-2">
          {dedutible.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5"
              style={{ borderBottom: i < dedutible.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ink-800)' }}>
                  {r.merchant}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--ink-400)' }}>
                  {DEDUCTION_TYPE_LABELS[r.deduction_type] ?? r.deduction_type} · {r.legal_article}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--ink-800)' }}>
                  {eur(r.amount)}
                </p>
                <p className="text-[11px] font-medium" style={{ color: '#22c55e' }}>
                  -{eur(r.estimated_deduction_eur)}
                </p>
              </div>
              <div className="w-10 text-right shrink-0">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: r.confidence > 0.85 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    color: r.confidence > 0.85 ? '#22c55e' : '#f59e0b',
                  }}>
                  {Math.round(r.confidence * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ h = 'h-32', className = '' }: { h?: string; className?: string }) {
  return (
    <div className={`rounded-2xl animate-pulse ${h} ${className}`}
      style={{ background: 'var(--border)' }} />
  );
}

// ── Not Trained Banner ────────────────────────────────────────────────────────

function NotTrainedBanner({ onTrain, isTraining }: { onTrain: () => void; isTraining: boolean }) {
  return (
    <motion.div {...fadeUp(0.04)} className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: 'rgba(201,162,39,0.06)', border: '1px solid var(--gold-border)' }}>
      <Sparkles size={24} style={{ color: 'var(--gold)', flexShrink: 0 }} />
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
          Modelos de IA ainda não treinados
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-400)' }}>
          Corre <code className="font-mono">python scripts/generate_training_data.py</code> e depois clica em Treinar.
        </p>
      </div>
      <button
        onClick={onTrain}
        disabled={isTraining}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-opacity disabled:opacity-50"
        style={{ background: 'var(--ink-900)', color: 'white' }}>
        {isTraining ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
        {isTraining ? 'A treinar…' : 'Treinar agora'}
      </button>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FiscalAssistantPage() {
  const { data, isLoading, isError, refetch } = useFiscalAssistant();
  const trainMutation = useTrainFiscalModels();

  const notTrained = data?.meta && !data.meta.deduction_agent_trained;

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--ink-900)' }}>
              <Brain size={16} color="white" />
            </div>
            <div>
              <h1 className="text-lg font-black" style={{ color: 'var(--ink-900)' }}>
                Assistente Fiscal IA
              </h1>
              <p className="text-xs" style={{ color: 'var(--ink-400)' }}>
                Análise baseada em Machine Learning · OE 2024
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-500)' }}>
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </motion.div>

        {/* Banner: não treinado */}
        {notTrained && (
          <NotTrainedBanner
            onTrain={() => trainMutation.mutate()}
            isTraining={trainMutation.isPending}
          />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton h="h-52" />
            <Skeleton h="h-52" />
            <Skeleton h="h-64" />
            <Skeleton h="h-64" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <motion.div {...fadeUp(0.04)} className="rounded-2xl p-8 text-center" style={card}>
            <AlertTriangle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
              Serviço de IA indisponível
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-400)' }}>
              Verifica se o ml-service está a correr (porta 5000)
            </p>
            <button onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'var(--ink-900)', color: 'white' }}>
              Tentar novamente
            </button>
          </motion.div>
        )}

        {/* Content */}
        {data && !isLoading && (
          <>
            {/* Linha 1: Score + Cenários */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ScoreCard
                score={data.fiscal_score.score}
                badge={data.fiscal_score.badge}
                optimizationPotential={data.fiscal_score.optimization_potential_eur}
                marginalRate={data.fiscal_score.marginal_rate_pct}
              />
              <ScenariosCard scenarios={data.scenarios} />
            </div>

            {/* Linha 2: Previsões + Deduções */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PredictionsCard predictions={data.predictions} />
              <DeductionsCard recommendations={data.deduction_recommendations} />
            </div>

            {/* Score breakdown */}
            <motion.div {...fadeUp(0.22)} className="p-5" style={card}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-4"
                style={{ color: 'var(--ink-300)' }}>
                Breakdown do Score
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(data.fiscal_score.breakdown).map(([key, val]) => {
                  const labels: Record<string, string> = {
                    deduction_coverage: 'Cobertura',
                    limit_utilization: 'Limites',
                    ppr_status: 'PPR',
                    effective_rate: 'Eficiência',
                    bracket_proximity: 'Escalão',
                  };
                  const pct = (val / 20) * 100;
                  return (
                    <div key={key} className="text-center">
                      <div className="relative w-12 h-12 mx-auto mb-1">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none"
                            stroke="var(--border)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="14" fill="none"
                            stroke={pct >= 75 ? '#22c55e' : pct >= 40 ? 'var(--gold)' : '#ef4444'}
                            strokeWidth="3"
                            strokeDasharray={`${pct * 0.88} 88`}
                            strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black"
                          style={{ color: 'var(--ink-900)' }}>
                          {val}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium" style={{ color: 'var(--ink-400)' }}>
                        {labels[key] ?? key}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Meta info */}
            <motion.div {...fadeUp(0.26)} className="flex flex-wrap gap-3 text-[11px]"
              style={{ color: 'var(--ink-300)' }}>
              <span>{data.meta.transactions_analysed} transações analisadas</span>
              <span>·</span>
              <span>{data.meta.deductible_found} dedutíveis encontradas</span>
              <span>·</span>
              <span>Modelo: {data.meta.deduction_agent_trained ? 'treinado' : 'não treinado'}</span>
              {!data.meta.predictor_trained && <><span>·</span><span>Previsor: extrapolação linear</span></>}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
