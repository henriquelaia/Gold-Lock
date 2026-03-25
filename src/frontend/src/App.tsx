import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { BudgetsPage } from './pages/BudgetsPage'
import { IRSSimulatorPage } from './pages/IRSSimulatorPage'
import { AccountsPage } from './pages/AccountsPage'
import { LoginPage } from './pages/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/irs" element={<IRSSimulatorPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
      </Route>
    </Routes>
  )
}

export default App
