/**
 * AuthService
 * ===========
 * Autenticação de raiz com bcrypt + JWT + PostgreSQL.
 * Sem dependências externas (sem Supabase, sem Firebase).
 *
 * Fluxo:
 *  1. Registo   → hash da password com bcrypt → guardar em users
 *  2. Login     → verificar hash → gerar access token (15min) + refresh token (7d)
 *  3. Refresh   → verificar refresh token no Redis → gerar novo access token
 *  4. Logout    → invalidar refresh token no Redis
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { redisClient } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL  = '15m';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 dias em segundos

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserPublic {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não definido nas variáveis de ambiente');
  return secret;
}

function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'access' },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

async function generateRefreshToken(userId: string): Promise<string> {
  const token = uuidv4();
  // Guardar no Redis: chave "refresh:<token>" → userId, TTL 7 dias
  await redisClient.set(`refresh:${token}`, userId, { EX: REFRESH_TOKEN_TTL });
  return token;
}

function toPublicUser(row: Record<string, string>): UserPublic {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at,
  };
}

// ── Operações principais ────────────────────────────────────────────────────

export async function register(input: RegisterInput): Promise<{ user: UserPublic; tokens: TokenPair }> {
  const { name, email, password } = input;

  // Verificar se o email já existe
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError('Este email já está registado.', 409);
  }

  // Hash da password com bcrypt (12 rounds)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Inserir utilizador na base de dados
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );

  const user = toPublicUser(result.rows[0]);

  // Gerar tokens
  const accessToken  = generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, tokens: { accessToken, refreshToken } };
}

export async function login(input: LoginInput): Promise<{ user: UserPublic; tokens: TokenPair }> {
  const { email, password } = input;

  // Procurar utilizador pelo email
  const result = await db.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    // Mensagem genérica para não revelar se o email existe
    throw new AppError('Email ou password incorretos.', 401);
  }

  const userRow = result.rows[0];

  // Verificar password com bcrypt
  const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
  if (!passwordMatch) {
    throw new AppError('Email ou password incorretos.', 401);
  }

  const user = toPublicUser(userRow);

  // Gerar tokens
  const accessToken  = generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, tokens: { accessToken, refreshToken } };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  // Verificar se o refresh token existe no Redis
  const userId = await redisClient.get(`refresh:${refreshToken}`);
  if (!userId) {
    throw new AppError('Sessão expirada. Faz login novamente.', 401);
  }

  // Buscar dados do utilizador
  const result = await db.query('SELECT id, email FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new AppError('Utilizador não encontrado.', 401);
  }

  const { id, email } = result.rows[0];

  // Invalidar o refresh token antigo (rotação de tokens)
  await redisClient.del(`refresh:${refreshToken}`);

  // Gerar par de tokens novos
  const newAccessToken  = generateAccessToken(id, email);
  const newRefreshToken = await generateRefreshToken(id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  // Remover refresh token do Redis → sessão invalidada
  await redisClient.del(`refresh:${refreshToken}`);
}

export async function getProfile(userId: string): Promise<UserPublic> {
  const result = await db.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Utilizador não encontrado.', 404);
  }

  return toPublicUser(result.rows[0]);
}
