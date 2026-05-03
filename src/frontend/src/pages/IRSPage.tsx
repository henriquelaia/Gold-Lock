import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  AlertTriangle, Brain, Calculator, Calendar, ChevronDown, CheckCircle2, Download,
  Edit3, FileBarChart, GraduationCap, HeartPulse, Home as HomeIcon, Info, Loader2,
  PiggyBank, RefreshCw, Save, Search, ShoppingBag, Sparkles, Target, TrendingDown,
  Utensils, X, Zap, BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  useSimulateIRSPreview, useSaveSimulation,
  useIRSSimulations, useDeleteSimulation,
  useDeductionAlerts, useConfirmDeductionAlert,
  type SimulateInput, type SimulationListItem, type DeductionAlert,
} from '../hooks/useIRS';
import { useFiscalProfile, useUpsertFiscalProfile } from '../hooks/useFiscalProfile';
import {
  useFiscalAssistant, useTrainFiscalModels,
  type FiscalScenario, type NextYearLesson, type KeepDoingItem,
} from '../hooks/useFiscalAssistant';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Hero, type HeroAction } from '../components/irs/Hero';
import { ActionCard, type ActionTag } from '../components/irs/ActionCard';
import { FiscalChatTrigger, FiscalChatDrawer } from '../components/irs/FiscalChat';

// ── Helpers ──────────────────────────────────────────────────────────────

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const eurInt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const pct = (v: number) => `${v.toFixed(2)}%`;

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '1rem',
} as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const DEDUCTION_UI = {
  saude:       { rate: 0.15, limit: 1000, label: 'Saúde (art.º 78.º-C)',           article: '15%, limite 1.000 €' },
  educacao:    { rate: 0.30, limit: 800,  label: 'Educação (art.º 78.º-D)',        article: '30%, limite 800 €' },
  habitacao:   { rate: 0.15, limit: 296,  label: 'Habitação/Juros (art.º 78.º-E)', article: '15%, limite 296 €' },
  restauracao: { rate: 0.15, limit: 250,  label: 'Restauração (art.º 78.º-B)',     article: '15%, limite 250 €' },
  ppr:         { rate: 0.20, limit: 400,  label: 'PPR (art.º 21.º EBF)',           article: '20%, até 400 € (≤34 anos)' },
} as const;

const BRACKETS_2026_UI = [
  { min: 0,      max: 8342,   rate: 12.50 },
  { min: 8342,   max: 12587,  rate: 15.70 },
  { min: 12587,  max: 17838,  rate: 21.20 },
  { min: 17838,  max: 23089,  rate: 24.10 },
  { min: 23089,  max: 29397,  rate: 31.10 },
  { min: 29397,  max: 43090,  rate: 34.90 },
  { min: 43090,  max: 46567,  rate: 43.10 },
  { min: 46567,  max: 86634,  rate: 44.60 },
  { min: 86634,  max: Infinity, rate: 48.00 },
];

const DEDUCTION_TYPE_LABELS: Record<string, string> = {
  saude_dedutivel:           'Saúde',
  educacao_dedutivel:        'Educação',
  habitacao_dedutivel:       'Habitação',
  encargos_gerais_dedutivel: 'Encargos Gerais',
  ppr_dedutivel:             'PPR',
  nao_dedutivel:             'Não Dedutível',
};

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles, PiggyBank, HeartPulse, GraduationCap, Calendar, Utensils,
  Home: HomeIcon, ShoppingBag, CheckCircle2,
};

const SCENARIO_ICON: Record<string, LucideIcon> = {
  ppr_max:         PiggyBank,
  ppr_plus_saude:  PiggyBank,
  max_saude:       HeartPulse,
  max_educacao:    GraduationCap,
  irs_jovem:       Sparkles,
  married_joint:   Sparkles,
  married_separate: Sparkles,
  optimal:         Sparkles,
};

const SCENARIO_TAGS: Record<string, ActionTag[]> = {
  ppr_max:        [{ kind: 'deadline', label: 'URGENTE · 31/12' }, { kind: 'law', label: 'Art. 21.º EBF' }],
  ppr_plus_saude: [{ kind: 'deadline', label: 'URGENTE · 31/12' }, { kind: 'law', label: 'Art. 21.º EBF' }],
  max_saude:      [{ kind: 'law', label: 'Art. 78.º-C CIRS' }],
  max_educacao:   [{ kind: 'law', label: 'Art. 78.º-D CIRS' }],
  irs_jovem:      [{ kind: 'urgent', label: 'DECISÃO ÚNICA' }, { kind: 'law', label: 'Art. 12.º-B CIRS' }],
};

