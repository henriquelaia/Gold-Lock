import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Calculator,
  Landmark,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/budgets', icon: PiggyBank, label: 'Orçamentos' },
  { to: '/irs', icon: Calculator, label: 'Simulador IRS' },
  { to: '/accounts', icon: Landmark, label: 'Contas' },
]

export function Sidebar() {
  return (
    <aside className="glass-sidebar w-64 flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">
          FinTwin
        </h1>
        <p className="text-xs text-gray-500 mt-1">Gestão Financeira Pessoal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all"
        >
          <Settings size={20} />
          Definições
        </NavLink>
      </div>
    </aside>
  )
}
