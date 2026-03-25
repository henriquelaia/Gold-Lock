import { Router } from 'express';

export const irsRouter = Router();

// POST /api/irs/simulate — Simular IRS
irsRouter.post('/simulate', async (_req, res) => {
  // TODO: Implementar motor de regras IRS (Sprint 7)
  // Inputs: rendimento bruto, categoria (A/B), estado civil, dependentes, deduções
  // Output: imposto estimado, taxa efetiva, escalão, reembolso/pagamento
  res.status(501).json({ message: 'IRS simulation — a implementar no Sprint 7' });
});

// GET /api/irs/brackets — Obter escalões IRS vigentes
irsRouter.get('/brackets', async (_req, res) => {
  // TODO: Retornar tabela de escalões (Sprint 7)
  res.status(501).json({ message: 'IRS brackets — a implementar no Sprint 7' });
});

// GET /api/irs/deductions — Obter categorias de dedução
irsRouter.get('/deductions', async (_req, res) => {
  // TODO: Retornar limites de dedução por categoria (Sprint 7)
  res.status(501).json({ message: 'IRS deductions — a implementar no Sprint 7' });
});
