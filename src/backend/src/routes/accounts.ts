import { Router } from 'express';

export const accountsRouter = Router();

// GET /api/accounts — Listar contas bancárias do utilizador
accountsRouter.get('/', async (_req, res) => {
  // TODO: Implementar com Salt Edge API (Sprint 4)
  res.status(501).json({ message: 'List accounts — a implementar no Sprint 4' });
});

// POST /api/accounts/connect — Iniciar conexão Open Banking
accountsRouter.post('/connect', async (_req, res) => {
  // TODO: Criar conexão via Salt Edge Connect Widget (Sprint 4)
  res.status(501).json({ message: 'Connect bank — a implementar no Sprint 4' });
});

// GET /api/accounts/:id/balance — Obter saldo de uma conta
accountsRouter.get('/:id/balance', async (_req, res) => {
  // TODO: Implementar (Sprint 4)
  res.status(501).json({ message: 'Account balance — a implementar no Sprint 4' });
});

// DELETE /api/accounts/:id — Desconectar conta bancária
accountsRouter.delete('/:id', async (_req, res) => {
  // TODO: Implementar (Sprint 4)
  res.status(501).json({ message: 'Disconnect account — a implementar no Sprint 4' });
});
