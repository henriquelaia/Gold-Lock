import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronDown, Info, TrendingDown } from 'lucide-react';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const pct = (v: number) => `${v.toFixed(2)}%`;

// ── Escalões IRS 2024 (Portugal) ──────────────
// Fonte: OE 2024 / Artigo 68.º CIRS
const BRACKETS_2024 = [
  { min: 0,       max: 7703,   rate: 13.25, marginal: 13.25 },
  { min: 7703,    max: 11623,  rate: 18.00, marginal: 18.00 },
  { min: 11623,   max: 16472,  rate: 23.00, marginal: 23.00 },
  { min: 16472,   max: 21321,  rate: 26.00, marginal: 26.00 },
  { min: 21321,   max: 27146,  rate: 32.75, marginal: 32.75 },
  { min: 27146,   max: 39791,  rate: 37.00, marginal: 37.00 },
  { min: 39791,   max: 51997,  rate: 43.50, marginal: 43.50 },
  { min: 51997,   max: 81199,  rate: 45.00, marginal: 45.00 },
  { min: 81199,   max: Infinity, rate: 48.00, marginal: 48.00 },
];

// Deduções específicas (art.º 78.º CIRS e EBF)
const DEDUCTION_LIMITS = {
  saude:    { rate: 0.15, limit: 1000,  label: 'Saúde (art.º 78.º-C)',      article: '15%, limite 1.000 €' },
  educacao: { rate: 0.30, limit: 800,   label: 'Educação (art.º 78.º-D)',    article: '30%, limite 800 €' },
  habitacao:{ rate: 0.15, limit: 296,   label: 'Habitação/Juros (art.º 78.º-E)', article: '15%, limite 296 €' },
  gerais:   { rate: 0.35, limit: 250,   label: 'Encargos Gerais (art.º 78.º-B)', article: '35%, limite 250 €' },
  ppr:      { rate: 0.20, limit: 400,   label: 'PPR (art.º 21.º EBF)',       article: '20%, até 400 € (< 35 anos)' },
};

// ── Motor de cálculo ──────────────────────────
function calculateIRS(input: {
  grossIncome: number;
  maritalStatus: 'single' | 'married';
  dependents: number;
  socialSecurity: number;
  withholdingTax: number;
  deductions: Record<string, number>;
}) {
  const { grossIncome, socialSecurity, withholdingTax, deductions, dependents } = input;

  // 1. Rendimento líquido (deducção SS obrigatória)
  const netIncome = Math.max(grossIncome - socialSecurity, 0);

  // 2. Deduções específicas (Categoria A — mínimo 4.104 € ou SS paga, o maior)
  const specificDeduction = Math.max(socialSecurity, 4104);
  const taxableIncome = Math.max(netIncome - specificDeduction, 0);

  // 3. Imposto bruto (escalões progressivos)
  let grossTax = 0;
  let bracket = '';
  for (const b of BRACKETS_2024) {
    if (taxableIncome <= b.min) break;
    const sliceMax = Math.min(taxableIncome, b.max === Infinity ? taxableIncome : b.max);
    const slice = sliceMax - b.min;
    grossTax += slice * (b.rate / 100);
    if (taxableIncome <= b.max) {
      bracket = `${b.rate}%`;
    }
  }
  const effectiveBracket = bracket || '13,25%';

  // 4. Deduções à coleta
  let totalDeductions = 0;

  // Deduções pessoais
  const dedSaude     = Math.min(deductions.saude    * DEDUCTION_LIMITS.saude.rate,    DEDUCTION_LIMITS.saude.limit);
  const dedEducacao  = Math.min(deductions.educacao  * DEDUCTION_LIMITS.educacao.rate,  DEDUCTION_LIMITS.educacao.limit);
  const dedHabitacao = Math.min(deductions.habitacao * DEDUCTION_LIMITS.habitacao.rate, DEDUCTION_LIMITS.habitacao.limit);
  const dedGerais    = Math.min(deductions.gerais    * DEDUCTION_LIMITS.gerais.rate,    DEDUCTION_LIMITS.gerais.limit);
  const dedPPR       = Math.min(deductions.ppr       * DEDUCTION_LIMITS.ppr.rate,       DEDUCTION_LIMITS.ppr.limit);

  totalDeductions = dedSaude + dedEducacao + dedHabitacao + dedGerais + dedPPR;

  // Deduções por dependentes (art.º 78.º-F) — 600 € por dependente, 726 € acima de 3
  const depDeduction = dependents > 0 ? dependents * (dependents > 3 ? 726 : 600) : 0;
  totalDeductions += depDeduction;

  // 5. Coleta líquida
  const netTax = Math.max(grossTax - totalDeductions, 0);

  // 6. Resultado final
  const effectiveRate = grossIncome > 0 ? (netTax / grossIncome) * 100 : 0;
  const result = withholdingTax - netTax;

  return {
    grossIncome,
    netIncome,
    taxableIncome,
    grossTax,
    dedSaude, dedEducacao, dedHabitacao, dedGerais, dedPPR, depDeduction,
    totalDeductions,
    netTax,
    effectiveRate,
    effectiveBracket,
    withholdingTax,
    result, // positivo = reembolso, negativo = pagamento
  };
}

