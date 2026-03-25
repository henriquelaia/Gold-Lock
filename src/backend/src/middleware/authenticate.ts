/**
 * Middleware de Autenticação
 * ==========================
 * Verifica o JWT no header Authorization: Bearer <token>
 * Injeta req.user com { id, email } se o token for válido.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

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

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;

    if (payload.type !== 'access') {
      return next(new AppError('Tipo de token inválido.', 401));
    }

    // Injetar dados do utilizador no request
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Sessão expirada. Faz login novamente.', 401));
    }
    return next(new AppError('Token inválido.', 401));
  }
}
