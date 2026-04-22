import { motion } from 'framer-motion';
import { Plus, RefreshCw, Unlink, CheckCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { MOCK_ACCOUNTS } from '../data/mock';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const BANKS_AVAILABLE = [
  { name: 'Caixa Geral de Depósitos', logo: 'CGD', color: '#003B71' },
  { name: 'Millennium BCP',           logo: 'BCP', color: '#E31837' },
  { name: 'BPI',                      logo: 'BPI', color: '#004C97' },
  { name: 'Santander',                logo: 'SAN', color: '#EC0000' },
  { name: 'NovoBanco',                logo: 'NB',  color: '#FF6B00' },
  { name: 'Montepio',                 logo: 'MP',  color: '#006838' },
];

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

export function AccountsPage() {
  const totalBalance = MOCK_ACCOUNTS.reduce((s, a) => s + a.balance, 0);

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
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--ink-900)' }}>
          <Plus size={14} />
          Ligar Conta
        </button>
      </motion.div>

      {/* Saldo total — hero card preto */}
      <motion.div {...fadeUp(0.05)}
        className="rounded-2xl p-6"
        style={{ background: 'var(--ink-900)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          Saldo Total Consolidado
        </p>
        <p className="text-[38px] font-black text-white mt-2 leading-none tabular-nums">
          {eur(totalBalance)}
        </p>
        <div className="flex items-center gap-3 mt-4">
          {MOCK_ACCOUNTS.map(acc => (
            <div key={acc.id} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: acc.color }} />
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {acc.bankLogo}
              </span>
            </div>
          ))}
          <span className="text-[11px] ml-auto" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {MOCK_ACCOUNTS.length} contas · Atualizado agora
          </span>
        </div>
      </motion.div>

      {/* Contas ligadas */}
      <div>
        <motion.p {...fadeUp(0.10)}
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--ink-300)' }}>
          Contas Ligadas
        </motion.p>
        <div className="space-y-2.5">
          {MOCK_ACCOUNTS.map((acc, i) => (
            <motion.div key={acc.id} {...fadeUp(0.12 + i * 0.05)}
              className="rounded-2xl p-5" style={card}>
              <div className="flex items-center gap-4">
                {/* Logo do banco */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{ background: acc.color }}>
                  {acc.bankLogo}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[15px]" style={{ color: 'var(--ink-900)' }}>
                      {acc.bankName}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                      <CheckCircle size={9} />
                      Ligado
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-300)' }}>
                    {acc.accountName} · {acc.iban}
                  </p>
                  <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--ink-300)' }}>
                    <Clock size={9} />
                    {format(parseISO(acc.lastSynced), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                  </p>
                </div>

                {/* Saldo */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--ink-900)' }}>
                    {eur(acc.balance)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
                    {acc.currency}
                  </p>
                </div>
              </div>

              {/* Acções */}
              <div className="flex items-center gap-1 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--gold-subtle)]"
                  style={{ color: 'var(--gold)' }}>
                  <RefreshCw size={11} />
                  Sincronizar
                </button>
                <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                  style={{ color: 'var(--ink-300)' }}>
                  <Unlink size={11} />
                  Desligar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bancos disponíveis */}
      <div>
        <motion.p {...fadeUp(0.28)}
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--ink-300)' }}>
          Adicionar Novo Banco
        </motion.p>
        <motion.div {...fadeUp(0.30)} className="rounded-2xl p-5" style={card}>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-300)' }}>
            Ligação segura via PSD2 — o GoldLock só lê dados, nunca movimenta dinheiro.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {BANKS_AVAILABLE.map((bank, i) => {
              const alreadyConnected = MOCK_ACCOUNTS.some(a => a.bankLogo === bank.logo);
              return (
                <motion.button key={bank.name}
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32 + i * 0.04 }}
                  disabled={alreadyConnected}
                  className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all disabled:opacity-50 disabled:cursor-default"
                  style={{
                    borderColor: alreadyConnected ? `${bank.color}25` : 'var(--border)',
                    background: alreadyConnected ? `${bank.color}07` : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!alreadyConnected) (e.currentTarget as HTMLElement).style.background = 'var(--ink-50)';
                  }}
                  onMouseLeave={e => {
                    if (!alreadyConnected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                    style={{ background: bank.color }}>
                    {bank.logo}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink-900)' }}>
                      {bank.name.split(' ').slice(0, 2).join(' ')}
                    </p>
                    {alreadyConnected && (
                      <p className="text-[10px] text-green-600 font-medium">✓ Ligado</p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Info segurança */}
      <motion.div {...fadeUp(0.48)}
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}>
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
    </div>
  );
}