const DEFAULT_FORM: SimulateInput = {
  grossIncome:                 24000,
  maritalStatus:               'single',
  dependents:                  0,
  socialSecurityContributions: 2640,
  withholdingTax:              3800,
  irsJovem:                    false,
  yearsWorking:                1,
  parentHouseholdIncome:       0,
  parentMaritalStatus:         'married',
  parentOtherDependents:       0,
  deductions:                  { saude: 0, educacao: 0, habitacao: 0, restauracao: 0, ppr: 0 },
};

// Limite legal "ser dependente" — art.º 13.º n.º 4 CIRS (espelha RMMG_2026_ANUAL no Python)
const RMMG_2026_ANUAL = 12180;
const DEPENDENT_AGE_MAX = 25;

type Tab = 'optimize' | 'edit' | 'details';

// ── Página ───────────────────────────────────────────────────────────────

export function IRSPage() {
  const [tab, setTab] = useState<Tab>('optimize');
  const [form, setForm] = useState<SimulateInput>(DEFAULT_FORM);
  const [chatOpen, setChatOpen] = useState(false);

  const debouncedForm = useDebouncedValue(form, 300);

  const { data: fiscalProfile } = useFiscalProfile();
  const { mutate: upsertProfile, isPending: isSavingProfile } = useUpsertFiscalProfile();
  const { data: result, isFetching: isCalculating } = useSimulateIRSPreview(debouncedForm);
  const { mutate: saveSimulation, isPending: isSavingSim } = useSaveSimulation();
  const { data: assistant, isLoading: assistantLoading, isError: assistantError, refetch } = useFiscalAssistant();
  const trainMutation = useTrainFiscalModels();

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || !fiscalProfile) return;
    applyProfileToForm();
    hasInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalProfile]);

  // Default tab: Editar se perfil incompleto, Otimizar caso contrário
  useEffect(() => {
    if (hasInitialized.current && fiscalProfile && !fiscalProfile.gross_income_annual) {
      setTab('edit');
    }
  }, [fiscalProfile]);

  function applyProfileToForm() {
    if (!fiscalProfile) return;
    setForm(f => ({
      ...f,
      grossIncome:                 Number(fiscalProfile.gross_income_annual           ?? f.grossIncome),
      socialSecurityContributions: Number(fiscalProfile.social_security_contributions ?? f.socialSecurityContributions),
      maritalStatus:               (fiscalProfile.marital_status as SimulateInput['maritalStatus']) ?? f.maritalStatus,
      dependents:                  Number(fiscalProfile.dependents      ?? f.dependents),
      withholdingTax:              Number(fiscalProfile.withholding_tax ?? f.withholdingTax),
      age:                         fiscalProfile.age != null ? Number(fiscalProfile.age) : f.age,
      irsJovem:                    fiscalProfile.is_irs_jovem ?? f.irsJovem,
      yearsWorking:                fiscalProfile.years_working != null ? Number(fiscalProfile.years_working) : f.yearsWorking,
      parentHouseholdIncome:       Number(fiscalProfile.parent_household_income ?? f.parentHouseholdIncome ?? 0),
      parentMaritalStatus:         (fiscalProfile.parent_marital_status as SimulateInput['parentMaritalStatus']) ?? f.parentMaritalStatus,
      parentOtherDependents:       Number(fiscalProfile.parent_other_dependents ?? f.parentOtherDependents ?? 0),
      deductions: {
        ...f.deductions,
        ppr: Number(fiscalProfile.ppr_contributions ?? f.deductions.ppr),
      },
    }));
  }

  function saveProfile() {
    upsertProfile({
      grossIncomeAnnual:           form.grossIncome,
      socialSecurityContributions: form.socialSecurityContributions,
      maritalStatus:               form.maritalStatus,
      dependents:                  form.dependents,
      withholdingTax:              form.withholdingTax,
      pprContributions:            form.deductions.ppr,
      age:                         form.age,
      isIrsJovem:                  form.irsJovem,
      yearsWorking:                form.yearsWorking,
      parentHouseholdIncome:       form.parentHouseholdIncome,
      parentMaritalStatus:         form.parentMaritalStatus,
      parentOtherDependents:       form.parentOtherDependents,
    });
  }

  // Hero data
  const score = assistant?.fiscal_score.score ?? 0;
  const scoreBadge = assistant?.fiscal_score.badge ?? '—';
  const marginalRate = assistant?.fiscal_score.marginal_rate_pct
    || result?.marginalRate
    || 0;
  const optimizationPotential = assistant?.fiscal_score.optimization_potential_eur ?? 0;
  const monthsRemaining = useMemo(() => {
    const now = new Date();
    return 12 - (now.getMonth() + 1);
  }, []);

  // Hero next action — pega na maior poupança dos this_year_actions
  const heroAction: HeroAction | undefined = useMemo(() => {
    const top = assistant?.this_year_actions?.[0];
    if (!top) return undefined;
    return {
      label: top.label,
      amount: top.tax_saving_eur,
      cta: 'Aplicar',
      onClick: () => setTab('optimize'),
    };
  }, [assistant]);

  const notTrained = assistant?.meta && !assistant.meta.deduction_agent_trained;
  const optimizeCount = (assistant?.this_year_actions?.length ?? 0);
  const lessonsCount = (assistant?.next_year_lessons?.length ?? 0);
  const keepCount = (assistant?.keep_doing?.length ?? 0);

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--ink-900)' }}>
              <Calculator size={16} color="white" />
            </div>
            <div>
              <h1 className="text-lg font-black" style={{ color: 'var(--ink-900)' }}>IRS 2026</h1>
              <p className="text-xs" style={{ color: 'var(--ink-500)' }}>
                Escalões OE 2026 (Lei 73-A/2025) · Análise IA · Art.º 68.º CIRS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fiscalProfile && (
              <button onClick={applyProfileToForm}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
                <Download size={12} />
                Carregar perfil
              </button>
            )}
            <button onClick={() => refetch()} disabled={assistantLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-500)' }}>
              <RefreshCw size={11} className={assistantLoading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </motion.div>

        {/* Banner: não treinado */}
        {notTrained && (
          <motion.div {...fadeUp(0.04)} className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: 'rgba(201,162,39,0.06)', border: '1px solid var(--gold-border)' }}>
            <Sparkles size={24} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
                Modelos de IA ainda não treinados
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-500)' }}>
                Carrega para treinar com os dados sintéticos OE 2026.
              </p>
            </div>
            <button onClick={() => trainMutation.mutate()} disabled={trainMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-opacity disabled:opacity-50"
              style={{ background: 'var(--ink-900)', color: 'white' }}>
              {trainMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
              {trainMutation.isPending ? 'A treinar…' : 'Treinar agora'}
            </button>
          </motion.div>
        )}

        {/* Hero (sempre visível) */}
        <Hero
          result={result?.result ?? 0}
          optimizationPotentialEur={optimizationPotential}
          score={score}
          scoreBadge={scoreBadge}
          marginalRatePct={marginalRate}
          monthsRemaining={monthsRemaining}
          action={heroAction}
          loadingFooter={
            assistantLoading
              ? <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>A analisar oportunidades…</p>
              : undefined
          }
        />

        {/* Tabs */}
        <Tabs
          tab={tab}
          setTab={setTab}
          counts={{ optimize: optimizeCount, lessons: lessonsCount, keep: keepCount }}
        />

        {/* Conteúdo por tab */}
        <AnimatePresence mode="wait">
          {tab === 'optimize' && (
            <motion.div key="optimize" {...fadeUp(0)} className="space-y-1">
              <OptimizeTab
                actions={assistant?.this_year_actions ?? []}
                lessons={assistant?.next_year_lessons ?? []}
                keepDoing={assistant?.keep_doing ?? []}
                loading={assistantLoading}
                error={assistantError}
                onSwitchToEdit={() => setTab('edit')}
              />
            </motion.div>
          )}

          {tab === 'edit' && (
            <motion.div key="edit" {...fadeUp(0)} className="space-y-4">
              <EditTab
                form={form}
                setForm={setForm}
                result={result}
                isCalculating={isCalculating}
                isSavingSim={isSavingSim}
                isSavingProfile={isSavingProfile}
                onSave={() => saveSimulation(form)}
                onSaveProfile={saveProfile}
                onLoadProfile={fiscalProfile ? applyProfileToForm : undefined}
              />
            </motion.div>
          )}

          {tab === 'details' && (
            <motion.div key="details" {...fadeUp(0)} className="space-y-4">
              <DetailsTab result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat IA — botão flutuante + drawer */}
      <FiscalChatTrigger onOpen={() => setChatOpen(true)} />
      <FiscalChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────

function Tabs({
  tab, setTab, counts,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  counts: { optimize: number; lessons: number; keep: number };
}) {
  const items: Array<{ id: Tab; icon: LucideIcon; label: string; count?: number }> = [
    { id: 'optimize', icon: Target, label: 'Otimizar', count: counts.optimize },
    { id: 'edit',     icon: Edit3,  label: 'Editar dados' },
    { id: 'details',  icon: Search, label: 'Detalhes' },
  ];

  return (
    <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {items.map(item => {
        const active = tab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: active ? 'var(--gold-subtle)' : 'transparent',
              color: active ? 'var(--gold)' : 'var(--ink-500)',
            }}
          >
            <Icon size={13} />
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: active ? 'rgba(201,162,39,0.2)' : 'rgba(0,0,0,0.05)',
                  color: active ? 'var(--gold)' : 'var(--ink-500)',
                }}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Tab Otimizar ─────────────────────────────────────────────────────────

function OptimizeTab({
  actions, lessons, keepDoing, loading, error, onSwitchToEdit,
}: {
  actions: FiscalScenario[];
  lessons: NextYearLesson[];
  keepDoing: KeepDoingItem[];
  loading: boolean;
  error: boolean;
  onSwitchToEdit: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-8 text-center" style={card}>
        <AlertTriangle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
          Serviço de IA indisponível
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-500)' }}>
          Verifica se o ml-service está a correr (porta 5000).
        </p>
      </div>
    );
  }

  const empty = actions.length === 0 && lessons.length === 0 && keepDoing.length === 0;
  if (empty) {
    return (
      <div className="rounded-2xl p-8" style={card}>
        <EmptyState
          icon={Calculator}
          title="Sem dados suficientes"
          description="Preenche o teu perfil fiscal no separador Editar dados para receberes recomendações."
          action={{ label: 'Ir para Editar', onClick: onSwitchToEdit }}
        />
      </div>
    );
  }

  return (
    <>
      {/* Ainda dá tempo */}
      {actions.length > 0 && (
        <>
          <SectionHeader icon={Zap} color="var(--gold)" label="Ainda dá tempo para o IRS 2026" />
          {actions.map((s, i) => (
            <ActionCard
              key={s.scenario_id}
              variant="urgent"
              icon={SCENARIO_ICON[s.scenario_id] ?? Sparkles}
              title={s.label}
              description={s.actions[0] ?? 'Cenário recomendado pelo motor fiscal.'}
              tags={SCENARIO_TAGS[s.scenario_id]}
              amount={s.tax_saving_eur}
              primaryCta={{ label: 'Aplicar na simulação', onClick: onSwitchToEdit }}
              delay={i * 0.04}
            />
          ))}
        </>
      )}

      {/* Lições */}
      {lessons.length > 0 && (
        <>
          <SectionHeader icon={BookOpen} color="#2563eb" label="Lições para o IRS 2027 — corrigir já em janeiro" />
          {lessons.map((l, i) => (
            <ActionCard
              key={l.id}
              variant="lesson"
              icon={ICON_MAP[l.icon] ?? Calendar}
              title={l.title}
              description={l.description}
              delay={i * 0.04}
            />
          ))}
        </>
      )}

      {/* Manter */}
      {keepDoing.length > 0 && (
        <>
          <SectionHeader icon={CheckCircle2} color="#15803d" label="Estás a fazer bem — não mudes" />
          {keepDoing.map((k, i) => (
            <ActionCard
              key={k.id}
              variant="keep"
              icon={ICON_MAP[k.icon] ?? CheckCircle2}
              title={k.title}
              description={k.description}
              delay={i * 0.04}
            />
          ))}
        </>
      )}
    </>
  );
}

