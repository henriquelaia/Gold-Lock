/**
 * Rotas de Autenticação — Gold Lock
 * ===================================
 * POST /api/auth/register           → Registo (envia email de verificação)
 * GET  /api/auth/verify-email       → Confirmar email com token
 * POST /api/auth/resend-verification → Reenviar email de verificação
 * POST /api/auth/login              → Login (suporta 2FA)
 * POST /api/auth/refresh            → Renovar access token
 * POST /api/auth/logout             → Terminar sessão
 * GET  /api/auth/me                 → Perfil do utilizador autenticado
 * POST /api/auth/forgot-password    → Solicitar reset de password
 * POST /api/auth/reset-password     → Definir nova password com token
 * POST /api/auth/2fa/setup          → Gerar secret TOTP + QR code
 * POST /api/auth/2fa/enable         → Confirmar e ativar 2FA
 * POST /api/auth/2fa/disable        → Desativar 2FA (requer password)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// ── Schemas de validação (Zod) ─────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, 'A password deve ter pelo menos 8 caracteres.')
  .max(128, 'Password demasiado longa.')
  .regex(/[A-Z]/, 'A password deve conter pelo menos uma letra maiúscula.')
  .regex(/[0-9]/, 'A password deve conter pelo menos um número.')
  .regex(/[@$!%*?&#+\-_]/, 'A password deve conter pelo menos um carácter especial (@$!%*?&#+-).');

const registerSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email('Email inválido.').toLowerCase(),
  password: passwordSchema,
});

const loginSchema = z.object({
  email:     z.string().email('Email inválido.').toLowerCase(),
  password:  z.string().min(1, 'Password obrigatória.'),
  totpCode:  z.string().length(6).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().uuid('Refresh token inválido.'),
});

const emailSchema = z.object({
  email: z.string().email('Email inválido.').toLowerCase(),
});

const resetPasswordSchema = z.object({
  token:    z.string().uuid('Token inválido.'),
  password: passwordSchema,
});

const totpCodeSchema = z.object({
  code: z.string().length(6, 'O código TOTP deve ter 6 dígitos.').regex(/^\d+$/, 'Código numérico.'),
});

const disableTotpSchema = z.object({
  password: z.string().min(1),
});

// ── Helper para erros Zod ──────────────────────────────────────────────────

function zodError(res: Response, err: z.ZodError): void {
  res.status(400).json({
    status:  'error',
    message: 'Dados inválidos.',
    errors:  err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
  });
}

// ── POST /api/auth/register ────────────────────────────────────────────────

authRouter.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const { user, tokens } = await authService.register(data);

    res.status(201).json({
      status:  'success',
      message: 'Conta criada. Verifica o teu email para ativar a conta.',
      data:    { user, ...tokens },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});

// ── GET /api/auth/verify-email?token=xxx ──────────────────────────────────

authRouter.get('/verify-email', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = z.string().uuid().parse(req.query['token']);
    await authService.verifyEmail(token);
    res.json({ status: 'success', message: 'Email verificado com sucesso. Já podes fazer login.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: 'Token inválido.' });
    }
    next(err);
  }
});

// ── POST /api/auth/resend-verification ────────────────────────────────────

authRouter.post('/resend-verification', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = emailSchema.parse(req.body);
    await authService.resendVerification(email);
    // Resposta sempre igual — não revela se o email existe
    res.json({ status: 'success', message: 'Se o email estiver registado, receberás um novo link de verificação.' });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────

authRouter.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);

    if (result.requiresTotp) {
      return res.status(200).json({
        status:       'totp_required',
        message:      'Introduz o código do teu autenticador.',
        requiresTotp: true,
      });
    }

    res.json({
      status: 'success',
      data:   { user: result.user, ...result.tokens },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});

// ── POST /api/auth/refresh ─────────────────────────────────────────────────

authRouter.post('/refresh', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ status: 'success', data: tokens });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: 'Token inválido.' });
    }
    next(err);
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────

authRouter.post('/logout', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
  } catch (err) {
    // Zod ou token ausente → idempotente, continua
    if (!(err instanceof z.ZodError)) {
      // Erros inesperados do Redis ou BD → propagar para o error handler
      return next(err);
    }
  }
  res.json({ status: 'success', message: 'Sessão terminada.' });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────

authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getProfile(req.user!.id);
    res.json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/profile ──────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name:      z.string().min(2).max(100).trim().optional(),
  avatarUrl: z.union([
    z.string().url('URL de avatar inválido.').max(500).startsWith('https://', 'O avatar deve usar HTTPS.'),
    z.literal(''),
  ]).optional(),
});

authRouter.put('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user!.id, updates);
    res.json({ status: 'success', data: { user } });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────

authRouter.post('/forgot-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = emailSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    // Resposta sempre igual — não revela se o email existe
    res.json({
      status:  'success',
      message: 'Se o email estiver registado, receberás um link para redefinir a password.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────

authRouter.post('/reset-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    res.json({
      status:  'success',
      message: 'Password redefinida com sucesso. Todas as sessões ativas foram terminadas.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});

// ── POST /api/auth/2fa/setup ───────────────────────────────────────────────

authRouter.post('/2fa/setup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { secret, qrCodeUrl } = await authService.setupTotp(req.user!.id);
    res.json({
      status: 'success',
      data:   { secret, qrCodeUrl },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/2fa/enable ──────────────────────────────────────────────

authRouter.post('/2fa/enable', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = totpCodeSchema.parse(req.body);
    await authService.enableTotp(req.user!.id, code);
    res.json({ status: 'success', message: 'Autenticação de dois fatores ativada.' });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});

// ── POST /api/auth/2fa/disable ─────────────────────────────────────────────

authRouter.post('/2fa/disable', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = disableTotpSchema.parse(req.body);
    await authService.disableTotp(req.user!.id, password);
    res.json({ status: 'success', message: 'Autenticação de dois fatores desativada.' });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});

// ── POST /api/auth/change-password ────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password atual obrigatória.'),
  newPassword: passwordSchema,
});

authRouter.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ status: 'success', message: 'Password alterada com sucesso.' });
  } catch (err) {
    if (err instanceof z.ZodError) return zodError(res, err);
    next(err);
  }
});
