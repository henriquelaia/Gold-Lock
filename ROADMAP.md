# Gold Lock — Roadmap de Sprints

Projeto académico UBI 2025/2026 — Henrique Miguel Silva Laia (Nº 51667)

---

## Sprints Concluídos

### Sprint 1 — Infraestrutura ✅
- Docker Compose com 5 serviços (postgres, redis, backend, frontend, ml-service)
- Schema PostgreSQL inicial (8 tabelas)
- ML Service: Flask + TF-IDF + Random Forest para categorização

### Sprint 2 — Autenticação ✅
- Registo + login com bcrypt (cost factor 12)
- JWT HS256 (15 min access token) + refresh tokens em Redis (7 dias)
- Rate limiting: 100 req/15 min global, 10 req/15 min em endpoints auth
- Middleware `authenticate` + `errorHandler` + `AppError`

### Sprint 3 — UI de Autenticação ✅
- VerifyEmail, ForgotPassword, ResetPassword
- 2FA TOTP (Google Authenticator compatível) — setup + enable + disable
- Settings: alterar password, avatar, nome
- 13 páginas de frontend com design system Ink + Gold
- Componentes UI reutilizáveis: GlassCard, GlassButton, LoadingSpinner, EmptyState

### Sprint 4 — Open Banking ✅
- Salt Edge API v6: criação de customer, connect URL, sincronização de contas e transações
- `POST /api/accounts/sync` e `POST /api/transactions/sync`
- Webhook handler para eventos Salt Edge (account_created, transaction_created, etc.)
- UNIQUE constraints para evitar duplicados no sync
- Tabela `investments` com router CRUD completo

### Sprint 4b — Qualidade ✅
- GitHub Actions CI: typecheck + lint + build em cada push para `main` e `feat/**`
- ESLint 9 (flat config) em frontend e backend
- Email migrado de nodemailer para **Resend SDK**
- Demo mode removido completamente (demo-token, dev verify endpoint, mock fallbacks)
- Correção de bugs: webhook bank_name/account_name, PUT investments incompleto
- Índices de performance adicionados: `idx_categories_parent`, `idx_transactions_user_date`

### Sprint 8 — Investimentos: Portfólio + Cotações Reais ✅
- Serviço `marketDataService.ts` com **Massive API** (ações/ETFs, Bearer auth) e CoinGecko (crypto)
- Endpoints `/api/market/quote/:ticker`, `/search`, `/history/:ticker?period=30d|1y`
- Cache Redis com TTL 15 min (quotes) e 1 h (history)
- `InvestmentsPage.tsx` com P&L live, gráfico histórico e pesquisa de tickers
- Hook `useMarketData.ts` (`useMarketQuote`, `useMarketHistory`, `useMarketSearch`)
- Logo SVG (cadeado dourado) e templates de email com tokens ink+gold

### Sprint 5 — Dashboard + Transações com Dados Reais ✅
- `DashboardPage.tsx` ligado a `useTransactionSummary`, `useTransactions`, `useAccounts`, `useInvestments`, `useBudgets`, `useGoals` — dados reais
- Skeletons pulsantes (CSS puro, `animate-pulse`) nos 4 KPIs, gráfico de áreas e lista de transações recentes
- Empty state: CTA dourado central no card de Saldo Total quando o utilizador não tem contas ligadas → `/accounts`
- Insights automáticos (over-budget, near-goal, taxa de poupança)
- `TransactionsPage.tsx` com filtros funcionais: tipo, **categoria (UUID — bug pré-existente corrigido)**, **mês (últimos 12)**, **conta bancária**, pesquisa client-side
- Reset à página 1 em todas as mudanças de filtro; "Limpar filtros" cobre os 5 estados
- Exportação CSV das transações filtradas
- Zero referências a `mock.ts` em código de produção das páginas alteradas

