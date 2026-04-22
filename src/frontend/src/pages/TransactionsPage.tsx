import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Download, ChevronDown, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { MOCK_TRANSACTIONS, MOCK_ACCOUNTS, CATEGORIES } from '../data/mock';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas as categorias' },
  ...Object.values(CATEGORIES).map(c => ({ value: c.id, label: c.name })),
];

const TYPE_OPTIONS = [
  { value: '', label: 'Tipo' },
  { value: 'expense', label: 'Despesas' },
  { value: 'income', label: 'Receitas' },
];

export function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    return MOCK_TRANSACTIONS
      .filter(tx => {
        const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase());
        const matchCat = !categoryFilter || tx.categoryId === categoryFilter;
        const matchType = !typeFilter
          || (typeFilter === 'expense' && tx.isExpense)
          || (typeFilter === 'income' && !tx.isExpense);
        return matchSearch && matchCat && matchType;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [search, categoryFilter, typeFilter]);

  const paginated = filtered.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < filtered.length;

  const totalExpenses = filtered.filter(t => t.isExpense).reduce((s, t) => s + t.amount, 0);
  const totalIncome = filtered.filter(t => !t.isExpense).reduce((s, t) => s + t.amount, 0);
  const hasFilters = search || categoryFilter || typeFilter;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink-900)]">Transações</h1>
          <p className="text-sm text-[var(--ink-500)]/50 mt-0.5">{filtered.length} transações encontradas</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
          <Download size={14} />
          Exportar CSV
        </button>
      </motion.div>

      {/* Resumo rápido */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-xs text-green-700 font-medium mb-1">Total Receitas</p>
          <p className="text-xl font-bold text-green-700">+{eur(totalIncome)}</p>
        </div>
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-xs text-red-600 font-medium mb-1">Total Despesas</p>
          <p className="text-xl font-bold text-red-600">-{eur(totalExpenses)}</p>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

        {/* Barra de pesquisa */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-subtle)' }}>
          <Search size={15} className="text-[var(--gold)]/50 shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar transações..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 bg-transparent text-sm text-[var(--ink-900)] placeholder-[var(--ink-500)]/40 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[var(--ink-500)]/40 hover:text-[var(--ink-500)]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-[var(--ink-500)]/40" />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-xs px-3 py-1.5 rounded-xl border outline-none cursor-pointer font-medium"
            style={{ background: typeFilter ? 'var(--gold-subtle)' : 'rgba(0,0,0,0.03)', borderColor: typeFilter ? 'var(--gold-border)' : 'rgba(0,0,0,0.08)', color: typeFilter ? 'var(--gold)' : 'var(--ink-500)' }}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-xs px-3 py-1.5 rounded-xl border outline-none cursor-pointer font-medium"
            style={{ background: categoryFilter ? 'var(--gold-subtle)' : 'rgba(0,0,0,0.03)', borderColor: categoryFilter ? 'var(--gold-border)' : 'rgba(0,0,0,0.08)', color: categoryFilter ? 'var(--gold)' : 'var(--ink-500)' }}>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {hasFilters && (
            <button onClick={() => { setSearch(''); setCategoryFilter(''); setTypeFilter(''); setPage(1); }}
              className="text-xs px-3 py-1.5 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-colors">
              Limpar filtros
            </button>
          )}
        </div>
      </motion.div>

      {/* Lista de transações */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

        {paginated.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm font-medium text-[var(--ink-900)]">Nenhuma transação encontrada</p>
            <p className="text-xs text-[var(--ink-500)]/50 mt-1">Tenta ajustar os filtros de pesquisa</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            <AnimatePresence>
              {paginated.map((tx, i) => {
                const cat = CATEGORIES[tx.categoryId];
                const account = MOCK_ACCOUNTS.find(a => a.id === tx.accountId);
                return (
                  <motion.div key={tx.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-black/[0.015] transition-colors group">

                    {/* Ícone da categoria */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: `${cat?.color}15` }}>
                      {cat?.icon}
                    </div>

                    {/* Descrição */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--ink-900)] truncate">{tx.description}</p>
                        {tx.isRecurring && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                            Recorrente
                          </span>
                        )}
                        {cat?.irsCategory && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
                            IRS Dedutível
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--ink-500)]/50 mt-0.5">
                        {format(parseISO(tx.date), "d 'de' MMMM", { locale: pt })}
                        {account && <> · <span style={{ color: account.color }}>{account.bankName.split(' ')[0]}</span></>}
                      </p>
                    </div>

                    {/* Categoria badge */}
                    <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: `${cat?.color}12`, color: cat?.color }}>
                      <span>{cat?.name}</span>
                    </div>

                    {/* Confiança ML */}
                    <div className="hidden lg:block text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden bg-black/[0.06]">
                          <div className="h-full rounded-full"
                            style={{ width: `${tx.mlConfidence * 100}%`, background: tx.mlConfidence > 0.9 ? '#22c55e' : '#f59e0b' }} />
                        </div>
                        <span className="text-[10px] text-[var(--ink-500)]/40">{Math.round(tx.mlConfidence * 100)}%</span>
                      </div>
                      <p className="text-[10px] text-[var(--ink-500)]/30">ML</p>
                    </div>

                    {/* Valor */}
                    <p className={`text-base font-bold shrink-0 tabular-nums ${tx.isExpense ? 'text-[var(--ink-900)]' : 'text-green-600'}`}>
                      {tx.isExpense ? '-' : '+'}{eur(tx.amount)}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Carregar mais */}
        {hasMore && (
          <div className="p-4 border-t border-black/[0.04] text-center">
            <button onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-2 mx-auto text-sm font-medium text-[var(--gold)] hover:opacity-70 transition-opacity">
              <ChevronDown size={15} />
              Carregar mais ({filtered.length - paginated.length} restantes)
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
