import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-sm">
        <p className="text-[72px] font-black leading-none mb-4" style={{ color: 'var(--gold)' }}>404</p>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--ink-900)' }}>Página não encontrada</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--ink-400)' }}>
          O endereço que tentaste aceder não existe ou foi movido.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--ink-900)' }}>
          Voltar ao Dashboard
        </button>
      </motion.div>
    </div>
  );
}
