import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, Info, Shield, Flame, Minus, Plus, X, Loader2, BarChart2, Upload,
} from 'lucide-react';
import { useInvestments, useCreateInvestment, useDeleteInvestment, useImportPdf, useConfirmImport, type ParsedTxAnnotated, type ImportPreview } from '../hooks/useInvestments';
import { useMarketQuote, useMarketHistory } from '../hooks/useMarketData';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InvestmentSummaryCards } from '../components/investments/InvestmentSummaryCards';
import { EUR_RATE } from '../config/constants';

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

type InvestmentType = 'stock' | 'etf' | 'bond' | 'crypto' | 'certificado' | 'deposito';
type RiskLevel = 'guaranteed' | 'moderate' | 'high';

interface Investment {
  id: string;
  name: string;
  ticker?: string;
  type: InvestmentType;
  quantity: number;
  purchase_price: number;
  currency?: string;
  risk_level: RiskLevel;
  annual_rate?: number;
  institution?: string;
}

const TABS: { id: 'todos' | InvestmentType; label: string }[] = [
  { id: 'todos',       label: 'Todos' },
  { id: 'stock',       label: 'Ações' },
  { id: 'etf',         label: 'ETFs' },
  { id: 'bond',        label: 'Obrigações' },
  { id: 'crypto',      label: 'Crypto' },
  { id: 'certificado', label: 'Cert. Aforro' },
  { id: 'deposito',    label: 'Dep. a Prazo' },
];

const TYPE_LABELS: Record<InvestmentType, string> = {
  stock: 'Ação', etf: 'ETF', bond: 'Obrigação',
  crypto: 'Crypto', certificado: 'Cert. Aforro', deposito: 'Dep. a Prazo',
};

const TYPE_COLORS: Record<InvestmentType, string> = {
  stock: '#3B82F6', etf: '#8B5CF6', bond: '#6B7280',
  crypto: '#F59E0B', certificado: '#10B981', deposito: '#14B8A6',
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  guaranteed: { label: 'Garantido', color: '#10B981', bg: 'rgba(16,185,129,0.10)', Icon: Shield },
  moderate:   { label: 'Moderado',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', Icon: Minus },
  high:       { label: 'Alto',      color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  Icon: Flame },
};

function getInvCost(inv: Investment) {
  const cost = Number(inv.quantity) * Number(inv.purchase_price);
  return inv.currency === 'USD' ? cost * EUR_RATE : cost;
}

// ── Gráfico de histórico ────────────────────────────────────────────────────

function HistoryModal({ inv, onClose }: { inv: Investment; onClose: () => void }) {
  const [period, setPeriod] = useState<'30d' | '1y'>('30d');
  const { data, isLoading } = useMarketHistory(inv.ticker, inv.type, period);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,16,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink-900)' }}>{inv.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-400)' }}>
              {inv.ticker?.toUpperCase()} · Histórico de preços
            </p>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--ink-400)' }} /></button>
        </div>

        <div className="flex gap-1 mb-4">
          {(['30d', '1y'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: period === p ? 'var(--ink-900)' : 'transparent',
                color: period === p ? 'white' : 'var(--ink-400)',
              }}>
              {p === '30d' ? '30 dias' : '1 ano'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40"><LoadingSpinner /></div>
        ) : !data?.points.length ? (
          <p className="text-center text-sm py-10" style={{ color: 'var(--ink-400)' }}>
            Sem dados históricos disponíveis
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.points} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-300)' }}
                tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-300)' }} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Fecho']}
                labelFormatter={l => l} />
              <Line type="monotone" dataKey="close" stroke="#C9A227"
                dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}

// ── Linha de investimento com cotação live ──────────────────────────────────

interface InvestmentRowProps {
  inv: Investment;
  totalPortfolioValue: number;
  index: number;
  isLast: boolean;
  onDelete: () => void;
  onShowHistory: () => void;
  onLivePrice: (id: string, price: number | null) => void;
}

