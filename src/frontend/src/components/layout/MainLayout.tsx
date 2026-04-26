import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(17,17,16,0.45)', backdropFilter: 'blur(2px)' }}
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer panel */}
            <motion.div
              className="absolute left-0 top-0 h-full"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <Sidebar onClose={() => setDrawerOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.04]"
            aria-label="Abrir menu"
            style={{ color: 'var(--ink-900)' }}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--ink-900)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <rect x="2.5" y="7.5" width="11" height="7" rx="1.5" stroke="white" strokeWidth="1.2"/>
                <path d="M5 7.5V5C5 3.343 6.343 2 8 2C9.657 2 11 3.343 11 5V7.5"
                  stroke="#C9A227" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="8" cy="11" r="1.2" fill="#C9A227"/>
              </svg>
            </div>
            <span className="text-sm font-black tracking-tight" style={{ color: 'var(--ink-900)' }}>
              Gold<span style={{ color: 'var(--gold)' }}>Lock</span>
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