function SectionHeader({ icon: Icon, color, label }: { icon: LucideIcon; color: string; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 mt-5 mb-2.5 px-1 text-[11px] font-bold uppercase tracking-wider"
      style={{ color }}
    >
      <Icon size={13} />
      {label}
    </div>
  );
}

// ── Tab Editar ───────────────────────────────────────────────────────────

function EditTab({
  form, setForm, result, isCalculating, isSavingSim, isSavingProfile,
  onSave, onSaveProfile, onLoadProfile,
}: {
  form: SimulateInput;
  setForm: (f: (prev: SimulateInput) => SimulateInput) => void;
  result: ReturnType<typeof useSimulateIRSPreview>['data'];
  isCalculating: boolean;
  isSavingSim: boolean;
  isSavingProfile: boolean;
  onSave: () => void;
  onSaveProfile: () => void;
  onLoadProfile?: () => void;
}) {
  const setDed = (key: keyof SimulateInput['deductions'], val: number) =>
    setForm(f => ({ ...f, deductions: { ...f.deductions, [key]: val } }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 space-y-4">

        <motion.section {...fadeUp(0.05)} className="rounded-2xl p-5 space-y-4" style={card}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>
            Rendimento (Categoria A)
          </h2>

          <Field label="Rendimento Bruto Anual" value={form.grossIncome}
            onChange={v => setForm(f => ({
              ...f, grossIncome: v,
              socialSecurityContributions: Math.round(v * 0.11),
            }))} />

          <Field label="Contribuições Segurança Social"
            sub="Trabalhador paga 11% — calculado automaticamente"
            value={form.socialSecurityContributions}
            onChange={v => setForm(f => ({ ...f, socialSecurityContributions: v }))} />

          <Field label="Retenções na Fonte (total retido no ano)" value={form.withholdingTax}
            onChange={v => setForm(f => ({ ...f, withholdingTax: v }))} />

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-500)' }}>
              Idade
            </label>
            <p className="text-[10px] mb-1.5" style={{ color: 'var(--ink-500)', opacity: 0.6 }}>
              Necessária para IRS Jovem e limites PPR por escalão etário
            </p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
              <input type="number" min={0} max={120}
                value={form.age ?? ''}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setForm(f => ({ ...f, age: Number.isFinite(v) && v > 0 ? Math.min(v, 120) : undefined }));
                }}
                className="flex-1 bg-transparent text-sm font-semibold outline-none"
                style={{ color: 'var(--ink-900)' }}
                placeholder="—" />
              <span className="text-xs shrink-0" style={{ color: 'var(--ink-500)', opacity: 0.5 }}>anos</span>
            </div>
          </div>

          {/* IRS Jovem */}
          <div className="rounded-xl p-3 space-y-3"
            style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--ink-900)' }}>
                  IRS Jovem (art.º 12.º-B CIRS)
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-500)' }}>
                  ≤ 35 anos · até 10 anos após fim de estudos
                </p>
              </div>
              <button type="button"
                onClick={() => setForm(f => ({ ...f, irsJovem: !f.irsJovem }))}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.irsJovem ? 'bg-[var(--gold)]' : 'bg-[var(--ink-500)]/20'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.irsJovem ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            {form.irsJovem && (
              <select
                value={form.yearsWorking ?? 1}
                onChange={e => setForm(f => ({ ...f, yearsWorking: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid var(--gold-border)', color: 'var(--ink-900)' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => {
                  const rate = n === 1 ? 100 : n <= 4 ? 75 : n <= 7 ? 50 : 25;
                  return <option key={n} value={n}>Ano {n} — {rate}% isenção</option>;
                })}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Estado Civil" value={form.maritalStatus}
              onChange={v => setForm(f => ({ ...f, maritalStatus: v as SimulateInput['maritalStatus'] }))}>
              <option value="single">Solteiro(a)</option>
              <option value="married">Casado(a)</option>
              <option value="divorced">Divorciado(a)</option>
              <option value="widowed">Viúvo(a)</option>
            </Select>
            <Select label="Dependentes" value={String(form.dependents)}
              onChange={v => setForm(f => ({ ...f, dependents: Number(v) }))}>
              {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'dependente' : 'dependentes'}</option>)}
            </Select>
          </div>
        </motion.section>

        <motion.section {...fadeUp(0.10)} className="rounded-2xl p-5 space-y-4" style={card}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>Deduções à Coleta</h2>
            <Info size={13} style={{ color: 'var(--ink-500)', opacity: 0.5 }} />
          </div>
          {(Object.entries(DEDUCTION_UI) as Array<[keyof SimulateInput['deductions'], typeof DEDUCTION_UI[keyof typeof DEDUCTION_UI]]>).map(([key, info]) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-500)' }}>
                {info.label}
              </label>
              <p className="text-[10px] mb-1.5" style={{ color: 'var(--gold)', opacity: 0.7 }}>{info.article}</p>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
                <span className="text-xs shrink-0" style={{ color: 'var(--ink-500)', opacity: 0.6 }}>€</span>
                <input type="number" min={0} value={form.deductions[key] || ''}
                  onChange={e => setDed(key, parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-transparent text-sm font-semibold outline-none"
                  style={{ color: 'var(--ink-900)' }}
                  placeholder="0" />
                <span className="text-[10px] font-semibold shrink-0" style={{ color: '#16a34a' }}>
                  -{eur(Math.min(form.deductions[key] * info.rate, info.limit))}
                </span>
              </div>
            </div>
          ))}
        </motion.section>

        <FamilySection form={form} setForm={setForm} />
      </div>

      <div className="lg:col-span-2 space-y-3">
        <ResultCard result={result} isCalculating={isCalculating} />

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onSave} disabled={!result || isSavingSim}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--ink-900)' }}>
            {isSavingSim ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {isSavingSim ? 'A guardar…' : 'Guardar simulação'}
          </button>
          <button onClick={onSaveProfile} disabled={isSavingProfile}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
            {isSavingProfile ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Guardar perfil
          </button>
        </div>

        {onLoadProfile && (
          <button onClick={onLoadProfile}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-500)' }}>
            <Download size={11} />
            Carregar do perfil fiscal
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, sub, value, onChange }: {
  label: string; sub?: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-500)' }}>
        {label}
      </label>
      {sub && <p className="text-[10px] mb-1.5" style={{ color: 'var(--ink-500)', opacity: 0.6 }}>{sub}</p>}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
        <span className="text-xs shrink-0" style={{ color: 'var(--ink-500)', opacity: 0.5 }}>€</span>
        <input
          type="number" min={0} value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent text-sm font-semibold outline-none"
          style={{ color: 'var(--ink-900)' }}
          placeholder="0"
        />
      </div>
    </div>
  );
}

