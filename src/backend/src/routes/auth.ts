import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// ── Schemas de validação (Zod) ─────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(100),
  email: z.string().email('Email inválido.'),
  password: z
    .string()
    .min(8, 'A password deve ter pelo menos 8 caracteres.')
    .regex(/[A-Z]/, 'A password deve conter pelo menos uma letra maiúscula.')
    .regex(/[0-9]/, 'A password deve conter pelo menos um número.'),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'Password obrigatória.'),
});

const refreshSchema = z.object({
  refreshToken: z.string().uuid('Refresh token inválido.'),
});

// ── POST /api/auth/register ────────────────────────────────────────────────
authRouter.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const { user, tokens } = await authService.register(data);

    res.status(201).json({
      status: 'success',
      data: { user, ...tokens },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos.',
        errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(err);
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const { user, tokens } = await authService.login(data);

    res.json({
      status: 'success',
      data: { user, ...tokens },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos.',
        errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(err);
  }
});

// ── POST /api/auth/refresh ─────────────────────────────────────────────────
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refreshTokens(refreshToken);

    res.json({
      status: 'success',
      data: tokens,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: 'Token inválido.' });
    }
    next(err);
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);

    res.json({ status: 'success', message: 'Sessão terminada.' });
  } catch (err) {
    // Se o token não existir, logout silencioso (idempotente)
    res.json({ status: 'success', message: 'Sessão terminada.' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
// Rota protegida — requer JWT válido
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getProfile(req.user!.id);
    res.json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
});
