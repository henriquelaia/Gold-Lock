import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, ChevronDown, Info, TrendingDown,
  Save, Download, Loader2, X, FileBarChart, Brain,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  useSimulateIRSPreview, useSaveSimulation,
  useIRSSimulations, useDeleteSimulation,
  useDeductionAlerts, useConfirmDeductionAlert,
  type SimulateInput, type SimulationListItem, type DeductionAlert,
} from '../hooks/useIRS';
import { useFiscalProfile, useUpsertFiscalProfile } from '../hooks/useFiscalProfile';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

// ── Helpers ──────────────────────────────────────

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const pct = (v: number) => `${v.toFixed(2)}%`;

// Metadados UI das deduções (paridade com backend `services/irsCalculator.ts:DEDUCTION_LIMITS_2024`)
const DEDUCTION_UI = {
  saude:       { rate: 0.15, limit: 1000, label: 'Saúde (art.º 78.º-C)',           article: '15%, limite 1.000 €' },
  educacao:    { rate: 0.30, limit: 800,  label: 'Educação (art.º 78.º-D)',        article: '30%, limite 800 €' },
  habitacao:   { rate: 0.15, limit: 296,  label: 'Habitação/Juros (art.º 78.º-E)', article: '15%, limite 296 €' },
  restauracao: { rate: 0.15, limit: 250,  label: 'Restauração (art.º 78.º-B)',     article: '15%, limite 250 €' },
  ppr:         { rate: 0.20, limit: 400,  label: 'PPR (art.º 21.º EBF)',           article: '20%, até 400 €' },
} as const;

const BRACKETS_2024_UI = [
  { min: 0,      max: 7703,   rate: 13.25 },
  { min: 7703,   max: 11623,  rate: 18.00 },
  { min: 11623,  max: 16472,  rate: 23.00 },
  { min: 16472,  max: 21321,  rate: 26.00 },
  { min: 21321,  max: 27146,  rate: 32.75 },
  { min: 27146,  max: 39791,  rate: 37.00 },
  { min: 39791,  max: 51997,  rate: 43.50 },
  { min: 51997,  max: 81199,  rate: 45.00 },
  { min: 81199,  max: Infinity, rate: 48.00 },
];

const DEDUCTION_TYPE_LABELS: Record<string, string> = {
  saude_dedutivel:           'Saúde',
  educacao_dedutivel:        'Educação',
  habitacao_dedutivel:       'Habitação',
  encargos_gerais_dedutivel: 'Encargos Gerais',
  ppr_dedutivel:             'PPR',
  nao_dedutivel:             'Não Dedutível',
};

// ── Componentes auxiliares ────────────────────────

function Field({ label, sub, value, onChange, prefix = '€' }: {
  label: string; sub?: string; value: number; onChange: (v: number) => void; prefix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--ink-500)]/60 mb-1.5">{label}</label>
      {sub && <p className="text-[10px] text-[var(--ink-500)]/40 mb-1.5">{sub}</p>}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
        <span className="text-xs text-[var(--ink-500)]/50 shrink-0">{prefix}</span>
        <input
          type="number"
          min={0}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent text-sm font-semibold text-[var(--ink-900)] outline-none"
          placeholder="0"
        />
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────

const DEFAULT_FORM: SimulateInput = {
  grossIncome:                 24000,
  maritalStatus:               'single',
  dependents:                  0,
  socialSecurityContributions: 2640,
  withholdingTax:              3800,
  deductions:                  { saude: 0, educacao: 0, habitacao: 0, restauracao: 0, ppr: 0 },
};

