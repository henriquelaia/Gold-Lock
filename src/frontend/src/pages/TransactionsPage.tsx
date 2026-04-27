import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Download, ChevronDown, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useTransactions, useTransactionSummary, useCategories } from '../hooks/useTransactions';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const TYPE_OPTIONS = [
  { value: '', label: 'Tipo' },
  { value: 'expense', label: 'Despesas' },
  { value: 'income', label: 'Receitas' },
];

interface Transaction {
  id: string;
  description: string;
  amount: string;
  transaction_date: string;
  is_recurring?: boolean;
  ml_confidence?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  bank_name?: string | null;
  irs_deduction_category?: string;
}

interface Category { id: string; name_pt: string; }

export function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'income' | 'expense'>('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const { data: categories = [] } = useCategories();
  const { data: summary } = useTransactionSummary();
  const { data, isLoading } = useTransactions({
    page,
    limit: PER_PAGE,
    ...(categoryFilter && { category: categoryFilter }),
    ...(typeFilter && { type: typeFilter }),
  });

  const transactions: Transaction[] = data?.data ?? [];
  const pagination = data?.pagination;
  const hasMore = pagination ? page < pagination.pages : false;
  const hasFilters = search || categoryFilter || typeFilter;

  const displayed = search
    ? transactions.filter(tx => tx.description.toLowerCase().includes(search.toLowerCase()))
    : transactions;

  function exportCSV() {
    const rows = displayed.map(tx =>
      [tx.transaction_date, tx.description, tx.amount, tx.category_name || '', tx.bank_name || ''].join(',')
    );
    const csv = ['Data,Descrição,Valor,Categoria,Conta', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transacoes.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink-900)]">Transações</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-400)' }}>
            {pagination ? `${pagination.total} transações` : 'A carregar…'}
          </p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
          <Download size={14} />
          Exportar CSV
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-xs text-green-700 font-medium mb-1">Receitas do mês</p>
          <p className="text-xl font-bold text-green-700">+{eur(summary?.income ?? 0)}</p>
        </div>
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-xs text-red-600 font-medium mb-1">Despesas do mês</p>
          <p className="text-xl font-bold text-red-600">-{eur(summary?.expenses ?? 0)}</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-subtle)' }}>
          <Search size={15} className="text-[var(--gold)]/50 shrink-0" />
          <input type="text" placeholder="Pesquisar transações..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--ink-900)' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--ink-400)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} style={{ color: 'var(--ink-400)' }} />
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as '' | 'income' | 'expense'); setPage(1); }}
            className="text-xs px-3 py-1.5 rounded-xl border outline-none cursor-pointer font-medium"
            style={{ background: typeFilter ? 'var(--gold-subtle)' : 'rgba(0,0,0,0.03)',
              borderColor: typeFilter ? 'var(--gold-border)' : 'rgba(0,0,0,0.08)',
              color: typeFilter ? 'var(--gold)' : 'var(--ink-500)' }}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-xs px-3 py-1.5 rounded-xl border outline-none cursor-pointer font-medium"
            style={{ background: categoryFilter ? 'var(--gold-subtle)' : 'rgba(0,0,0,0.03)',
              borderColor: categoryFilter ? 'var(--gold-border)' : 'rgba(0,0,0,0.08)',
              color: categoryFilter ? 'var(--gold)' : 'var(--ink-500)' }}>
            <option value="">Todas as categorias</option>
            {categories.map((c: Category) => (
              <option key={c.id} value={c.name_pt}>{c.name_pt}</option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={() => { setSearch(''); setCategoryFilter(''); setTypeFilter(''); setPage(1); }}
              className="text-xs px-3 py-1.5 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-colors">
              Limpar filtros
            </button>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><LoadingSpinner size="md" /></div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm font-medium" style={{ color: 'var(--ink-900)' }}>Nenhuma transação encontrada</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-400)' }}>Tenta ajustar os filtros ou sincroniza as tuas contas</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            <AnimatePresence>
              {displayed.map((tx, i) => (
                <motion.div key={tx.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-black/[0.015] transition-colors">

                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${tx.category_color || '#9E9E9E'}15` }}>
                    {tx.category_icon || '•'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink-900)' }}>{tx.description}</p>
                      {tx.is_recurring && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>Recorrente</span>
                      )}
                      {tx.irs_deduction_category && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>IRS Dedutível</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-400)' }}>
                      {format(parseISO(tx.transaction_date), "d 'de' MMMM", { locale: pt })}
                      {tx.bank_name && <> · {tx.bank_name}</>}
                    </p>
                  </div>

                  {tx.category_name && (
                    <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: `${tx.category_color || '#9E9E9E'}12`, color: tx.category_color || '#9E9E9E' }}>
                      {tx.category_name}
                    </div>
                  )}

                  {tx.ml_confidence != null && (
                    <div className="hidden lg:block text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden bg-black/[0.06]">
                          <div className="h-full rounded-full"
                            style={{ width: `${Number(tx.ml_confidence) * 100}%`, background: Number(tx.ml_confidence) > 0.9 ? '#22c55e' : '#f59e0b' }} />
                        </div>
                        <span className="text-[10px]" style={{ color: 'var(--ink-400)' }}>
                          {Math.round(Number(tx.ml_confidence) * 100)}%
                        </span>
                      </div>
                      <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>ML</p>
                    </div>
                  )}

                  <p className={`text-base font-bold shrink-0 tabular-nums ${Number(tx.amount) >= 0 ? 'text-green-600' : ''}`}
                    style={{ color: Number(tx.amount) >= 0 ? undefined : 'var(--ink-900)' }}>
                    {Number(tx.amount) >= 0 ? '+' : ''}{eur(Math.abs(Number(tx.amount)))}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {hasMore && !search && (
          <div className="p-4 border-t border-black/[0.04] text-center">
            <button onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-2 mx-auto text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: 'var(--gold)' }}>
              <ChevronDown size={15} />
              Carregar mais
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
