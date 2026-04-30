import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  Tag,
  Calculator,
  Landmark,
  Settings,
  LogOut,
  TrendingUp,
  GraduationCap,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transações' },
  { to: '/accounts',     icon: Landmark,        label: 'Contas' },
  { to: '/investments',  icon: TrendingUp,      label: 'Investimentos' },
  { to: '/budgets',      icon: PiggyBank,       label: 'Orçamentos' },
  { to: '/goals',        icon: Target,          label: 'Metas' },
  { to: '/categories',   icon: Tag,             label: 'Categorias' },
  { to: '/irs',          icon: Calculator,      label: 'Simulador IRS' },
  { to: '/learn',        icon: GraduationCap,   label: 'Aprende' },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <aside
      className="w-56 flex flex-col shrink-0 h-full"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--ink-900)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2.5" y="7.5" width="11" height="7" rx="1.5" stroke="white" strokeWidth="1.2"/>
              <path d="M5 7.5V5C5 3.343 6.343 2 8 2C9.657 2 11 3.343 11 5V7.5"
                stroke="#C9A227" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="11" r="1.2" fill="#C9A227"/>
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-black tracking-tight leading-none" style={{ color: 'var(--ink-900)' }}>
              Gold<span style={{ color: 'var(--gold)' }}>Lock</span>
            </div>
            <div className="text-[9px] font-semibold mt-0.5 tracking-[0.12em] uppercase"
              style={{ color: 'var(--ink-300)' }}>
              Finance
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.04]"
            style={{ color: 'var(--ink-400)' }}>
            <X size={15} />
          </button>
        )}
      </div>

      <div className="mx-4 mb-2" style={{ height: '1px', background: 'var(--border)' }} />

      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="block"
            onClick={onClose}
          >
            {({ isActive }) => (
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer"
                style={{
                  background: isActive ? 'var(--gold-subtle)' : 'transparent',
                  color: isActive ? 'var(--ink-900)' : 'var(--ink-500)',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: isActive ? 'var(--gold)' : 'currentColor' }}
                />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--gold)' }} />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-4 mt-2" style={{ height: '1px', background: 'var(--border)' }} />

      <div className="p-3 space-y-0.5">
        <NavLink to="/settings" className="block" onClick={onClose}>
          {({ isActive }) => (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                background: isActive ? 'var(--gold-subtle)' : 'transparent',
                color: isActive ? 'var(--ink-900)' : 'var(--ink-500)',
              }}
            >
              <Settings className="w-4 h-4 shrink-0"
                style={{ color: isActive ? 'var(--gold)' : 'currentColor' }} />
              Definições
            </div>
          )}
        </NavLink>

        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: 'var(--ink-700)' }}>
              {user.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--ink-900)' }}>
                {user.name}
              </p>
              <p className="text-[10px] truncate leading-tight" style={{ color: 'var(--ink-300)' }}>
                {user.email}
              </p>
            </div>
          </div>
        )}

        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors hover:bg-red-50 hover:text-red-500"
          style={{ color: 'var(--ink-300)' }}>
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