function Select({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-500)' }}>
        {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold outline-none"
        style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)', color: 'var(--ink-900)' }}>
        {children}
      </select>
    </div>
  );
}

function FamilySection({
  form, setForm,
}: {
  form: SimulateInput;
  setForm: (f: (prev: SimulateInput) => SimulateInput) => void;
}) {
  const eligible =
    form.age != null &&
    form.age <= DEPENDENT_AGE_MAX &&
    form.grossIncome <= RMMG_2026_ANUAL;

  // Não mostra se utilizador não é elegível e não há dados preenchidos —
  // evita poluir o form para utilizadores fora da janela legal.
  if (!eligible && !form.parentHouseholdIncome) return null;

  return (
    <motion.section {...fadeUp(0.15)} className="rounded-2xl p-5 space-y-4" style={card}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>
            Família — incluir com pais (opcional)
          </h2>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-500)' }}>
            Compara IRS Jovem sozinho vs. ser dependente · art.º 13.º n.º 4 CIRS
          </p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
          style={{
            background: eligible ? 'var(--gold-subtle)' : 'rgba(0,0,0,0.05)',
            color: eligible ? 'var(--gold)' : 'var(--ink-500)',
          }}
        >
          {eligible ? 'Elegível' : 'Não elegível'}
        </span>
      </div>

      {!eligible && (
        <p className="text-xs" style={{ color: 'var(--ink-500)' }}>
          Para seres dependente fiscal precisas de ter ≤ 25 anos e rendimento bruto anual
          ≤ €{RMMG_2026_ANUAL.toLocaleString('pt-PT')} (RMMG × 14).
        </p>
      )}

      <Field
        label="Rendimento bruto anual dos pais"
        sub="Soma dos rendimentos do agregado dos pais (Cat. A)"
        value={form.parentHouseholdIncome ?? 0}
        onChange={v => setForm(f => ({ ...f, parentHouseholdIncome: v }))}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Estado civil dos pais"
          value={form.parentMaritalStatus ?? 'married'}
          onChange={v => setForm(f => ({ ...f, parentMaritalStatus: v as SimulateInput['parentMaritalStatus'] }))}
        >
          <option value="married">Casados</option>
          <option value="single">Solteiro(a)</option>
          <option value="divorced">Divorciado(a)</option>
          <option value="widowed">Viúvo(a)</option>
        </Select>
        <Select
          label="Outros dependentes"
          value={String(form.parentOtherDependents ?? 0)}
          onChange={v => setForm(f => ({ ...f, parentOtherDependents: Number(v) }))}
        >
          {[0, 1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>{n} {n === 1 ? 'irmão/ã' : 'irmãos'}</option>
          ))}
        </Select>
      </div>

      <p className="text-[10px]" style={{ color: 'var(--ink-500)', opacity: 0.7 }}>
        Se a poupança agregada for &gt; €50, a comparação aparece como cenário em "Otimizar".
      </p>
    </motion.section>
  );
}

