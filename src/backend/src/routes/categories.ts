import { Router } from 'express';

export const categoriesRouter = Router();

// GET /api/categories — Listar categorias disponíveis
categoriesRouter.get('/', async (_req, res) => {
  // TODO: Retornar categorias PT (Supermercado, Restauração, Transportes, etc.) (Sprint 6)
  res.status(501).json({ message: 'List categories — a implementar no Sprint 6' });
});

// POST /api/categories — Criar categoria personalizada
categoriesRouter.post('/', async (_req, res) => {
  // TODO: Implementar (Sprint 6)
  res.status(501).json({ message: 'Create category — a implementar no Sprint 6' });
});
