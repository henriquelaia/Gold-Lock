import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAccounts, useDisconnectBank, useSyncAccount } from '../hooks/useAccounts';
import { BankCard } from '../components/accounts/BankCard';
import { ConnectBankModal } from '../components/accounts/ConnectBankModal';

const eur = (v: string | number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(v));

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay },
});

export function AccountsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useAccounts();
  const disconnect = useDisconnectBank();
  const sync = useSyncAccount();

  // Callback após ligar conta via Salt Edge
  useEffect(() => {
    if (searchParams.get('connected') === '1') {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, queryClient, setSearchParams]);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>
            Contas Bancárias
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
            Gerir ligações via Open Banking (PSD2)
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--ink-900)' }}
        >
          <Plus size={14} />
          Ligar Conta
        </button>
      </motion.div>

      {/* Hero card saldo total */}
      <motion.div
        {...fadeUp(0.05)}
        className="rounded-2xl p-6"
        style={{ background: 'var(--ink-900)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          Saldo Total Consolidado
        </p>
        <p className="text-[38px] font-black text-white mt-2 leading-none tabular-nums">
          {isLoading ? '···' : eur(totalBalance)}
        </p>
        {accounts.length > 0 && (
          <p className="text-[11px] mt-4" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'} · Atualizado recentemente
          </p>
        )}
      </motion.div>

      {/* Contas ligadas */}
      <div>
        <motion.p
          {...fadeUp(0.10)}
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--ink-300)' }}
        >
          Contas Ligadas
        </motion.p>

        {isLoading ? (
          // Skeleton
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl p-5 animate-pulse"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 112 }} />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          // Empty state
          <motion.div {...fadeUp(0.12)}
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}
          >
            <p className="text-2xl mb-2">🏦</p>
            <p className="font-semibold text-[14px]" style={{ color: 'var(--ink-900)' }}>
              Nenhuma conta ligada
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--ink-300)' }}>
              Liga o teu banco para ver saldos e transações em tempo real.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--ink-900)' }}
            >
              Ligar primeiro banco
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {accounts.map((acc, i) => (
              <motion.div key={acc.id} {...fadeUp(0.12 + i * 0.05)}>
                <BankCard
                  account={acc}
                  onSync={(id) => sync.mutate(id)}
                  onDisconnect={(id) => disconnect.mutate(id)}
                  isSyncing={sync.isPending && sync.variables === acc.id}
                  isDisconnecting={disconnect.isPending && disconnect.variables === acc.id}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Info segurança */}
      <motion.div
        {...fadeUp(0.30)}
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}
      >
        <span className="text-lg shrink-0">🔒</span>
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
            Ligação 100% segura
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ink-500)' }}>
            O GoldLock utiliza Open Banking regulado pelo Banco de Portugal (PSD2). As tuas credenciais bancárias nunca passam pelos nossos servidores.
          </p>
        </div>
      </motion.div>

      <ConnectBankModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
