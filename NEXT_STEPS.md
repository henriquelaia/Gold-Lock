# Gold Lock — Próximos Passos

**Estado:** Sprints 2 e 3 concluídos ✅  
**Próximo:** Sprint 4 — Open Banking (Salt Edge API)

---

## Commit pendente (fazer antes de continuar)

```bash
git add .
git commit -m "feat(auth): Sprint 2-3 — state management, auth pages, UI library + security hardening

Sprints 2 e 3 concluídos: infraestrutura de estado, páginas de autenticação completas,
biblioteca de componentes Liquid Glass e correções de segurança críticas.

State management:
- Zustand authStore (user + accessToken persistidos; refreshToken removido do localStorage — fix XSS)
- React Query client (staleTime 30s, retry 1, devtools em DEV)
- Axios interceptor com refresh automático (queue pattern; fix loop duplo com _retry)

Proteção de rotas:
- PrivateRoute com hydration guard (fix race condition Zustand persist na primeira render)
- clearAuth apenas em 401, não em falhas de rede/5xx

Páginas de autenticação:
- VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage, SettingsPage (tabs Perfil/Segurança/2FA)
- TotpSetupModal com QR code e confirmação de 6 dígitos
- GoalsPage (stub Sprint 6)

UI — componentes reutilizáveis (Liquid Glass):
- GlassCard, GlassButton, LoadingSpinner, EmptyState, ErrorBoundary, PageHeader

Backend — correções de segurança:
- HTML injection em emails: escapeHtml() aplicado ao campo name (emailService)
- TOTP replay attack: Redis key totp_used:{userId}:{code} com TTL 90s (authService)
- setupTotp: QR code gerado ANTES de escrever na BD (fix inconsistência em caso de erro)
- invalidateAllSessions: try/catch com AppError 503 (garante falha explícita no reset)
- generateRefreshToken: try/catch com AppError 503 em vez de ReplyError raw
- authenticate middleware: verifica iat do JWT contra sessions_invalidated:{userId} no Redis
- Rate limiting: authRateLimiter adicionado a /verify-email, /refresh, /logout
- avatarUrl: validação HTTPS enforced via Zod (startsWith 'https://')
- Logout: apenas ZodError é silenciado; erros Redis/BD propagam para error handler
- Redis e PostgreSQL: process.exit(1) em falha de conexão no arranque (fail-fast)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Sprint 4 — Open Banking (Salt Edge API)

### Pré-requisitos antes de começar

1. **Credenciais Salt Edge Sandbox**
   - Registar em https://www.saltedge.com/pages/dashboard (conta gratuita)
   - Criar uma aplicação em modo sandbox
   - Obter `App ID` e `Secret`
   - Adicionar ao `src/backend/.env`:
     ```
     SALT_EDGE_APP_ID=your_app_id
     SALT_EDGE_SECRET=your_secret
     SALT_EDGE_BASE_URL=https://www.saltedge.com/api/v5
     ```

2. **ngrok para webhooks em desenvolvimento**
   ```bash
   ngrok http 4000
   # Usar a URL https://xxxx.ngrok.io/api/accounts/webhook no dashboard Salt Edge
   ```

### Ficheiros a criar/editar — Backend

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/backend/src/services/saltEdgeService.ts` | CRIAR | Cliente HTTP Salt Edge: createCustomer, createConnectSession, getAccounts, getTransactions, deleteConnection |
| `src/backend/src/routes/accounts.ts` | EDITAR | Implementar 4 rotas (tirar 501): GET /accounts, POST /connect, GET /:id/balance, DELETE /:id |
| `src/backend/src/routes/accounts.ts` | EDITAR | Adicionar POST /api/accounts/webhook |
| `src/backend/src/middleware/saltEdgeWebhook.ts` | CRIAR | Verificar assinatura HMAC do webhook Salt Edge |

