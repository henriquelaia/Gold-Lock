import { X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnectBank } from '../../hooks/useAccounts';
import { useAuthStore } from '../../store/authStore';

const BANKS = [
  { name: 'Caixa Geral de Depósitos', logo: 'CGD', color: '#003B71' },
  { name: 'Millennium BCP',           logo: 'BCP', color: '#E31837' },
  { name: 'BPI',                      logo: 'BPI', color: '#004C97' },
  { name: 'Santander',                logo: 'SAN', color: '#EC0000' },
  { name: 'NovoBanco',                logo: 'NB',  color: '#FF6B00' },
  { name: 'Montepio',                 logo: 'MP',  color: '#006838' },
];

interface ConnectBankModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectBankModal({ isOpen, onClose }: ConnectBankModalProps) {
  const connectBank = useConnectBank();
  const isDemo = useAuthStore(s => s.accessToken) === 'demo-token';

  function handleBankClick() {
    if (isDemo) { onClose(); return; }
    const returnTo = `${window.location.origin}/accounts?connected=1`;
    connectBank.mutate(returnTo, { onSuccess: onClose });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[17px] font-bold" style={{ color: 'var(--ink-900)' }}>
                  Ligar Conta Bancária
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-300)' }}>
                  Ligação segura via Open Banking (PSD2)
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--ink-50)]"
                style={{ color: 'var(--ink-300)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {BANKS.map((bank, i) => (
                <motion.button
                  key={bank.name}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={handleBankClick}
                  disabled={connectBank.isPending}
                  className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:bg-[var(--ink-50)] disabled:opacity-50 disabled:cursor-wait"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                    style={{ background: bank.color }}
                  >
                    {bank.logo}
                  </div>
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink-900)' }}>
                    {bank.name.split(' ').slice(0, 2).join(' ')}
                  </p>
                </motion.button>
              ))}
            </div>

            {connectBank.isPending && (
              <p className="text-xs text-center mb-3" style={{ color: 'var(--ink-300)' }}>
                A redirecionar para o teu banco…
              </p>
            )}

            <div
              className="rounded-xl p-3 flex items-start gap-2.5"
              style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}
            >
              <ExternalLink size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-500)' }}>
                Após autorizares no teu banco, volta a esta página — a conta aparece automaticamente.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
