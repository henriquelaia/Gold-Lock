/**
 * Middleware de Autenticação
 * ==========================
 * Verifica o JWT no header Authorization: Bearer <token>
 * Injeta req.user com { id, email } se o token for válido.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { redisClient } from '../config/redis.js';

// Estender o tipo Request do Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  type: string;
  iat: number;
  exp: number;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticação em falta.', 401));
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new AppError('Configuração de segurança inválida.', 500));
  }

  let payload: JwtPayload;
  try {
    // Especificar algoritmo explicitamente previne ataques algorithm confusion (alg:none)
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Sessão expirada. Faz login novamente.', 401));
    }
    return next(new AppError('Token inválido.', 401));
  }

  if (payload.type !== 'access') {
    return next(new AppError('Tipo de token inválido.', 401));
  }

  // Verificar se as sessões foram invalidadas (ex: após reset de password)
  // Compara o iat do token com o timestamp de invalidação no Redis
  redisClient.get(`sessions_invalidated:${payload.sub}`).then((invalidatedAt) => {
    if (invalidatedAt && payload.iat * 1000 < parseInt(invalidatedAt, 10)) {
      return next(new AppError('Sessão revogada. Faz login novamente.', 401));
    }
    // Injetar dados do utilizador no request
    req.user = { id: payload.sub, email: payload.email };
    next();
  }).catch(() => {
    // Se Redis falhar, permite o request — degradação graceful (Redis não deve ser SPOF na leitura)
    req.user = { id: payload.sub, email: payload.email };
    next();
  });
}
