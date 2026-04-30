# Gold Lock — Plataforma de Gestão Financeira Pessoal

[![CI](https://github.com/henrique-laia/goldlock/actions/workflows/ci.yml/badge.svg)](https://github.com/henrique-laia/goldlock/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Node](https://img.shields.io/badge/Node.js-20-green)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

Plataforma web de gestão financeira pessoal com integração Open Banking (PSD2/Salt Edge), categorização automática de transações com Machine Learning e simulação fiscal IRS 2024 — desenhada especificamente para o mercado **português**.

**Projeto de Engenharia Informática — Universidade da Beira Interior (2025/2026)**  
Aluno: Henrique Miguel Silva Laia (Nº 51667)  
Orientador: Professor Doutor Nuno Pombo

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│               React 18 + TypeScript + Vite                  │
│              (Tailwind · Framer Motion · Zustand)           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / Axios (JWT Bearer)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Backend API  :4000                            │
│           Node.js 20 + Express 4 + TypeScript               │
│      (JWT · Redis sessions · Rate limiting · Zod)           │
└────┬──────────────┬──────────────┬───────────────────────────┘
     │              │              │
     ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────────┐
│ Postgres│  │  Redis 7 │  │  ML Service  │
│   :5432 │  │  :6379   │  │  Flask :5000 │
│ (dados) │  │ (sessões)│  │ (categorias) │
└─────────┘  └──────────┘  └──────────────┘
     ▲
     │  Open Banking (PSD2)
┌─────────────┐
│  Salt Edge  │
│    API v6   │
└─────────────┘
```

---

## Stack Tecnológica

| Camada | Tecnologia | Porta |
|--------|-----------|-------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + Framer Motion | 3000 |
| Backend | Node.js 20 + Express 4 + TypeScript | 4000 |
| ML Service | Python 3.12 + Flask + scikit-learn | 5000 |
| Base de Dados | PostgreSQL 16 | 5432 |
| Cache / Sessions | Redis 7 | 6379 |
| Open Banking | Salt Edge API v6 (PSD2) | — |
| Email | Resend SDK | — |
| Autenticação | JWT HS256 (15 min) + Refresh tokens (7 dias, Redis) + 2FA TOTP | — |
| Containerização | Docker Compose (5 serviços) | — |

---

## Quick Start

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 20+](https://nodejs.org/) (para desenvolvimento local sem Docker)

### Com Docker (recomendado)

```bash
# 1. Clonar o repositório
git clone https://github.com/henrique-laia/goldlock.git
cd goldlock

# 2. Configurar variáveis de ambiente
cp src/backend/.env.example .env
# Editar .env com as tuas chaves (ver secção abaixo)

# 3. Iniciar todos os serviços
docker compose up --build

# 4. Aceder à aplicação
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000/api/health
# ML Service: http://localhost:5000/health
```

> **Nota:** O ficheiro `.env` deve estar na **raiz do repositório** (ao lado de `docker-compose.yml`), não dentro de `src/backend/`.

### Sem Docker (desenvolvimento)

```bash
# Iniciar PostgreSQL e Redis localmente (ou via Docker individualmente)

# Backend
cd src/backend
cp .env.example .env  # configurar variáveis
npm install && npm run dev

# Frontend (outro terminal)
cd src/frontend
npm install && npm run dev

# ML Service (outro terminal)
cd src/ml-service
pip install -r requirements.txt && python -m flask run
```

---

## Variáveis de Ambiente

Copiar `src/backend/.env.example` para `.env` na raiz e preencher:

```env
# Obrigatórias
JWT_SECRET=<string aleatória de 64 caracteres>
DATABASE_URL=postgresql://goldlock:goldlock_dev@postgres:5432/goldlock_db
REDIS_URL=redis://redis:6379

# Email (Resend — https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@teudominio.com

# Open Banking — Salt Edge (https://www.saltedge.com/)
SALT_EDGE_APP_ID=
SALT_EDGE_SECRET=

# Market Data — Massive (https://massive.com)
MASSIVE_API_KEY=

# Frontend
VITE_API_URL=http://localhost:4000/api

# Opcional — Assistente fiscal IA (Sprint 10)
OPENAI_API_KEY=
```

---

## Principais Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Login (+ 2FA opcional) |
| POST | `/api/auth/refresh` | Renovar access token |
| GET | `/api/auth/me` | Dados do utilizador autenticado |
| POST | `/api/accounts/connect` | Ligar conta bancária (Salt Edge) |
| POST | `/api/accounts/sync` | Sincronizar todas as contas |
| GET | `/api/transactions` | Listar transações (com filtros e paginação) |
| GET | `/api/transactions/summary` | Resumo de receitas/despesas por mês |
| GET | `/api/budgets` | Listar orçamentos (inclui `spent` calculado das transações do mês) |
| GET | `/api/goals` | Listar metas de poupança |
| GET | `/api/categories` | Listar categorias (com `parent_id` para hierarquia) |
| POST | `/api/categories` | Criar categoria/subcategoria (com `parentId` opcional) |
| POST | `/api/irs/simulate` | Simular IRS 2024 |
| GET | `/api/investments` | Listar portfólio de investimentos |
| GET | `/api/market/quote/:ticker` | Cotação atual (Massive p/ ações & ETFs, CoinGecko p/ crypto) |
| GET | `/api/market/search?q=` | Pesquisa de tickers |
| GET | `/api/market/history/:ticker?period=30d\|1y` | Histórico de preços |
| GET | `/api/health` | Health check |

Resposta padrão: `{ "status": "success", "data": ... }` ou `{ "status": "error", "message": ... }`

---

## Estrutura do Projeto

```
FinTwin-Projeto/
├── docker-compose.yml              # Orquestração dos 5 containers
├── .env.example                    # (raiz) template para Docker Compose
├── .github/workflows/ci.yml        # GitHub Actions CI
├── src/
│   ├── frontend/                   # React 18 + Vite
│   │   └── src/
│   │       ├── components/         # UI (GlassCard, GlassButton, etc.), layout, auth
│   │       ├── pages/              # 13 páginas da aplicação
│   │       ├── services/api.ts     # Axios central + todos os API clients
│   │       ├── hooks/              # React Query hooks por módulo
│   │       ├── store/              # Zustand (authStore, toastStore)
│   │       └── types/              # Tipos TypeScript partilhados
│   ├── backend/                    # Node.js + Express
│   │   ├── src/
│   │   │   ├── routes/             # auth, accounts, transactions, budgets, goals,
│   │   │   │                       # categories, irs, fiscal-profile, investments
│   │   │   ├── middleware/         # authenticate, errorHandler, rateLimiter
│   │   │   ├── services/           # authService, emailService, marketDataService*
│   │   │   └── config/             # database (pg Pool), redis
│   │   ├── database/
│   │   │   ├── init.sql            # Schema completo (10 tabelas + índices)
│   │   │   └── migrations/         # Ficheiros de migração incremental
│   │   └── .env.example            # Template de variáveis do backend
│   └── ml-service/                 # Python + Flask
│       └── app/
│           ├── main.py             # Endpoints /categorize, /retrain
│           └── categorizer.py      # TF-IDF + Random Forest
├── docs/
│   └── specs/                      # Design specs de módulos
├── relatorio/                      # Relatório LaTeX (UBI template)
└── poster/                         # Poster A0
```

---

## Pipeline de Qualidade

| Ferramenta | Estado |
|-----------|--------|
| TypeScript strict mode | ✅ Frontend + Backend |
| ESLint 9 (flat config) | ✅ Frontend + Backend |
| GitHub Actions CI | ✅ typecheck + lint + build em cada push |
| Testes unitários | ⏳ Sprint 11 — Vitest + Jest |
| Testes E2E | ⏳ Sprint 11 — Playwright |
| Deploy automático | ⏳ Sprint 12 |

```bash
# Verificar qualidade localmente
cd src/backend  && npm run typecheck && npm run lint && npm run build
cd src/frontend && npm run typecheck && npm run lint && npm run build
```

---

## Estado de Implementação

| Sprint | Estado | Funcionalidades |
|--------|--------|----------------|
| 1 | ✅ | Docker Compose, PostgreSQL, Redis, ML Service |
| 2 | ✅ | Auth: JWT, bcrypt, sessions, rate limiting |
| 3 | ✅ | UI auth: VerifyEmail, ForgotPassword, 2FA TOTP, Settings |
| 4 | ✅ | Open Banking: Salt Edge v6, sync, webhooks |
| 4b | ✅ | CI/CD, ESLint 9, Resend, remoção de demo mode |
| 8 | ✅ | Investimentos: cotações Massive + CoinGecko, P&L live, gráfico |
| 5 | ✅ | Dashboard + Transações com dados reais (skeletons, filtros mês/conta, fix categoria) |
| 6 | ✅ | Budgets edição + Goals skeletons + CategoriesPage com subcategorias |
| 7 | 🔜 | IRS Simulator persistente no backend |
| 9 | ⏳ | PDF import de corretoras (Degiro, XTB, Trade Republic) |
| 10 | ⏳ | Assistente Fiscal IA (OpenAI) |
| 11 | ⏳ | Testes (Vitest + Jest, ≥70% cobertura) |
| 12 | ⏳ | Deploy + Relatório LaTeX final |

Ver [`ROADMAP.md`](ROADMAP.md) para detalhes completos.

---

## Licença

Projeto académico — Universidade da Beira Interior, 2026.