### Ficheiros a criar/editar — Frontend

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/frontend/src/pages/AccountsPage.tsx` | EDITAR | Lista de contas, botão "Ligar banco", estado de sync |
| `src/frontend/src/components/accounts/BankCard.tsx` | CRIAR | Card: nome banco, IBAN parcial, saldo, última sync, botão desligar |
| `src/frontend/src/components/accounts/ConnectBankModal.tsx` | CRIAR | Lista bancos PT, inicia fluxo Salt Edge |
| `src/frontend/src/hooks/useAccounts.ts` | CRIAR | React Query hook para contas |

### Verificação Sprint 4
- Ligar conta sandbox → URL de redirect Salt Edge abre
- Após autorizar → conta aparece em GET /api/accounts
- Saldo visível na UI em AccountsPage

---

## Sprint 5 — Dashboard + Transações

Depende do Sprint 4 (Open Banking) para ter dados reais.  
Pode ser feito com dados mock se Salt Edge ainda não estiver ligado.

Ficheiros principais:
- `src/backend/src/services/transactionService.ts` (CRIAR)
- `src/backend/src/routes/transactions.ts` (EDITAR — tirar 501)
- `src/frontend/src/pages/DashboardPage.tsx` (EDITAR)
- `src/frontend/src/pages/TransactionsPage.tsx` (EDITAR)
- Componentes recharts: BalanceTrendChart, SpendingPieChart

---

## Sprint 6 — ML + Budgets + Goals + Categories

- `src/backend/src/routes/budgets.ts` (EDITAR — tirar 501)
- `src/backend/src/routes/goals.ts` (CRIAR)
- `src/backend/src/routes/categories.ts` (EDITAR)
- `src/frontend/src/pages/BudgetsPage.tsx` (EDITAR)
- `src/frontend/src/pages/GoalsPage.tsx` (EDITAR — tirar stub)

---

## Sprint 7 — Simulador IRS (Motor CIRS 2025)

Motor determinístico em TypeScript com os 9 escalões OE 2025 (Lei n.º 24-D/2024).

- `src/backend/src/services/irsService.ts` (CRIAR)
- `src/backend/src/routes/irs.ts` (EDITAR — tirar 501)
- `src/frontend/src/pages/IRSSimulatorPage.tsx` (EDITAR)

---

## Sprint 8 — IA Fiscal

- `ml-service/app/deduction_classifier.py` (CRIAR)
- `ml-service/app/irs_engine.py` (CRIAR)
- `ml-service/app/fiscal_optimizer.py` (CRIAR)

---

## Sprint 9 — Notificações + Testes + Relatório

- `src/backend/src/services/cronService.ts` (CRIAR)
- Completar relatório LaTeX em `relatorio/`

---

## Sprint 10 — Carteira de Investimentos

### Objetivo
Agregar posições de múltiplas corretoras numa única plataforma com preços em tempo real — funcionalidade equivalente ao Getquin, adaptada ao mercado PT.

### Pré-requisitos
- Sprints 4-9 concluídos (dados de transações bancárias disponíveis)
- Nenhuma API key adicional necessária (yfinance e CoinGecko são gratuitos)

### Estratégia de importação por corretora

| Corretora | Método | Notas |
|-----------|--------|-------|
| XTB | CSV + xAPI (REST) | API documentada, requer credenciais da conta |
| Trading 212 | CSV + API REST beta | API beta pública disponível |
| Lightyear | CSV | Sem API pública |
| Freedom24 | CSV | Sem API pública |
| TradeRepublic | CSV | Sem API oficial |
| ByBit EU | CSV + REST API | API bem documentada |

### Ficheiros a criar/editar — ML Service (Python)

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/ml-service/app/price_service.py` | CRIAR | GET /prices/quote (yfinance — ações, ETFs), GET /prices/crypto (CoinGecko — cripto); cache Redis TTL 30s |
| `src/ml-service/app/main.py` | EDITAR | Registar price_service blueprint |

### Ficheiros a criar/editar — Backend

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/backend/src/services/portfolioService.ts` | CRIAR | Agregar posições, calcular P&L por ativo e total, diversificação |
| `src/backend/src/services/brokerImportService.ts` | CRIAR | Parsers CSV por corretora; cliente XTB xAPI e Trading212 API |
| `src/backend/src/routes/investments.ts` | CRIAR | GET /api/investments, POST /api/investments/import (CSV upload), GET /api/investments/prices |
| `src/backend/src/server.ts` | EDITAR | Registar investments router |
| `src/backend/database/init.sql` | EDITAR | Adicionar tabelas: investment_portfolios, investment_transactions, investment_positions |

### Ficheiros a criar/editar — Frontend

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/frontend/src/pages/InvestmentsPage.tsx` | EDITAR | Carteira com posições, P&L, gráfico evolução, análise diversificação |
| `src/frontend/src/components/investments/PortfolioChart.tsx` | CRIAR | Recharts AreaChart evolução valor total da carteira |
| `src/frontend/src/components/investments/PositionCard.tsx` | CRIAR | Card por ativo: símbolo, quantidade, custo médio, valor atual, P&L |
| `src/frontend/src/components/investments/ImportModal.tsx` | CRIAR | Upload CSV + seleção de corretora; progress bar de importação |
| `src/frontend/src/components/investments/DiversificationChart.tsx` | CRIAR | Recharts PieChart distribuição por classe de ativo |
| `src/frontend/src/hooks/useInvestments.ts` | CRIAR | React Query: posições, preços (polling 30s), histórico |

### Novos endpoints

```
GET    /api/investments              → carteira valorizada (posições + preços real-time)
POST   /api/investments/import       → upload CSV { broker, file } → retorna transações importadas
GET    /api/investments/prices       → preços atuais dos ativos em carteira
GET    /api/investments/history      → evolução valor total por mês
```

### Verificação Sprint 10
- Upload CSV XTB → posições aparecem com P&L correto
- Preço AAPL atualiza em tempo real (< 30s de latência)
- Carteira valorizada integrada no dashboard principal

---

## Como retomar a sessão de trabalho

Ao iniciar nova conversa com Claude:

> "Estamos a trabalhar no projeto Gold Lock (PFM académico, UBI 3º ano). Sprints 2 e 3 estão concluídos (auth frontend, Zustand, React Query, PrivateRoute, segurança). Lê o ficheiro NEXT_STEPS.md na raiz do projeto e o plano em /home/boyboy/.claude/plans/clever-kindling-mitten.md. Próximo passo: Sprint 4 — Open Banking Salt Edge."