// ── Componente campo de input ────────────────
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

// ── Página principal ──────────────────────────
export function IRSSimulatorPage() {
  const [grossIncome, setGrossIncome] = useState(24000);
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married'>('single');
  const [dependents, setDependents] = useState(0);
  const [socialSecurity, setSocialSecurity] = useState(2640); // 11% de 24000
  const [withholdingTax, setWithholdingTax] = useState(3800);
  const [deductions, setDeductions] = useState({ saude: 400, educacao: 0, habitacao: 0, gerais: 0, ppr: 0 });
  const [showBrackets, setShowBrackets] = useState(false);

  const setDed = (key: string, val: number) => setDeductions(d => ({ ...d, [key]: val }));

  const result = useMemo(() => calculateIRS({
    grossIncome, maritalStatus, dependents, socialSecurity, withholdingTax, deductions,
  }), [grossIncome, maritalStatus, dependents, socialSecurity, withholdingTax, deductions]);

  const isRefund = result.result >= 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[var(--ink-900)] flex items-center gap-2">
          <Calculator size={22} className="text-[var(--gold)]" />
          Simulador IRS 2024
        </h1>
        <p className="text-sm text-[var(--ink-500)]/50 mt-0.5">
          Cálculo baseado nos escalões do OE 2024 · Art.º 68.º CIRS
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Formulário — 3 colunas */}
        <div className="lg:col-span-3 space-y-4">

          {/* Rendimento */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 className="text-sm font-bold text-[var(--ink-900)]">Rendimento (Categoria A)</h2>

            <Field label="Rendimento Bruto Anual" value={grossIncome} onChange={v => { setGrossIncome(v); setSocialSecurity(Math.round(v * 0.11)); }} />
            <Field label="Contribuições Segurança Social" sub="Trabalhador paga 11% — calculado automaticamente" value={socialSecurity} onChange={setSocialSecurity} />
            <Field label="Retenções na Fonte (total retido no ano)" value={withholdingTax} onChange={setWithholdingTax} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-500)]/60 mb-1.5">Estado Civil</label>
                <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value as 'single' | 'married')}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--ink-900)] outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
                  <option value="single">Solteiro(a)</option>
                  <option value="married">Casado(a)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-500)]/60 mb-1.5">Dependentes</label>
                <select value={dependents} onChange={e => setDependents(Number(e.target.value))}
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
              <div className="group relative">
                <Info size={13} className="text-[var(--ink-500)]/30 cursor-help" />
              </div>
            </div>

            {Object.entries(DEDUCTION_LIMITS).map(([key, info]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-[var(--ink-500)]/60 mb-1">
                  {info.label}
                </label>
                <p className="text-[10px] text-[var(--gold)]/60 mb-1.5">{info.article}</p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}>
                  <span className="text-xs text-[var(--ink-500)]/50 shrink-0">€</span>
                  <input type="number" min={0} value={deductions[key as keyof typeof deductions] || ''}
                    onChange={e => setDed(key, parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-transparent text-sm font-semibold text-[var(--ink-900)] outline-none" placeholder="0" />
                  <span className="text-[10px] text-green-600 font-semibold shrink-0">
                    -{eur(Math.min(deductions[key as keyof typeof deductions] * info.rate, info.limit))}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Resultado — 2 colunas */}
        <div className="lg:col-span-2 space-y-4">

          {/* Card de resultado */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-6 text-center"
            style={{
              background: isRefund
                ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.06) 100%)'
                : 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)',
              border: isRefund ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.2)',
            }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: isRefund ? '#15803d' : '#dc2626' }}>
              {isRefund ? '🎉 Reembolso Estimado' : '⚠️ Pagamento Estimado'}
            </p>
            <motion.p key={result.result}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-black"
              style={{ color: isRefund ? '#15803d' : '#dc2626' }}>
              {isRefund ? '+' : ''}{eur(result.result)}
            </motion.p>
            <p className="text-xs mt-2" style={{ color: isRefund ? '#15803d80' : '#dc262680' }}>
              {isRefund ? 'A receber da AT' : 'A pagar à AT'}
            </p>
          </motion.div>

          {/* Breakdown */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-xs font-bold text-[var(--ink-900)] uppercase tracking-widest">Detalhes do Cálculo</h3>

            {[
              { label: 'Rendimento Bruto',         value: eur(result.grossIncome),      color: 'var(--ink-900)' },
              { label: 'Deducção SS (11%)',         value: `-${eur(result.grossIncome - result.netIncome)}`, color: '#ef4444' },
              { label: 'Rendimento Líquido',        value: eur(result.netIncome),        color: 'var(--ink-900)', bold: true },
              { label: 'Deducção Específ. Cat. A',  value: `-${eur(result.netIncome - result.taxableIncome)}`, color: '#ef4444' },
              { label: 'Rendimento Coletável',      value: eur(result.taxableIncome),    color: 'var(--ink-900)', bold: true },
              { label: `Imposto Bruto (escalão ${result.effectiveBracket})`, value: `-${eur(result.grossTax)}`, color: '#ef4444' },
              { label: 'Total Deduções Coleta',     value: `+${eur(result.totalDeductions)}`, color: '#22c55e' },
              { label: 'Coleta Líquida (IRS a pagar)', value: eur(result.netTax),       color: 'var(--ink-900)', bold: true },
              { label: 'Retenções na Fonte',        value: `+${eur(result.withholdingTax)}`, color: '#22c55e' },
            ].map((row, i) => (
              <div key={i} className={`flex justify-between items-center text-xs ${row.bold ? 'py-1 border-t border-black/[0.06] mt-1' : ''}`}>
                <span className="text-[var(--ink-500)]/60">{row.label}</span>
                <span className={`font-${row.bold ? 'bold' : 'semibold'} tabular-nums`} style={{ color: row.color }}>
                  {row.value}
                </span>
              </div>
            ))}

            {/* Taxa efetiva */}
            <div className="pt-2 border-t border-black/[0.06]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--ink-500)]/60">Taxa Efetiva</span>
                <span className="font-bold text-[var(--gold)]">{pct(result.effectiveRate)}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${Math.min(result.effectiveRate, 48)}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-[var(--gold)]" />
              </div>
            </div>
          </motion.div>

          {/* Tabela de escalões */}
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
                    {BRACKETS_2024.filter(b => b.max !== Infinity || result.taxableIncome > b.min).map((b, i) => {
                      const isActive = result.taxableIncome > b.min && result.taxableIncome <= (b.max === Infinity ? Infinity : b.max);
                      return (
                        <div key={i} className={`flex justify-between text-xs px-2 py-1.5 rounded-lg ${isActive ? 'font-bold' : ''}`}
                          style={{ background: isActive ? 'var(--gold-subtle)' : 'transparent', color: isActive ? 'var(--gold)' : 'var(--ink-500)' }}>
                          <span>
                            {eur(b.min)} — {b.max === Infinity ? '∞' : eur(b.max)}
                          </span>
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
    </div>
  );
}