### Sprint 6 — Budgets, Goals e Categories ✅
- Backend `POST /api/categories` com schema Zod (name, namePt, icon, color hex, isExpense, parentId, irsDeductionCategory) + validação que `parentId` aponta para categoria existente
- `GET /api/categories` agora devolve também `parent_id` para suportar hierarquia
- `categoriesApi.create` alargado para aceitar `parentId`/`isExpense`/`irsDeductionCategory`
- Hook novo `useCreateCategory` em `useTransactions.ts` (invalida `['categories']`)
- `CategoriesPage.tsx` (nova) — listagem agrupada por `parent_id` (raízes + subcategorias indentadas), modal de criação com slug auto-gerado a partir do nome PT, color picker, badges Despesa/Receita, skeletons
- Rota `/categories` em `App.tsx` + entrada **Categorias** com ícone `Tag` na Sidebar (após "Metas")
- `BudgetsPage.tsx`: `LoadingSpinner` substituído por skeletons pulsantes (header + summary + grid 2x2); novo botão `Pencil` no `BudgetCard` que abre modal de edição
- `BudgetFormModal` factorizado a partir do `CreateBudgetModal` — modo `create`/`edit` partilha o mesmo formulário com pré-preenchimento e usa `useUpdateBudget` quando há `initial`
- `GoalsPage.tsx`: `LoadingSpinner` substituído por skeletons pulsantes (header + summary + grid 2x2)
- Backend já tinha `spent` injectado em `GET /api/budgets` (subquery com transações do mês corrente) — sem alterações necessárias

---

## Sprints Planeados

### Sprint 7 — IRS Simulator Persistente 🔜 **(Próximo)**
**Objetivo:** Guardar simulações IRS no backend, histórico de simulações por utilizador.

**Tarefas:**
- [ ] `POST /api/irs/simulate` — guardar resultado em `irs_simulations`
- [ ] `GET /api/irs/simulations` — histórico de simulações do utilizador
- [ ] `IRSSimulatorPage.tsx` — ligar ao backend, mostrar histórico
- [ ] Pré-preencher dados do perfil fiscal (`fiscal_profile`) na simulação
- [ ] Deduction alerts: ligar alertas automáticos às transações reais

---

### Sprint 9 — PDF Import de Corretoras
**Objetivo:** Importar extratos PDF de Degiro, XTB e Trade Republic automaticamente.

**Tarefas:**
- [ ] `POST /api/investments/import-pdf` — multer + pdfjs-dist
- [ ] Parsers por corretora: regexes para extrair transações de cada formato
- [ ] Frontend: drag-and-drop de PDF, preview dos dados extraídos antes de confirmar
- [ ] Validação: verificar duplicados por ISIN + data antes de inserir

---

### Sprint 10 — Assistente Fiscal IA
**Objetivo:** Chatbot fiscal que responde a perguntas sobre IRS, deduções e otimização fiscal.

**Tarefas:**
- [ ] `POST /api/ai/fiscal-chat` — OpenAI GPT-4 com contexto do perfil fiscal do utilizador
- [ ] Contexto: perfil fiscal, simulações anteriores, deduction alerts pendentes
- [ ] `AIAssistantPage.tsx` — interface de chat com histórico
- [ ] Rate limiting específico para chamadas AI (custo por token)

---

### Sprint 11 — Testes
**Objetivo:** ≥70% de cobertura de código com testes unitários e E2E.

**Tarefas:**
- [ ] Backend: Jest + Supertest para todos os endpoints (happy path + erros)
- [ ] Frontend: Vitest + React Testing Library para hooks e componentes críticos
- [ ] E2E: Playwright — fluxo de registo → login → dashboard → transações
- [ ] CI: adicionar step de testes ao GitHub Actions

---

### Sprint 12 — Deploy + Relatório Final
**Objetivo:** Plataforma acessível publicamente, documentação académica completa.

**Tarefas:**
- [ ] Backend: deploy para **Railway** (auto-deploy em push para `main`)
- [ ] Frontend: deploy para **Vercel**
- [ ] PostgreSQL: Railway managed DB ou Supabase
- [ ] Domínio personalizado (opcional)
- [ ] Relatório LaTeX (template UBI): ~40 páginas
- [ ] Poster A0 para apresentação
- [ ] Apresentação final (PowerPoint/Keynote)

---

## Notas de Arquitetura

- **Sem backwards-compat hacks**: código legado de demo mode foi removido limpo (Sprint 4b)
- **Email**: Resend SDK (transaccional) — template HTML em `emailService.ts`
- **Open Banking**: Salt Edge v6 — apenas leitura de contas (PSD2 AIS)
- **Segurança**: OWASP Top 10 verificado, JWT + Redis sessions, bcrypt cost 12, rate limiting
- **TypeScript strict**: `noImplicitAny`, `strictNullChecks` ativos em frontend e backend
