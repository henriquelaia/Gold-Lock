import { RefreshCw, Unlink, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { BankAccount } from '../../types/accounts';

const BANK_META: Record<string, { logo: string; color: string }> = {
  'Caixa Geral de Depósitos': { logo: 'CGD', color: '#003B71' },
  'Millennium BCP':           { logo: 'BCP', color: '#E31837' },
  'BPI':                      { logo: 'BPI', color: '#004C97' },
  'Santander':                { logo: 'SAN', color: '#EC0000' },
  'NovoBanco':                { logo: 'NB',  color: '#FF6B00' },
  'Montepio':                 { logo: 'MP',  color: '#006838' },
};

function getBankMeta(bankName: string) {
  for (const [key, val] of Object.entries(BANK_META)) {
    if (bankName.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { logo: bankName.slice(0, 3).toUpperCase(), color: '#6B7280' };
}

const eur = (v: string | number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(v));

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
} as const;

interface BankCardProps {
  account: BankAccount;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
}

export function BankCard({ account, onSync, onDisconnect, isSyncing, isDisconnecting }: BankCardProps) {
  const meta = getBankMeta(account.bank_name);
  const ibanShort = account.iban
    ? `···· ${account.iban.replace(/\s/g, '').slice(-4)}`
    : null;

  return (
    <div className="rounded-2xl p-5" style={card}>
      <div className="flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
          style={{ background: meta.color }}
        >
          {meta.logo}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[15px]" style={{ color: 'var(--ink-900)' }}>
              {account.bank_name}
            </p>
            {account.status === 'active' ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                <CheckCircle size={9} /> Ligado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500">
                <AlertCircle size={9} /> Erro
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-300)' }}>
            {account.account_name ?? 'Conta Bancária'}
            {ibanShort && ` · ${ibanShort}`}
          </p>
          {account.last_synced_at && (
            <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--ink-300)' }}>
              <Clock size={9} />
              {format(parseISO(account.last_synced_at), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--ink-900)' }}>
            {eur(account.balance)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
            {account.currency}
          </p>
        </div>
      </div>

      <div
        className="flex items-center gap-1 mt-4 pt-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={() => onSync(account.id)}
          disabled={isSyncing || isDisconnecting}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--gold-subtle)] disabled:opacity-50"
          style={{ color: 'var(--gold)' }}
        >
          <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'A sincronizar…' : 'Sincronizar'}
        </button>
        <button
          onClick={() => onDisconnect(account.id)}
          disabled={isSyncing || isDisconnecting}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          style={{ color: 'var(--ink-300)' }}
        >
          <Unlink size={11} className={isDisconnecting ? 'animate-pulse' : ''} />
          {isDisconnecting ? 'A desligar…' : 'Desligar'}
        </button>
      </div>
    </div>
  );
}
