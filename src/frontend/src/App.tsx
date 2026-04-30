import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';

import { LoginPage }         from './pages/LoginPage';
import { VerifyEmailPage }   from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

import { DashboardPage }     from './pages/DashboardPage';
import { TransactionsPage }  from './pages/TransactionsPage';
import { BudgetsPage }       from './pages/BudgetsPage';
import { GoalsPage }         from './pages/GoalsPage';
import { CategoriesPage }    from './pages/CategoriesPage';
import { AccountsPage }      from './pages/AccountsPage';
import { IRSSimulatorPage }  from './pages/IRSSimulatorPage';
import { SettingsPage }      from './pages/SettingsPage';
import { InvestmentsPage }   from './pages/InvestmentsPage';
import { LearnPage }         from './pages/LearnPage';
import { NotFoundPage }      from './pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Rotas protegidas — requerem autenticação */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/"             element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets"      element={<BudgetsPage />} />
            <Route path="/goals"        element={<GoalsPage />} />
            <Route path="/categories"   element={<CategoriesPage />} />
            <Route path="/accounts"     element={<AccountsPage />} />
            <Route path="/investments"  element={<InvestmentsPage />} />
            <Route path="/irs"          element={<IRSSimulatorPage />} />
            <Route path="/learn"        element={<LearnPage />} />
            <Route path="/settings"     element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ToastContainer />
    </ErrorBoundary>
  );
}

export default App;
