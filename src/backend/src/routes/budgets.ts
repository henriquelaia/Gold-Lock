import { Router } from 'express';

export const budgetsRouter = Router();

// GET /api/budgets — Listar orçamentos do utilizador
budgetsRouter.get('/', async (_req, res) => {
  // TODO: Implementar (Sprint 6)
  res.status(501).json({ message: 'List budgets — a implementar no Sprint 6' });
});

// POST /api/budgets — Criar orçamento
budgetsRouter.post('/', async (_req, res) => {
  // TODO: Implementar com validação Zod (Sprint 6)
  res.status(501).json({ message: 'Create budget — a implementar no Sprint 6' });
});

// PUT /api/budgets/:id — Atualizar orçamento
budgetsRouter.put('/:id', async (_req, res) => {
  // TODO: Implementar (Sprint 6)
  res.status(501).json({ message: 'Update budget — a implementar no Sprint 6' });
});

// GET /api/budgets/:id/progress — Progresso do orçamento
budgetsRouter.get('/:id/progress', async (_req, res) => {
  // TODO: Calcular gasto vs. limite (Sprint 6)
  res.status(501).json({ message: 'Budget progress — a implementar no Sprint 6' });
});
