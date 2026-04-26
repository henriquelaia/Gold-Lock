# Gold Lock — Plataforma de Gestão Financeira Pessoal

Plataforma web de gestão financeira pessoal com integração Open Banking (PSD2), categorização automática de transações com Machine Learning e simulação fiscal de IRS, especificamente desenhada para o mercado português.

**Projeto de Engenharia Informática — Universidade da Beira Interior (2025/2026)**

Aluno: Henrique Miguel Silva Laia (Nº 51667)
Orientador: Professor Doutor Nuno Pombo

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + TailwindCSS + Framer Motion |
| Backend | Node.js + Express + TypeScript |
| ML Service | Python + scikit-learn + Flask |
| Base de Dados | PostgreSQL 16 |
| Cache | Redis 7 |
| Open Banking | Salt Edge API (PSD2) |
| Autenticação | Custom JWT + Redis (2FA TOTP) |
| Containerização | Docker + Docker Compose |

## Quick Start

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 20+](https://nodejs.org/) (para desenvolvimento local sem Docker)
- [Python 3.12+](https://python.org/) (para o serviço ML sem Docker)

### Com Docker (recomendado)

```bash
# 1. Clonar o repositório
git clone https://github.com/henrique-laia/goldlock.git
cd goldlock

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as tuas chaves (Supabase, Salt Edge, etc.)

# 3. Iniciar todos os serviços
docker compose up --build

# 4. Aceder à aplicação
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000/api/health
# ML Service: http://localhost:5000/health
```

### Sem Docker

```bash
# Frontend
cd src/frontend && npm install && npm run dev

# Backend
cd src/backend && npm install && npm run dev

# ML Service
cd src/ml-service && pip install -r requirements.txt && python -m flask run
```

## Estrutura do Projeto

```
Gold Lock-Projeto/
├── docker-compose.yml          # Orquestração dos 5 containers
├── .env.example                # Template de variáveis de ambiente
├── src/
│   ├── frontend/               # React 18 + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── components/     # Componentes React (UI, layout, dashboard)
│   │   │   ├── pages/          # Páginas da aplicação
│   │   │   ├── services/       # Chamadas à API
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── types/          # Tipos TypeScript
│   │   │   └── styles/         # CSS global + Liquid Glass
│   │   └── Dockerfile
│   ├── backend/                # Node.js + Express + TypeScript
│   │   ├── src/
│   │   │   ├── routes/         # Endpoints da API REST
│   │   │   ├── middleware/     # Auth, rate limiting, error handling
│   │   │   ├── services/      # Lógica de negócio
│   │   │   ├── models/        # Modelos de dados
│   │   │   └── config/        # Configuração
│   │   ├── database/
│   │   │   └── init.sql        # Schema PostgreSQL
│   │   └── Dockerfile
│   └── ml-service/             # Python + scikit-learn + Flask
│       ├── app/
│       │   ├── main.py         # Flask API
│       │   └── categorizer.py  # Pipeline TF-IDF + Random Forest
│       ├── models/             # Modelos treinados (.pkl)
│       └── Dockerfile
├── relatorio/                  # Relatório LaTeX (UBI template)
├── poster/                     # Poster A0 (PPTX)
└── apresentacao/               # Apresentação (PPTX)
```

## Licença

Projeto académico — Universidade da Beira Interior, 2026.