export function IRSSimulatorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SimulateInput>(DEFAULT_FORM);
  const [showBrackets, setShowBrackets] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [deleteSimulationId, setDeleteSimulationId] = useState<string | null>(null);

  // Debounce do form para evitar storms ao backend
  const debouncedForm = useDebouncedValue(form, 300);

  const { data: fiscalProfile } = useFiscalProfile();
  const { mutate: upsertProfile, isPending: isSavingProfile } = useUpsertFiscalProfile();
  const { data: result, isFetching: isCalculating } = useSimulateIRSPreview(debouncedForm);
  const { mutate: saveSimulation, isPending: isSavingSim } = useSaveSimulation();

  // Pré-preencher a partir do fiscal_profile (apenas na primeira render com dados)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || !fiscalProfile) return;
    applyProfileToForm();
    hasInitialized.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    });
  }

  const setDed = (key: keyof SimulateInput['deductions'], val: number) =>
    setForm(f => ({ ...f, deductions: { ...f.deductions, [key]: val } }));

  const isRefund = (result?.result ?? 0) <= 0;
  const refundAmount = Math.abs(result?.result ?? 0);
  const isWorking = isCalculating || isSavingSim;

  return (
    <>
      <ConfirmDialog
        open={deleteSimulationId !== null}
        title="Eliminar simulação"
        description="Esta ação é permanente e não pode ser desfeita."
        onConfirm={() => deleteSimulationId && setDeleteSimulationId(null)}
        onCancel={() => setDeleteSimulationId(null)}
      />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink-900)] flex items-center gap-2">
              <Calculator size={22} className="text-[var(--gold)]" />
              Simulador IRS 2024
            </h1>
            <p className="text-sm text-[var(--ink-500)]/50 mt-0.5">
              Cálculo baseado nos escalões do OE 2024 · Art.º 68.º CIRS
            </p>
          </div>
          <div className="flex items-center gap-2">
            {fiscalProfile && (
              <button onClick={applyProfileToForm}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
                <Download size={12} />
                Carregar perfil
              </button>
            )}
            <button onClick={saveProfile} disabled={isSavingProfile}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--ink-900)' }}>
              {isSavingProfile ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Guardar como perfil
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Formulário — 3 colunas */}
          <div className="lg:col-span-3 space-y-4">

            {/* Rendimento */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h2 className="text-sm font-bold text-[var(--ink-900)]">Rendimento (Categoria A)</h2>

              <Field label="Rendimento Bruto Anual" value={form.grossIncome}
                onChange={v => setForm(f => ({
                  ...f, grossIncome: v,
                  socialSecurityContributions: Math.round(v * 0.11),
                }))} />
              <Field label="Contribuições Segurança Social" sub="Trabalhador paga 11% — calculado automaticamente"
                value={form.socialSecurityContributions}
                onChange={v => setForm(f => ({ ...f, socialSecurityContributions: v }))} />
              <Field label="Retenções na Fonte (total retido no ano)" value={form.withholdingTax}
                onChange={v => setForm(f => ({ ...f, withholdingTax: v }))} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-500)]/60 mb-1.5">Estado Civil</label>
                  <select value={form.maritalStatus}
                    onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value as SimulateInput['maritalStatus'] }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--ink-900)] outline-none"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
                    <option value="single">Solteiro(a)</option>
                    <option value="married">Casado(a)</option>
                    <option value="divorced">Divorciado(a)</option>
                    <option value="widowed">Viúvo(a)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-500)]/60 mb-1.5">Dependentes</label>
                  <select value={form.dependents}
                    onChange={e => setForm(f => ({ ...f, dependents: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--ink-900)] outline-none"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
                    {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'dependente' : 'dependentes'}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Deduções */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--ink-900)]">Deduções à Coleta</h2>
                <Info size={13} className="text-[var(--ink-500)]/30" />
              </div>

              {(Object.entries(DEDUCTION_UI) as Array<[keyof SimulateInput['deductions'], typeof DEDUCTION_UI[keyof typeof DEDUCTION_UI]]>).map(([key, info]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[var(--ink-500)]/60 mb-1">
                    {info.label}
                  </label>
                  <p className="text-[10px] text-[var(--gold)]/60 mb-1.5">{info.article}</p>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
                    <span className="text-xs text-[var(--ink-500)]/50 shrink-0">€</span>
                    <input type="number" min={0} value={form.deductions[key] || ''}
                      onChange={e => setDed(key, parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-transparent text-sm font-semibold text-[var(--ink-900)] outline-none" placeholder="0" />
                    <span className="text-[10px] text-green-600 font-semibold shrink-0">
                      -{eur(Math.min(form.deductions[key] * info.rate, info.limit))}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Resultado — 2 colunas */}
          <div className="lg:col-span-2 space-y-4">

            {/* Card resultado */}
            <ResultCard result={result} isRefund={isRefund} refundAmount={refundAmount} isCalculating={isCalculating} />

            {/* Botões de ação */}
            <div className="flex gap-2">
              <button
                onClick={() => saveSimulation(form)}
                disabled={isWorking || !result}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--ink-900)' }}>
                {isSavingSim ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSavingSim ? 'A guardar…' : 'Guardar'}
              </button>
              <button
                onClick={() => navigate('/fiscal-assistant')}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
                <Brain size={14} />
                IA
              </button>
            </div>

            {/* Breakdown */}
            {result && <BreakdownCard result={result} />}

            {/* Tabela escalões */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <button onClick={() => setShowBrackets(s => !s)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-bold text-[var(--ink-900)] hover:bg-black/[0.02] transition-colors">
                <span className="flex items-center gap-2"><TrendingDown size={13} className="text-[var(--gold)]" />Escalões IRS 2024</span>
                <ChevronDown size={14} className={`text-[var(--ink-500)]/40 transition-transform ${showBrackets ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showBrackets && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden">
                    <div className="px-5 pb-4 space-y-1">
                      {BRACKETS_2024_UI.map((b, i) => {
                        const taxable = result?.collectableIncome ?? 0;
                        const isActive = taxable > b.min && taxable <= (b.max === Infinity ? Infinity : b.max);
                        return (
                          <div key={i} className={`flex justify-between text-xs px-2 py-1.5 rounded-lg ${isActive ? 'font-bold' : ''}`}
                            style={{ background: isActive ? 'var(--gold-subtle)' : 'transparent', color: isActive ? 'var(--gold)' : 'var(--ink-500)' }}>
                            <span>{eur(b.min)} — {b.max === Infinity ? '∞' : eur(b.max)}</span>
                            <span>{b.rate}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Histórico */}
        <SimulationHistory
          show={showHistory}
          onToggle={() => setShowHistory(s => !s)}
          onDelete={(id) => setDeleteSimulationId(id)}
          deleteId={deleteSimulationId}
          onConfirmDelete={() => {/* handled by component */}}
        />

        {/* Alertas dedução */}
        <DeductionAlertsSection />
      </div>
    </>
  );
}

// ── Sub-componentes ──────────────────────────────

function ResultCard({ result, isRefund, refundAmount, isCalculating }: {
  result: ReturnType<typeof useSimulateIRSPreview>['data'];
  isRefund: boolean;
  refundAmount: number;
  isCalculating: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
      className="rounded-2xl p-6 text-center relative"
      style={{
        background: isRefund
          ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.05) 100%)',
        border: isRefund ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.20)',
      }}>
      {isCalculating && (
        <Loader2 size={11} className="absolute top-3 right-3 animate-spin opacity-40" />
      )}
      <p className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: isRefund ? '#15803d' : '#dc2626' }}>
        {isRefund ? '🎉 Reembolso Estimado' : '⚠️ Pagamento Estimado'}
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
      <p className="text-xs mt-2" style={{ color: isRefund ? '#15803d80' : '#dc262680' }}>
        {isRefund ? 'A receber da AT' : 'A pagar à AT'}
      </p>
    </motion.div>
  );
}

function BreakdownCard({ result }: { result: NonNullable<ReturnType<typeof useSimulateIRSPreview>['data']> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}
      className="rounded-2xl p-5 space-y-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h3 className="text-xs font-bold text-[var(--ink-900)] uppercase tracking-widest">Detalhes do Cálculo</h3>

      {[
        { label: 'Rendimento Bruto',                          value: eur(result.grossIncome),                color: 'var(--ink-900)' },
        { label: `Dedução Específica (Cat. A)`,               value: `−${eur(result.specificDeduction)}`,    color: '#ef4444' },
        { label: 'Rendimento Coletável',                      value: eur(result.collectableIncome),          color: 'var(--ink-900)', bold: true },
        { label: `Imposto Bruto (escalão ${result.bracket.rate.toFixed(2)}%)`, value: `−${eur(result.grossTax)}`, color: '#ef4444' },
        { label: 'Total Deduções à Coleta',                   value: `+${eur(result.deductions.total)}`,     color: '#22c55e' },
        { label: 'Coleta Líquida (IRS a pagar)',              value: eur(result.netTax),                     color: 'var(--ink-900)', bold: true },
        { label: 'Retenções na Fonte',                        value: `+${eur(result.withholding)}`,          color: '#22c55e' },
      ].map((row, i) => (
        <div key={i} className={`flex justify-between items-center text-xs ${row.bold ? 'py-1 border-t border-black/[0.06] mt-1' : ''}`}>
          <span className="text-[var(--ink-500)]/60">{row.label}</span>
          <span className={`font-${row.bold ? 'bold' : 'semibold'} tabular-nums`} style={{ color: row.color }}>
            {row.value}
          </span>
        </div>
      ))}

      <div className="pt-2 border-t border-black/[0.06]">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[var(--ink-500)]/60">Taxa Efetiva</span>
          <span className="font-bold text-[var(--gold)]">{pct(result.effectiveRate)}</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${Math.min(result.effectiveRate, 48)}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full bg-[var(--gold)]" />
        </div>
      </div>
    </motion.div>
  );
}

function SimulationHistory({ show, onToggle, onDelete }: {
  show: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  deleteId: string | null;
  onConfirmDelete: () => void;
}) {
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

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <button onClick={onToggle}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-[var(--ink-900)] hover:bg-black/[0.02] transition-colors">
          <span className="flex items-center gap-2">
            <FileBarChart size={14} className="text-[var(--gold)]" />
            Histórico de Simulações
            {simulations.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                {simulations.length}
              </span>
            )}
          </span>
          <ChevronDown size={14} className={`text-[var(--ink-500)]/40 transition-transform ${show ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {show && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden">
              <div className="px-3 pb-3">
                {isLoading ? (
                  <div className="space-y-2 px-2">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(0,0,0,0.04)' }} />
                    ))}
                  </div>
                ) : sorted.length === 0 ? (
                  <div className="px-2">
                    <EmptyState
                      icon={Calculator}
                      title="Sem simulações guardadas"
                      description="Clica em &quot;Guardar simulação&quot; para começares o teu histórico."
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sorted.map(sim => <HistoryRow key={sim.id} sim={sim} onDelete={(id) => { setConfirmId(id); onDelete(id); }} />)}
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
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--gold-subtle)' }}>
        <Calculator size={14} className="text-[var(--gold)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--ink-900)] truncate">
          {eur(Number(sim.gross_income))} · {sim.dependents} {sim.dependents === 1 ? 'dependente' : 'dependentes'}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-300)' }}>{date}</p>
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
  const [show, setShow] = useState(true);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setShow(s => !s)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-[var(--ink-900)] hover:bg-black/[0.02] transition-colors">
        <span className="flex items-center gap-2">
          <Info size={14} className="text-[var(--gold)]" />
          Alertas de Dedução
          {alerts.length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
              style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
              {alerts.length}
            </span>
          )}
        </span>
        <ChevronDown size={14} className={`text-[var(--ink-500)]/40 transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-3 pb-3">
              {isLoading ? (
                <div className="space-y-2 px-2">
                  {[0, 1, 2].map(i => (
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
        <p className="text-xs font-semibold text-[var(--ink-900)] truncate">
          {alert.description ?? '(transação removida)'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
            {DEDUCTION_TYPE_LABELS[alert.deduction_type] ?? alert.deduction_type}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--ink-300)' }}>
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
