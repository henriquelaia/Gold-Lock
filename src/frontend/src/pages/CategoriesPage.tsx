import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Tag, X, Loader2, ChevronRight } from 'lucide-react';
import { useCategories, useCreateCategory } from '../hooks/useTransactions';
import { EmptyState } from '../components/ui/EmptyState';

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

interface Category {
  id: string;
  name: string;
  name_pt: string;
  icon: string | null;
  color: string | null;
  is_expense: boolean;
  parent_id: string | null;
  irs_deduction_category: string | null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CreateCategoryModal({
  rootCategories,
  onClose,
}: {
  rootCategories: Category[];
  onClose: () => void;
}) {
  const { mutate: create, isPending } = useCreateCategory();
  const [form, setForm] = useState({
    namePt: '',
    name: '',
    nameTouched: false,
    parentId: '',
    icon: '•',
    color: '#9E9E9E',
    isExpense: true,
  });
  const [error, setError] = useState('');

  function handleNamePt(value: string) {
    setForm(f => ({
      ...f,
      namePt: value,
      name: f.nameTouched ? f.name : slugify(value),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.namePt.trim() || !form.name.trim()) {
      setError('Nome (PT) e nome interno são obrigatórios');
      return;
    }
    create(
      {
        name: form.name.trim(),
        namePt: form.namePt.trim(),
        icon: form.icon || undefined,
        color: form.color,
        parentId: form.parentId || undefined,
        isExpense: form.isExpense,
      },
      { onSuccess: onClose, onError: () => setError('Erro ao criar categoria') },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,16,0.4)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--ink-900)' }}>
            Nova Categoria
          </h2>
          <button onClick={onClose}>
            <X size={16} style={{ color: 'var(--ink-400)' }} />
          </button>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>
              Nome (PT)
            </label>
            <input
              value={form.namePt}
              onChange={e => handleNamePt(e.target.value)}
              placeholder="Ex: Restaurantes Asiáticos"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>
              Nome interno (slug)
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, nameTouched: true }))}
              placeholder="restaurantes-asiaticos"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>
              Categoria-pai
            </label>
            <select
              value={form.parentId}
              onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}
            >
              <option value="">Nenhuma (categoria raíz)</option>
              {rootCategories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name_pt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>
                Ícone
              </label>
              <input
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                maxLength={4}
                placeholder="•"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none text-center"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)', color: 'var(--ink-900)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--ink-400)' }}>
                Cor
              </label>
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-12 h-10 rounded-xl cursor-pointer outline-none"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is-expense"
              type="checkbox"
              checked={form.isExpense}
              onChange={e => setForm(f => ({ ...f, isExpense: e.target.checked }))}
              className="accent-[var(--gold)]"
            />
            <label htmlFor="is-expense" className="text-xs font-medium" style={{ color: 'var(--ink-500)' }}>
              É categoria de despesa (desmarcar para receita)
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--ink-900)' }}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isPending ? 'A criar…' : 'Criar Categoria'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function CategoryRow({ cat, indented }: { cat: Category; indented: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors"
      style={{
        background: indented ? 'transparent' : 'var(--surface)',
        marginLeft: indented ? '2.5rem' : 0,
      }}
    >
      {indented && <ChevronRight size={12} style={{ color: 'var(--ink-300)' }} />}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
        style={{ background: `${cat.color || '#9E9E9E'}20` }}
      >
        {cat.icon || '•'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink-900)' }}>
          {cat.name_pt}
        </p>
        <p className="text-[10px] font-mono truncate" style={{ color: 'var(--ink-300)' }}>
          {cat.name}
        </p>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-1 rounded-md shrink-0"
        style={{
          background: cat.is_expense ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.10)',
          color: cat.is_expense ? '#dc2626' : '#15803d',
        }}
      >
        {cat.is_expense ? 'Despesa' : 'Receita'}
      </span>
    </div>
  );
}

export function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories() as { data: Category[]; isLoading: boolean };
  const [showCreate, setShowCreate] = useState(false);

  const { roots, byParent } = useMemo(() => {
    const roots = categories.filter(c => !c.parent_id).sort((a, b) => a.name_pt.localeCompare(b.name_pt));
    const byParent = new Map<string, Category[]>();
    for (const c of categories) {
      if (c.parent_id) {
        const arr = byParent.get(c.parent_id) ?? [];
        arr.push(c);
        byParent.set(c.parent_id, arr);
      }
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.name_pt.localeCompare(b.name_pt));
    return { roots, byParent };
  }, [categories]);

  return (
    <>
      <AnimatePresence>
        {showCreate && (
          <CreateCategoryModal rootCategories={roots} onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>

      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        <motion.div {...fadeUp(0)} className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>
              Categorias
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
              Gerir categorias e subcategorias de transações
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--ink-900)' }}
          >
            <Plus size={14} />
            Nova Categoria
          </button>
        </motion.div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-10 rounded-xl animate-pulse"
                style={{ background: 'rgba(0,0,0,0.04)' }}
              />
            ))}
          </div>
        ) : roots.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Sem categorias"
            description="Cria a primeira categoria para começar a organizar as transações."
            action={{ label: 'Criar Categoria', onClick: () => setShowCreate(true) }}
          />
        ) : (
          <motion.div {...fadeUp(0.05)} className="rounded-2xl p-3 space-y-1" style={card}>
            {roots.map(root => {
              const children = byParent.get(root.id) ?? [];
              return (
                <div key={root.id} className="space-y-1">
                  <CategoryRow cat={root} indented={false} />
                  {children.map(child => (
                    <CategoryRow key={child.id} cat={child} indented />
                  ))}
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </>
  );
}