function InvestmentRow({ inv, totalPortfolioValue, index, isLast, onDelete, onShowHistory, onLivePrice }: InvestmentRowProps) {
  const { data: quote, isLoading: loadingQuote } = useMarketQuote(inv.ticker, inv.type);

  // Reportar preço ao componente pai para agregação no summary
  const livePrice = quote?.price ?? null;
  if (livePrice !== null) {
    onLivePrice(inv.id, livePrice);
  }

  const cost = getInvCost(inv);
  const currentValue = livePrice != null
    ? (() => {
        const v = Number(inv.quantity) * livePrice;
        return inv.currency === 'USD' ? v * EUR_RATE : v;
      })()
    : cost;

  const pl = livePrice != null ? currentValue - cost : null;
  const plPct = pl != null && cost > 0 ? (pl / cost) * 100 : null;
  const alloc = totalPortfolioValue > 0 ? ((livePrice != null ? currentValue : cost) / totalPortfolioValue) * 100 : 0;

  const risk = RISK_CONFIG[inv.risk_level] ?? RISK_CONFIG.moderate;
  const typeColor = TYPE_COLORS[inv.type] ?? '#9E9E9E';
  const isGuaranteed = inv.risk_level === 'guaranteed';
  const hasHistory = !!inv.ticker && ['stock', 'etf', 'crypto'].includes(inv.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      className="grid grid-cols-12 items-center px-4 py-3 transition-colors group"
      style={{ borderBottom: !isLast ? '1px solid var(--border)' : 'none' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ink-50)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <div className="col-span-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
          style={{ background: typeColor }}>
          {inv.ticker ? inv.ticker.slice(0, 3).toUpperCase() : TYPE_LABELS[inv.type].slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink-900)' }}>{inv.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: `${typeColor}18`, color: typeColor }}>
              {TYPE_LABELS[inv.type]}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: risk.bg, color: risk.color }}>
              {risk.label}
            </span>
          </div>
        </div>
      </div>

      <div className="col-span-2 text-right">
        <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>
          {eur(livePrice != null ? currentValue : cost)}
        </p>
        {livePrice != null ? (
          <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>
            {inv.currency === 'USD' ? `$${livePrice.toFixed(2)}` : `€${livePrice.toFixed(2)}`}
          </p>
        ) : inv.annual_rate ? (
          <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>{Number(inv.annual_rate).toFixed(2)}%/ano</p>
        ) : loadingQuote && inv.ticker ? (
          <Loader2 size={10} className="animate-spin ml-auto" style={{ color: 'var(--ink-300)' }} />
        ) : null}
      </div>

      <div className="col-span-2 text-right">
        {isGuaranteed ? (
          <p className="text-xs font-medium" style={{ color: 'var(--ink-300)' }}>—</p>
        ) : pl != null ? (
          <div>
            <p className="text-xs font-semibold tabular-nums"
              style={{ color: pl >= 0 ? '#22c55e' : '#ef4444' }}>
              {pl >= 0 ? '+' : ''}{eur(pl)}
            </p>
            <p className="text-[10px]" style={{ color: pl >= 0 ? '#22c55e' : '#ef4444' }}>
              {plPct! >= 0 ? '+' : ''}{plPct!.toFixed(1)}%
            </p>
          </div>
        ) : (
          <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>—</p>
        )}
      </div>

      <div className="col-span-2 text-right">
        <p className="text-xs font-semibold" style={{ color: 'var(--ink-700)' }}>{alloc.toFixed(1)}%</p>
        <div className="h-1 rounded-full mt-1" style={{ background: 'var(--ink-100)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(alloc, 100)}%`, background: typeColor }} />
        </div>
      </div>

      <div className="col-span-1 flex justify-end gap-1">
        {hasHistory && (
          <button onClick={onShowHistory}
            className="opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity p-1 rounded"
            title="Ver histórico">
            <BarChart2 size={12} style={{ color: 'var(--ink-900)' }} />
          </button>
        )}
        <button onClick={onDelete}
          className="opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity p-1 rounded"
          title="Remover">
          <X size={12} style={{ color: 'var(--ink-900)' }} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Modal de criação ────────────────────────────────────────────────────────

function CreateInvestmentModal({ onClose }: { onClose: () => void }) {
  const { mutate: create, isPending } = useCreateInvestment();
  const [form, setForm] = useState({
    name: '', ticker: '', type: 'stock' as InvestmentType,
    quantity: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0],
    currency: 'EUR', riskLevel: 'moderate' as RiskLevel,
    institution: '', annualRate: '', notes: '',
  });
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.quantity || !form.purchasePrice) {
      setError('Nome, quantidade e preço são obrigatórios');
      return;
    }
    if (Number(form.quantity) <= 0 || Number(form.purchasePrice) <= 0) {
      setError('Quantidade e preço devem ser maiores que zero');
      return;
    }
    create(
      {
        name: form.name, ticker: form.ticker || undefined, type: form.type,
        quantity: Number(form.quantity), purchasePrice: Number(form.purchasePrice),
        purchaseDate: form.purchaseDate, currency: form.currency, riskLevel: form.riskLevel,
        institution: form.institution || undefined,
        annualRate: form.annualRate ? Number(form.annualRate) : undefined,
        notes: form.notes || undefined,
      },
      { onSuccess: onClose, onError: () => setError('Erro ao criar investimento') }
    );
  }

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,16,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--ink-900)' }}>Novo Investimento</h2>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--ink-400)' }} /></button>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Tipo</label>
            <select value={form.type} onChange={e => f('type', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Nome</label>
            <input value={form.name} onChange={e => f('name', e.target.value)}
              placeholder="Ex: iShares MSCI World"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Ticker (opcional)</label>
            <input value={form.ticker} onChange={e => f('ticker', e.target.value)}
              placeholder="Ex: IWDA.AS"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Quantidade</label>
              <input type="number" min="0" step="any" value={form.quantity} onChange={e => f('quantity', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Preço Compra</label>
              <input type="number" min="0" step="0.0001" value={form.purchasePrice} onChange={e => f('purchasePrice', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Moeda</label>
              <select value={form.currency} onChange={e => f('currency', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Risco</label>
              <select value={form.riskLevel} onChange={e => f('riskLevel', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}>
                <option value="guaranteed">Garantido</option>
                <option value="moderate">Moderado</option>
                <option value="high">Alto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Data de Compra</label>
            <input type="date" value={form.purchaseDate} onChange={e => f('purchaseDate', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          {(form.type === 'certificado' || form.type === 'deposito' || form.type === 'bond') && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Taxa Anual (%)</label>
              <input type="number" min="0" step="0.01" value={form.annualRate} onChange={e => f('annualRate', e.target.value)}
                placeholder="Ex: 3.5"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>Instituição (opcional)</label>
            <input value={form.institution} onChange={e => f('institution', e.target.value)}
              placeholder="Ex: DEGIRO, Trading212, CGD"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }} />
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--ink-900)' }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isPending ? 'A guardar…' : 'Adicionar Investimento'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ── Modal de importação PDF ─────────────────────────────────────────────────

const TYPE_LABELS_SHORT: Record<string, string> = {
  stock: 'Ação', etf: 'ETF', crypto: 'Crypto',
};

function PdfImportModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'drop' | 'preview'>('drop');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutate: importPdf, isPending: isParsing } = useImportPdf();
  const { mutate: confirmImport, isPending: isConfirming } = useConfirmImport();

  function handleFile(file: File) {
    if (!file.name.endsWith('.pdf')) return;
    importPdf(file, {
      onSuccess: (data) => {
        setPreview(data);
        const initialSelected = new Set(
          data.transactions
            .map((_, i) => i)
            .filter(i => !data.transactions[i].duplicate)
        );
        setSelected(initialSelected);
        setStep('preview');
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function toggleRow(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function handleConfirm() {
    if (!preview) return;
    const toImport = preview.transactions
      .filter((_, i) => selected.has(i))
      .map(({ duplicate: _d, ...tx }) => tx);
    confirmImport(toImport, { onSuccess: () => onClose() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,16,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl p-6 max-h-[88vh] flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: 'var(--ink-900)' }}>
              Importar PDF de Corretora
            </h2>
            {step === 'preview' && preview && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-400)' }}>
                {preview.broker.toUpperCase()} · {preview.total} transações detectadas
              </p>
            )}
          </div>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--ink-400)' }} /></button>
        </div>

        {/* Drop zone */}
        {step === 'drop' && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-colors min-h-48"
            style={{
              border: `2px dashed ${isDragging ? 'var(--gold)' : 'var(--gold-border)'}`,
              background: isDragging ? 'var(--gold-subtle)' : 'transparent',
            }}>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            {isParsing ? (
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--gold)' }} />
            ) : (
              <>
                <Upload size={28} style={{ color: 'var(--gold)' }} />
                <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
                  Arrasta o PDF da tua corretora
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-400)' }}>
                  DEGIRO · XTB · Trade Republic
                </p>
              </>
            )}
          </div>
        )}

        {/* Preview table */}
        {step === 'preview' && preview && (
          <>
            <div className="overflow-auto flex-1 rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    <th className="w-8 px-3 py-2.5"></th>
                    <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--ink-400)' }}>Nome</th>
                    <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--ink-400)' }}>ISIN</th>
                    <th className="px-3 py-2.5 text-right font-semibold" style={{ color: 'var(--ink-400)' }}>Qtd</th>
                    <th className="px-3 py-2.5 text-right font-semibold" style={{ color: 'var(--ink-400)' }}>Preço</th>
                    <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--ink-400)' }}>Data</th>
                    <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--ink-400)' }}>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.transactions.map((tx: ParsedTxAnnotated, i: number) => (
                    <tr key={i}
                      onClick={() => toggleRow(i)}
                      className="cursor-pointer transition-colors"
                      style={{
                        background: tx.duplicate ? 'rgba(245,158,11,0.04)' : 'transparent',
                        opacity: tx.duplicate && !selected.has(i) ? 0.5 : 1,
                        borderBottom: '1px solid var(--border)',
                      }}>
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" readOnly checked={selected.has(i)}
                          className="accent-[#C9A227] cursor-pointer" />
                      </td>
                      <td className="px-3 py-2.5 font-medium max-w-[180px] truncate" style={{ color: 'var(--ink-900)' }}>
                        {tx.name}
                        {tx.duplicate && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#B45309' }}>
                            DUP
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--ink-400)' }}>{tx.isin ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--ink-900)' }}>{tx.quantity}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--ink-900)' }}>
                        {tx.purchasePrice.toFixed(2)} {tx.currency}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--ink-500)' }}>{tx.purchaseDate}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                          {TYPE_LABELS_SHORT[tx.type] ?? tx.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 shrink-0">
              <p className="text-xs" style={{ color: 'var(--ink-400)' }}>
                {selected.size} de {preview.total} selecionados
                {preview.transactions.some((t: ParsedTxAnnotated) => t.duplicate) && (
                  <span className="ml-1.5" style={{ color: '#B45309' }}>· duplicados desmarcados</span>
                )}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep('drop')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink-500)' }}>
                  Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selected.size === 0 || isConfirming}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'var(--ink-900)' }}>
                  {isConfirming ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {isConfirming ? 'A importar…' : 'Confirmar importação'}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────

export function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<'todos' | InvestmentType>('todos');
  const [showNote, setShowNote] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [historyInv, setHistoryInv] = useState<Investment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Mapa id → preço live para calcular P&L agregado no summary
  const [livePrices, setLivePrices] = useState<Map<string, number>>(new Map());
  const handleLivePrice = useCallback((id: string, price: number | null) => {
    setLivePrices(prev => {
      if (price === null) return prev;
      if (prev.get(id) === price) return prev;
      const next = new Map(prev);
      next.set(id, price);
      return next;
    });
  }, []);

  const { data: investments = [], isLoading } = useInvestments();
  const { mutate: deleteInvestment, isPending: isDeleting } = useDeleteInvestment();

  const invList = investments as Investment[];
  const filtered = activeTab === 'todos' ? invList : invList.filter(i => i.type === activeTab);

  // Valor total: usa preço live quando disponível, senão custo de compra
  const totalPortfolioValue = invList.reduce((s, inv) => {
    const livePrice = livePrices.get(inv.id);
    if (livePrice != null) {
      const v = Number(inv.quantity) * livePrice;
      return s + (inv.currency === 'USD' ? v * EUR_RATE : v);
    }
    return s + getInvCost(inv);
  }, 0);

  // P&L total agregado (apenas investimentos com preço live disponível)
  const totalPL = invList.reduce((s, inv) => {
    const livePrice = livePrices.get(inv.id);
    if (livePrice == null || inv.risk_level === 'guaranteed') return s;
    const cost = getInvCost(inv);
    const v = Number(inv.quantity) * livePrice;
    const currentVal = inv.currency === 'USD' ? v * EUR_RATE : v;
    return s + (currentVal - cost);
  }, 0);
  const totalCost = invList.reduce((s, inv) => {
    if (livePrices.has(inv.id) && inv.risk_level !== 'guaranteed') return s + getInvCost(inv);
    return s;
  }, 0);
  const hasAnyLivePrice = livePrices.size > 0;

  const riskStats = (['guaranteed', 'moderate', 'high'] as const).map(risk => {
    const val = invList
      .filter(i => i.risk_level === risk)
      .reduce((s, i) => s + getInvCost(i), 0);
    return { risk, pct: totalPortfolioValue > 0 ? (val / totalPortfolioValue) * 100 : 0 };
  });

  const donutData = Object.entries(
    invList.reduce<Record<string, number>>((acc, inv) => {
      const livePrice = livePrices.get(inv.id);
      const val = livePrice != null
        ? (() => { const v = Number(inv.quantity) * livePrice; return inv.currency === 'USD' ? v * EUR_RATE : v; })()
        : getInvCost(inv);
      acc[inv.type] = (acc[inv.type] || 0) + val;
      return acc;
    }, {})
  ).map(([type, value]) => ({
    name: TYPE_LABELS[type as InvestmentType],
    value,
    color: TYPE_COLORS[type as InvestmentType],
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <>
      <AnimatePresence>
        {showCreate && <CreateInvestmentModal onClose={() => setShowCreate(false)} />}
        {showImport && <PdfImportModal onClose={() => setShowImport(false)} />}
        {historyInv && <HistoryModal inv={historyInv} onClose={() => setHistoryInv(null)} />}
      </AnimatePresence>

      <div className="p-6 space-y-5 max-w-7xl mx-auto">

        <motion.div {...fadeUp(0)} className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>Investimentos</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-400)' }}>
              Visão completa do teu patrimônio financeiro
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNote(n => !n)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
              <Info size={12} />
              Nota
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
              <Upload size={12} />
              Importar PDF
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--ink-900)' }}>
              <Plus size={14} />
              Adicionar
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="rounded-2xl px-5 py-4 text-sm"
              style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--ink-900)' }}>Cotações e P&L</p>
              <p style={{ color: 'var(--ink-500)' }}>
                Ações e ETFs usam <strong>Massive API</strong> (15 min delay, plano free).
                Crypto usa <strong>CoinGecko</strong> (gratuito). Depósitos e Certificados de Aforro
                têm capital garantido — sem cotação automática.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {invList.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sem investimentos"
            description="Adiciona as tuas posições para acompanhar o teu portfólio."
            action={{ label: 'Adicionar Investimento', onClick: () => setShowCreate(true) }}
          />
        ) : (
          <>
            <InvestmentSummaryCards
              totalPortfolioValue={totalPortfolioValue}
              totalPL={totalPL}
              totalCost={totalCost}
              hasAnyLivePrice={hasAnyLivePrice}
              positionCount={invList.length}
              assetClassCount={new Set(invList.map(i => i.type)).size}
              riskStats={riskStats}
            />


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <motion.div {...fadeUp(0.18)} className="rounded-2xl p-5" style={card}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--ink-300)' }}>
                  Alocação
                </p>
                <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ink-900)' }}>Por Tipo de Ativo</h2>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%"
                      innerRadius={40} outerRadius={60}
                      paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => eur(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-500)' }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>
                        {totalPortfolioValue > 0 ? `${((d.value / totalPortfolioValue) * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div {...fadeUp(0.22)} className="lg:col-span-2 rounded-2xl overflow-hidden" style={card}>
                <div className="flex gap-0 px-4 pt-4 overflow-x-auto">
                  {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all mr-1"
                      style={{
                        background: activeTab === tab.id ? 'var(--ink-900)' : 'transparent',
                        color: activeTab === tab.id ? 'white' : 'var(--ink-400)',
                      }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-12 px-4 py-2 mt-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ink-300)', borderBottom: '1px solid var(--border)' }}>
                  <span className="col-span-5">Ativo</span>
                  <span className="col-span-2 text-right">Valor</span>
                  <span className="col-span-2 text-right">P&L</span>
                  <span className="col-span-2 text-right">Alocação</span>
                  <span className="col-span-1" />
                </div>

                <AnimatePresence mode="popLayout">
                  {filtered.map((inv, i) => (
                    <InvestmentRow
                      key={inv.id}
                      inv={inv}
                      totalPortfolioValue={totalPortfolioValue}
                      index={i}
                      isLast={i === filtered.length - 1}
                      onDelete={() => setDeleteId(inv.id)}
                      onShowHistory={() => setHistoryInv(inv)}
                      onLivePrice={handleLivePrice}
                    />
                  ))}
                </AnimatePresence>

                {filtered.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm" style={{ color: 'var(--ink-300)' }}>Nenhum ativo nesta categoria.</p>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover investimento"
        description="Esta ação é permanente e não pode ser desfeita."
        confirmLabel="Remover"
        isLoading={isDeleting}
        onConfirm={() => { if (deleteId) deleteInvestment(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
