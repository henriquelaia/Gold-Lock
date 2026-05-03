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

### Sprint 7 — IRS Simulator Persistente ✅
- Backend: serviço novo `services/irsCalculator.ts` extraído de `routes/irs.ts` — única fonte de cálculo (separação regras fiscais ↔ HTTP)
- **Bugfix B1: parcelas IRS_BRACKETS_2024 corrigidas** para valores oficiais OE 2024 (Lei 82/2023). Diferença anterior podia chegar a +731€ no escalão 5
- Backend: `GET /api/irs/simulations` (histórico, LIMIT 50), `GET /:id` (detalhe), `DELETE /:id` (com filtro user_id obrigatório)
- Frontend: hook novo `useDebouncedValue.ts` para debounce de 300 ms do form
- Frontend: hook central `useIRS.ts` (preview, save, simulations list/delete, deduction alerts/confirm) com tipos `SimulateInput`/`SimulationResult`
- **Refactor IRSSimulatorPage** — função `calculateIRS` inline removida; cálculo agora apenas no backend via `useSimulateIRSPreview` debounced. Zero divergência client/server, lógica fiscal num só sítio
- Pré-preenchimento automático a partir de `fiscal_profile` na primeira render (guard `useRef`); botões "Carregar perfil" e "Guardar como perfil"
- Botão "Guardar simulação" persiste em `irs_simulations` e é `disabled` durante fetch/save (evita estado parcial)
- Secção colapsável "Histórico de Simulações" com skeletons e empty state; eliminar com `ConfirmDialog`
- Secção "Alertas de Dedução" preparada (UI completa + skeletons + empty state explicativo) — geração de alertas pelo ML virá num sprint futuro
- **Bugfix B2: removido `if (accessToken === 'demo-token')`** de `useFiscalProfile` (regra absoluta secção 15.2) e `ConnectBankModal`
- **Bugfix B3: removido `irsApi.optimize`** fantasma (endpoint não existe no backend)

### Sprint 10 — Assistente Fiscal IA com OE 2026 ✅

Sprint mais ambicioso até agora — actualização legal completa, multi-agent ML e chat conversacional.

**10a — Motor fiscal OE 2026 (Lei 73-A/2025)**
- `IRS_BRACKETS_2026` com 9 escalões e parcelas recalculadas (12.50% → 48%)
- IRS Jovem (art.º 12.º-B CIRS) com `IRS_JOVEM_EXEMPTION` map (100/75/75/75/50/50/50/25/25/25%) até teto €29.542,15
- Limites PPR por idade: ≤34a → €400, 35–50a → €350, 51+ → €300
- Migration 004: `is_irs_jovem`, `years_working`, `age` em `fiscal_profile`

**10b — 4 agentes ML (FiscalOrchestrator)**
- `DeductionAgent` (TF-IDF + Random Forest) — classifica transações em saúde/educação/habitação/encargos gerais/PPR/não-dedutível com confidence
- `PredictorAgent` (5× GradientBoostingRegressor) — prevê total fim-de-ano por categoria com fallback linear
- `ScenarioAgent` — até 9 cenários greedy (PPR máximo, conjunta vs separada, IRS Jovem, max saúde/educação, combinados, óptimo total) com poupança ordenada
- `ScoreAgent` — score 0–100 em 5 sub-componentes (cobertura, utilização limites, PPR, eficiência efectiva, sensibilidade ao escalão)

**10c — Página `/irs` unificada**
- Substitui `IRSSimulatorPage` + `FiscalAssistantPage` (ambas apagadas)
- 3 tabs: **Otimizar** (3 lentes — ⚡Ainda dá tempo / 📚Lições para 2027 / ✅Manter), **Editar dados**, **Detalhes**
- Componentes novos: `Hero` (dark card com valor grande dourado, 3 KPIs e action footer integrada), `ActionCard` (3 variants: urgent/lesson/keep com tags deadline/law)
- `LessonsAgent` novo — categorias <30% subutilização, merchants não-dedutíveis >€50, hábitos >80% utilização
- `FiscalOrchestrator.analyze()` devolve `this_year_actions`, `next_year_lessons`, `keep_doing`
- `/fiscal-assistant` redirecciona para `/irs`; sidebar limpa
- Lucide SVGs (sem emojis), tokens gold/ink-900/ink-500

**10d — Polish, agregação familiar e chat IA (3 fases)**

*Fase 1 — Polish + auto-agregação:*
- `EmptyState.tsx` e `GlassButton.tsx` corrigidos de roxo `#493ee5` para `var(--gold)` (afecta 7 páginas)
- `fiscalAssistant.ts` agora consulta `investments` e passa-os ao ML
- Cenário `redirect_to_ppr` (redirecionar parte de ações/ETFs para PPR)
- Lição "Investimentos sem benefício fiscal" para utilizadores com ações mas sem PPR

*Fase 2 — IRS Jovem vs incluir com pais como dependente:*
- Migration 005: `parent_household_income`, `parent_marital_status`, `parent_other_dependents`, `can_be_aggregated_with_parents`
- Cenário `aggregated_with_parents` (art.º 13.º n.º 4 CIRS): elegível se ≤25 anos e rendimento ≤ RMMG×14 (€12.180 em 2026)
- Helper `_calc_household` activa quociente conjugal quando os pais são casados
- Compara 2 caminhos: jovem sozinho com IRS Jovem **vs** rendimento somado ao agregado dos pais com +1 dependente
- Frontend: secção "Família" condicional no tab Editar com badge "Elegível" dourado

*Fase 3 — Chat IA fiscal persistente:*
- Migration 006: `chat_conversations` + `chat_messages` (com tracking de tokens input/output/cache)
- Backend: `@anthropic-ai/sdk@^0.92`, `fiscalChatService.ts` com prompt caching (5min TTL Anthropic) que injecta contexto fiscal completo (perfil + transações + cenários) no system prompt
- Backend: `fiscalChat.ts` com SSE streaming (`POST /message`), GET/DELETE conversations
- Frontend: `useFiscalChat.ts` com streaming via `fetch` + `ReadableStream` (EventSource não suporta Authorization)
- Frontend: `FiscalChat.tsx` drawer 420px lateral com 4 sugestões, textarea, bubbles, histórico colapsável
- Botão flutuante dourado "Pergunta-me" bottom-right em `IRSPage`
- 503 controlado quando `ANTHROPIC_API_KEY` ausente — resto da app continua

---

## Sprints Planeados

### Sprint 9 — PDF Import de Corretoras 🔜 **(Próximo)**
**Objetivo:** Importar extratos PDF de Degiro, XTB e Trade Republic automaticamente.

**Tarefas:**
- [ ] `POST /api/investments/import-pdf` — multer + pdfjs-dist
- [ ] Parsers por corretora: regexes para extrair transações de cada formato
- [ ] Frontend: drag-and-drop de PDF, preview dos dados extraídos antes de confirmar
- [ ] Validação: verificar duplicados por ISIN + data antes de inserir

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
