import { Router } from 'express';

export const transactionsRouter = Router();

// GET /api/transactions — Listar transações com filtros
transactionsRouter.get('/', async (_req, res) => {
  // TODO: Implementar com paginação, filtros por data/categoria/conta (Sprint 5)
  res.status(501).json({ message: 'List transactions — a implementar no Sprint 5' });
});

// GET /api/transactions/summary — Resumo mensal de receitas/despesas
transactionsRouter.get('/summary', async (_req, res) => {
  // TODO: Implementar agregação mensal (Sprint 5)
  res.status(501).json({ message: 'Transaction summary — a implementar no Sprint 5' });
});

// PUT /api/transactions/:id/category — Corrigir categoria de uma transação
transactionsRouter.put('/:id/category', async (_req, res) => {
  // TODO: Atualizar categoria e re-treinar modelo ML (Sprint 6)
  res.status(501).json({ message: 'Update category — a implementar no Sprint 6' });
});

// POST /api/transactions/sync — Sincronizar transações via Salt Edge
transactionsRouter.post('/sync', async (_req, res) => {
  // TODO: Trigger sync com Salt Edge e classificação ML (Sprint 5)
  res.status(501).json({ message: 'Sync transactions — a implementar no Sprint 5' });
});