function ResultCard({
  result, isCalculating,
}: {
  result: ReturnType<typeof useSimulateIRSPreview>['data'];
  isCalculating: boolean;
}) {
  const isRefund = (result?.result ?? 0) <= 0;
  const refundAmount = Math.abs(result?.result ?? 0);

  return (
    <motion.div {...fadeUp(0.15)}
      className="rounded-2xl p-6 text-center relative"
      style={{
        background: isRefund
          ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.05) 100%)',
        border: isRefund ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.20)',
      }}>
      {isCalculating && <Loader2 size={11} className="absolute top-3 right-3 animate-spin opacity-40" />}
      <p className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: isRefund ? '#15803d' : '#dc2626' }}>
        {isRefund ? 'Reembolso Estimado' : 'Pagamento Estimado'}
      </p>
      {result ? (
        <motion.p key={result.result}
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black"
          style={{ color: isRefund ? '#15803d' : '#dc2626' }}>
          {isRefund ? '+' : '−'}{eur(refundAmount)}
        </motion.p>
      ) : (
        <div className="h-10 mx-auto w-32 rounded-md animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
      )}
      <p className="text-xs mt-2" style={{ color: isRefund ? 'rgba(21,128,61,0.6)' : 'rgba(220,38,38,0.6)' }}>
        {isRefund ? 'A receber da AT' : 'A pagar à AT'}
      </p>
    </motion.div>
  );
}

