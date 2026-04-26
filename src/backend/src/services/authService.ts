/**
 * AuthService — Gold Lock
 * =======================
 * Autenticação de raiz: bcrypt + JWT (HS256) + Redis + PostgreSQL.
 * Sem dependências externas (sem Supabase, sem Firebase, sem Auth0).
 *
 * Fluxo completo:
 *  1. Registo        → hash bcrypt(12) → guardar user → enviar email de verificação
 *  2. Verificação    → token UUID (24h) → marcar email_verified = true
 *  3. Login          → verificar lockout → verificar hash → gerar access(15m)+refresh(7d)
 *  4. Refresh        → UUID no Redis → rotação de token → novo par
 *  5. Logout         → remover refresh token do Redis (idempotente)
 *  6. Reset password → token UUID (1h) → hash nova password → invalidar todas as sessões
 *  7. TOTP/2FA       → gerar secret → QR code → verificar código → ativar/desativar
 *
 * Segurança:
 *  - bcrypt cost=12 (≈250ms por hash → resistência a brute force)
 *  - JWT HS256 com algoritmo explícito (previne alg:none attack)
 *  - Refresh token: UUID aleatório em Redis (não JWT → sem possibilidade de forgery)
 *  - Mensagens de erro genéricas no login (não revelam se email existe)
 *  - Account lockout: 5 falhas → bloqueio de 15 min via Redis
 *  - Token de reset/verificação de uso único (invalidado após utilização)
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { db } from '../config/database.js';
import { redisClient } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './emailService.js';

// ── Constantes de segurança ────────────────────────────────────────────────

const BCRYPT_ROUNDS        = 12;           // ~250ms em hardware moderno
const ACCESS_TOKEN_TTL     = '15m';
const REFRESH_TOKEN_TTL    = 7 * 24 * 60 * 60;  // 7 dias em segundos
const VERIFY_TOKEN_TTL_MS  = 24 * 60 * 60 * 1000; // 24h em ms
const RESET_TOKEN_TTL_MS   = 60 * 60 * 1000;      // 1h em ms
const MAX_LOGIN_ATTEMPTS   = 5;
const LOCKOUT_TTL          = 15 * 60;              // 15 min em segundos

// ── Tipos ──────────────────────────────────────────────────────────────────

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
  totpCode?: string; // obrigatório se 2FA ativo
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserPublic {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  totp_enabled: boolean;
  created_at: string;
}

// ── Helpers internos ───────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não definido nas variáveis de ambiente');
  return secret;
}

function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'access' },
    getJwtSecret(),
    {
      expiresIn: ACCESS_TOKEN_TTL,
      algorithm: 'HS256', // explícito — previne algorithm confusion attack
    }
  );
}

async function generateRefreshToken(userId: string): Promise<string> {
  const token = uuidv4(); // UUID aleatório — não JWT, sem possibilidade de forgery
  try {
    await redisClient.set(`refresh:${token}`, userId, { EX: REFRESH_TOKEN_TTL });
  } catch {
    throw new AppError('Serviço de sessões temporariamente indisponível.', 503);
  }
  return token;
}

function toPublicUser(row: Record<string, unknown>): UserPublic {
  return {
    id:             row.id as string,
    name:           row.name as string,
    email:          row.email as string,
    email_verified: row.email_verified as boolean,
    totp_enabled:   row.totp_enabled as boolean,
    created_at:     row.created_at as string,
  };
}

// ── Account lockout (Redis) ────────────────────────────────────────────────

async function checkLockout(email: string): Promise<void> {
  const attempts = await redisClient.get(`login_attempts:${email}`);
  if (attempts && parseInt(attempts, 10) >= MAX_LOGIN_ATTEMPTS) {
    throw new AppError(
      'Conta temporariamente bloqueada após múltiplas tentativas falhadas. Tente novamente em 15 minutos.',
      429
    );
  }
}

async function recordFailedAttempt(email: string): Promise<void> {
  const key = `login_attempts:${email}`;
  const attempts = await redisClient.incr(key);
  // Só define o TTL na primeira falha — evita reset do timer em ataques contínuos
  if (attempts === 1) {
    await redisClient.expire(key, LOCKOUT_TTL);
  }
}

async function clearFailedAttempts(email: string): Promise<void> {
  await redisClient.del(`login_attempts:${email}`);
}

// ── Invalidar todas as sessões de um utilizador ────────────────────────────

async function invalidateAllSessions(userId: string): Promise<void> {
  // Guardar timestamp de invalidação — o middleware verifica contra iat do JWT
  try {
    await redisClient.set(
      `sessions_invalidated:${userId}`,
      Date.now().toString(),
      { EX: REFRESH_TOKEN_TTL }
    );
  } catch {
    // Falha crítica: sem invalidação, sessões antigas persistem após reset de password
    throw new AppError('Não foi possível invalidar as sessões ativas. Tenta novamente.', 503);
  }
}

// ── Operações principais ───────────────────────────────────────────────────

export async function register(
  input: RegisterInput
): Promise<{ user: UserPublic; tokens: TokenPair }> {
  const { name, email, password } = input;

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError('Este email já está registado.', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Gerar token de verificação de email (UUID, uso único, 24h)
  const verificationToken   = uuidv4();
  const verificationExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, email_verification_token, email_verification_token_expires)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, email_verified, totp_enabled, created_at`,
    [name, email, passwordHash, verificationToken, verificationExpires]
  );

  const user = toPublicUser(result.rows[0]);

  // Enviar email de verificação (não bloqueia o registo se falhar)
  sendVerificationEmail(email, name, verificationToken).catch((err: Error) =>
    console.error('[Auth] Falha ao enviar email de verificação:', err.message)
  );

  const accessToken  = generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, tokens: { accessToken, refreshToken } };
}

export async function verifyEmail(token: string): Promise<void> {
  const result = await db.query(
    `SELECT id FROM users
     WHERE email_verification_token = $1
       AND email_verification_token_expires > NOW()
       AND email_verified = false`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new AppError('Token de verificação inválido ou expirado.', 400);
  }

  // Marcar como verificado e invalidar o token (uso único)
  await db.query(
    `UPDATE users
     SET email_verified = true,
         email_verification_token = NULL,
         email_verification_token_expires = NULL
     WHERE id = $1`,
    [result.rows[0].id]
  );
}

export async function resendVerification(email: string): Promise<void> {
  const result = await db.query(
    'SELECT id, name, email_verified FROM users WHERE email = $1',
    [email]
  );

  // Resposta sempre igual — não revelar se email existe
  if (result.rows.length === 0 || result.rows[0].email_verified) return;

  const token   = uuidv4();
  const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  await db.query(
    `UPDATE users
     SET email_verification_token = $1, email_verification_token_expires = $2
     WHERE id = $3`,
    [token, expires, result.rows[0].id]
  );

  sendVerificationEmail(email, result.rows[0].name, token).catch((err: Error) =>
    console.error('[Auth] Falha ao reenviar email de verificação:', err.message)
  );
}

export async function login(
  input: LoginInput
): Promise<{ user: UserPublic; tokens: TokenPair; requiresTotp?: boolean }> {
  const { email, password, totpCode } = input;

  // Verificar lockout ANTES de qualquer query à BD
  await checkLockout(email);

  const result = await db.query(
    `SELECT id, name, email, password_hash, email_verified, totp_enabled, totp_secret, created_at
     FROM users WHERE email = $1`,
    [email]
  );

  // Mensagem genérica — não revela se o email existe (previne user enumeration)
  if (result.rows.length === 0) {
    await recordFailedAttempt(email);
    throw new AppError('Email ou password incorretos.', 401);
  }

  const userRow = result.rows[0];

  const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
  if (!passwordMatch) {
    await recordFailedAttempt(email);
    throw new AppError('Email ou password incorretos.', 401);
  }

  // Login com password correta → limpar contador de falhas
  await clearFailedAttempts(email);

  // Verificar se o email foi confirmado
  if (!userRow.email_verified) {
    throw new AppError(
      'Por favor verifica o teu email antes de fazer login. Verifica a caixa de entrada.',
      403
    );
  }

  // Se 2FA ativo → verificar código TOTP antes de emitir tokens
  if (userRow.totp_enabled) {
    if (!totpCode) {
      // Sinalizar ao cliente que precisa de solicitar o código TOTP
      return { user: toPublicUser(userRow), tokens: { accessToken: '', refreshToken: '' }, requiresTotp: true };
    }

    // Verificar se o código já foi usado (anti-replay — janela de 90s)
    const replayKey = `totp_used:${userRow.id}:${totpCode}`;
    const alreadyUsed = await redisClient.get(replayKey);
    if (alreadyUsed) {
      throw new AppError('Código de autenticação de dois fatores já utilizado.', 401);
    }

    const totpValid = speakeasy.totp.verify({
      secret:   userRow.totp_secret,
      encoding: 'base32',
      token:    totpCode,
      window:   1, // tolerar 1 intervalo de 30s para desfasamentos de relógio
    });

    if (!totpValid) {
      throw new AppError('Código de autenticação de dois fatores inválido.', 401);
    }

    // Marcar código como usado durante a janela de validade (30s * window de 3 = 90s)
    await redisClient.set(replayKey, '1', { EX: 90 });
  }

  const user = toPublicUser(userRow);

  const accessToken  = generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, tokens: { accessToken, refreshToken } };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const userId = await redisClient.get(`refresh:${refreshToken}`);
  if (!userId) {
    throw new AppError('Sessão expirada. Faz login novamente.', 401);
  }

  // Verificar se as sessões foram invalidadas (ex: após reset de password)
  const invalidatedAt = await redisClient.get(`sessions_invalidated:${userId}`);
  if (invalidatedAt) {
    await redisClient.del(`refresh:${refreshToken}`);
    throw new AppError('Sessão inválida. Faz login novamente.', 401);
  }

  const result = await db.query('SELECT id, email FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new AppError('Utilizador não encontrado.', 401);
  }

  const { id, email } = result.rows[0];

  // Rotação de token — o token antigo é invalidado, emitido um novo
  await redisClient.del(`refresh:${refreshToken}`);

  const newAccessToken  = generateAccessToken(id, email);
  const newRefreshToken = await generateRefreshToken(id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  // Idempotente — silencioso mesmo se o token já não existir
  await redisClient.del(`refresh:${refreshToken}`);
}

export async function getProfile(userId: string): Promise<UserPublic> {
  const result = await db.query(
    'SELECT id, name, email, email_verified, totp_enabled, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Utilizador não encontrado.', 404);
  }

  return toPublicUser(result.rows[0]);
}

export async function updateProfile(
  userId: string,
  updates: { name?: string; avatarUrl?: string }
): Promise<UserPublic> {
  const fields: string[]  = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name.trim());
  }
  if (updates.avatarUrl !== undefined) {
    fields.push(`avatar_url = $${idx++}`);
    values.push(updates.avatarUrl || null);
  }

  if (fields.length === 0) {
    return getProfile(userId);
  }

  values.push(userId);

  const result = await db.query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, name, email, email_verified, totp_enabled, created_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Utilizador não encontrado.', 404);
  }

  return toPublicUser(result.rows[0]);
}

// ── Password Reset ─────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const result = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);

  // Resposta sempre igual — não revelar se o email existe
  if (result.rows.length === 0) return;

  const token   = uuidv4();
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.query(
    `UPDATE users
     SET password_reset_token = $1, password_reset_expires = $2
     WHERE id = $3`,
    [token, expires, result.rows[0].id]
  );

  sendPasswordResetEmail(email, result.rows[0].name, token).catch((err: Error) =>
    console.error('[Auth] Falha ao enviar email de reset:', err.message)
  );
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const result = await db.query(
    `SELECT id FROM users
     WHERE password_reset_token = $1
       AND password_reset_expires > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new AppError('Token de recuperação inválido ou expirado.', 400);
  }

  const userId       = result.rows[0].id;
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Atualizar password e invalidar token de reset (uso único)
  await db.query(
    `UPDATE users
     SET password_hash = $1,
         password_reset_token = NULL,
         password_reset_expires = NULL
     WHERE id = $2`,
    [passwordHash, userId]
  );

  // Invalidar TODAS as sessões ativas após reset de password
  await invalidateAllSessions(userId);
}

// ── TOTP / 2FA ─────────────────────────────────────────────────────────────

export async function setupTotp(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
  const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) throw new AppError('Utilizador não encontrado.', 404);

  const secret = speakeasy.generateSecret({
    name:   `Gold Lock (${userResult.rows[0].email})`,
    length: 20,
  });

  // Gerar QR code ANTES de escrever na BD — se lançar exceção, a BD fica consistente
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

  // Guardar secret temporariamente (ainda não ativo — aguarda verificação)
  await db.query(
    'UPDATE users SET totp_secret = $1 WHERE id = $2',
    [secret.base32, userId]
  );

  return { secret: secret.base32, qrCodeUrl };
}

export async function enableTotp(userId: string, code: string): Promise<void> {
  const result = await db.query(
    'SELECT totp_secret FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0 || !result.rows[0].totp_secret) {
    throw new AppError('Configura o autenticador primeiro.', 400);
  }

  const valid = speakeasy.totp.verify({
    secret:   result.rows[0].totp_secret,
    encoding: 'base32',
    token:    code,
    window:   1,
  });

  if (!valid) {
    throw new AppError('Código inválido. Verifica o teu autenticador e tenta novamente.', 401);
  }

  await db.query('UPDATE users SET totp_enabled = true WHERE id = $1', [userId]);
}

export async function disableTotp(userId: string, password: string): Promise<void> {
  const result = await db.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) throw new AppError('Utilizador não encontrado.', 404);

  // Requer confirmação da password para desativar 2FA
  const valid = await bcrypt.compare(password, result.rows[0].password_hash);
  if (!valid) throw new AppError('Password incorreta.', 401);

  await db.query(
    'UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE id = $1',
    [userId]
  );

  // Invalidar todas as sessões por segurança
  await invalidateAllSessions(userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const result = await db.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) throw new AppError('Utilizador não encontrado.', 404);

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) throw new AppError('Password atual incorreta.', 401);

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newHash, userId]
  );

  await invalidateAllSessions(userId);
}