// ── Tab Detalhes ─────────────────────────────────────────────────────────

function DetailsTab({ result }: { result: ReturnType<typeof useSimulateIRSPreview>['data'] }) {
  const [showBrackets, setShowBrackets] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  return (
    <>
      {result && <BreakdownCard result={result} />}

      <motion.div {...fadeUp(0.10)} className="rounded-2xl overflow-hidden" style={card}>
        <button onClick={() => setShowBrackets(s => !s)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-bold transition-colors hover:bg-black/[0.02]"
          style={{ color: 'var(--ink-900)' }}>
          <span className="flex items-center gap-2">
            <TrendingDown size={13} style={{ color: 'var(--gold)' }} />
            Escalões IRS 2026
          </span>
          <ChevronDown size={14} className={`transition-transform ${showBrackets ? 'rotate-180' : ''}`}
            style={{ color: 'var(--ink-500)', opacity: 0.5 }} />
        </button>
        <AnimatePresence>
          {showBrackets && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden">
              <div className="px-5 pb-4 space-y-1">
                {BRACKETS_2026_UI.map((b, i) => {
                  const taxable = result?.collectableIncome ?? 0;
                  const isActive = taxable > b.min && taxable <= (b.max === Infinity ? Infinity : b.max);
                  return (
                    <div key={i} className={`flex justify-between text-xs px-2 py-1.5 rounded-lg ${isActive ? 'font-bold' : ''}`}
                      style={{ background: isActive ? 'var(--gold-subtle)' : 'transparent', color: isActive ? 'var(--gold)' : 'var(--ink-500)' }}>
                      <span>{eurInt(b.min)} — {b.max === Infinity ? '∞' : eurInt(b.max)}</span>
                      <span>{b.rate}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <SimulationHistory show={showHistory} onToggle={() => setShowHistory(s => !s)} />
      <DeductionAlertsSection />
    </>
  );
}

function BreakdownCard({ result }: { result: NonNullable<ReturnType<typeof useSimulateIRSPreview>['data']> }) {
  return (
    <motion.div {...fadeUp(0.05)} className="rounded-2xl p-5 space-y-3" style={card}>
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ink-900)' }}>
        Detalhes do Cálculo
      </h3>
      {[
        { label: 'Rendimento Bruto', value: eur(result.grossIncome), color: 'var(--ink-900)' },
        ...(result.irsJovemExemption > 0
          ? [{ label: 'IRS Jovem — Isenção (art.º 12.º-B)', value: `−${eur(result.irsJovemExemption)}`, color: '#f59e0b' }]
          : []),
        { label: 'Dedução Específica (Cat. A)', value: `−${eur(result.specificDeduction)}`, color: '#ef4444' },
        { label: 'Rendimento Coletável', value: eur(result.collectableIncome), color: 'var(--ink-900)', bold: true },
        { label: `Imposto Bruto (escalão ${result.bracket.rate.toFixed(2)}%)`, value: `−${eur(result.grossTax)}`, color: '#ef4444' },
        { label: 'Total Deduções à Coleta', value: `+${eur(result.deductions.total)}`, color: '#22c55e' },
        { label: 'Coleta Líquida (IRS a pagar)', value: eur(result.netTax), color: 'var(--ink-900)', bold: true },
        { label: 'Retenções na Fonte', value: `+${eur(result.withholding)}`, color: '#22c55e' },
      ].map((row, i) => (
        <div key={i} className={`flex justify-between items-center text-xs ${row.bold ? 'py-1 border-t border-black/[0.06] mt-1' : ''}`}>
          <span style={{ color: 'var(--ink-500)' }}>{row.label}</span>
          <span className={`font-${row.bold ? 'bold' : 'semibold'} tabular-nums`} style={{ color: row.color }}>
            {row.value}
          </span>
        </div>
      ))}
      <div className="pt-2 border-t border-black/[0.06]">
        <div className="flex justify-between items-center text-xs">
          <span style={{ color: 'var(--ink-500)' }}>Taxa Efetiva</span>
          <span className="font-bold" style={{ color: 'var(--gold)' }}>{pct(result.effectiveRate)}</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(result.effectiveRate, 48)}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full" style={{ background: 'var(--gold)' }} />
        </div>
      </div>
    </motion.div>
  );
}

function SimulationHistory({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  const { data: simulations = [], isLoading } = useIRSSimulations();
  const { mutate: removeSimulation, isPending: isDeleting } = useDeleteSimulation();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...simulations].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [simulations],
  );

  return (
    <>
      <ConfirmDialog
        open={confirmId !== null}
        title="Eliminar simulação"
        description="Esta ação é permanente."
        isLoading={isDeleting}
        onConfirm={() => { if (confirmId) removeSimulation(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
      <motion.div {...fadeUp(0.15)} className="rounded-2xl overflow-hidden" style={card}>
        <button onClick={onToggle}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-colors hover:bg-black/[0.02]"
          style={{ color: 'var(--ink-900)' }}>
          <span className="flex items-center gap-2">
            <FileBarChart size={14} style={{ color: 'var(--gold)' }} />
            Histórico de Simulações
            {simulations.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                {simulations.length}
              </span>
            )}
          </span>
          <ChevronDown size={14} className={`transition-transform ${show ? 'rotate-180' : ''}`}
            style={{ color: 'var(--ink-500)', opacity: 0.5 }} />
        </button>
        <AnimatePresence>
          {show && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden">
              <div className="px-3 pb-3">
                {isLoading ? (
                  <div className="space-y-2 px-2">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(0,0,0,0.04)' }} />
                    ))}
                  </div>
                ) : sorted.length === 0 ? (
                  <div className="px-2">
                    <EmptyState
                      icon={Calculator}
                      title="Sem simulações guardadas"
                      description="Clica em &quot;Guardar simulação&quot; no separador Editar dados para começares o teu histórico."
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sorted.map(sim => (
                      <HistoryRow key={sim.id} sim={sim} onDelete={(id) => setConfirmId(id)} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function HistoryRow({ sim, onDelete }: { sim: SimulationListItem; onDelete: (id: string) => void }) {
  const finalResult = Number(sim.final_result);
  const isRefund = finalResult <= 0;
  const date = format(parseISO(sim.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt });
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.02] transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--gold-subtle)' }}>
        <Calculator size={14} style={{ color: 'var(--gold)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink-900)' }}>
          {eur(Number(sim.gross_income))} · {sim.dependents} {sim.dependents === 1 ? 'dependente' : 'dependentes'}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-500)', opacity: 0.7 }}>{date}</p>
      </div>
      <p className={`text-sm font-bold tabular-nums shrink-0 ${isRefund ? 'text-green-600' : 'text-red-600'}`}>
        {isRefund ? '+' : '−'}{eur(Math.abs(finalResult))}
      </p>
      <button onClick={() => onDelete(sim.id)}
        className="p-1 rounded-lg opacity-30 hover:opacity-70 transition-opacity"
        aria-label="Eliminar simulação">
        <X size={12} style={{ color: 'var(--ink-900)' }} />
      </button>
    </div>
  );
}

function DeductionAlertsSection() {
  const { data: alerts = [], isLoading } = useDeductionAlerts();
  const { mutate: confirm, isPending } = useConfirmDeductionAlert();
  const [show, setShow] = useState(false);

  return (
    <motion.div {...fadeUp(0.20)} className="rounded-2xl overflow-hidden" style={card}>
      <button onClick={() => setShow(s => !s)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-colors hover:bg-black/[0.02]"
        style={{ color: 'var(--ink-900)' }}>
        <span className="flex items-center gap-2">
          <Info size={14} style={{ color: 'var(--gold)' }} />
          Alertas de Dedução
          {alerts.length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
              style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
              {alerts.length}
            </span>
          )}
        </span>
        <ChevronDown size={14} className={`transition-transform ${show ? 'rotate-180' : ''}`}
          style={{ color: 'var(--ink-500)', opacity: 0.5 }} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-3 pb-3">
              {isLoading ? (
                <div className="space-y-2 px-2">
                  {[0,1,2].map(i => (
                    <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(0,0,0,0.04)' }} />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="px-2">
                  <EmptyState
                    icon={Info}
                    title="Sem alertas pendentes"
                    description="Quando o classificador ML identificar transações dedutíveis, aparecem aqui para confirmação."
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  {alerts.map(alert => (
                    <AlertRow key={alert.id} alert={alert}
                      onConfirm={(id, type) => confirm({ id, confirmedType: type })}
                      isPending={isPending} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AlertRow({ alert, onConfirm, isPending }: {
  alert: DeductionAlert;
  onConfirm: (id: string, type: string) => void;
  isPending: boolean;
}) {
  const confidence = Number(alert.ml_confidence ?? 0);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.02] transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink-900)' }}>
          {alert.description ?? '(transação removida)'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
            {DEDUCTION_TYPE_LABELS[alert.deduction_type] ?? alert.deduction_type}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--ink-500)', opacity: 0.7 }}>
            ML {Math.round(confidence * 100)}% · dedução estimada {eur(Number(alert.estimated_deduction ?? 0))}
          </span>
        </div>
      </div>
      <p className="text-xs font-bold tabular-nums shrink-0" style={{ color: 'var(--ink-900)' }}>
        {eur(Number(alert.amount))}
      </p>
      <button onClick={() => onConfirm(alert.id, alert.deduction_type)}
        disabled={isPending}
        className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: 'var(--ink-900)' }}>
        Confirmar
      </button>
    </div>
  );
}
