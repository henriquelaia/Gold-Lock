import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler.js';

export function verifySaltEdgeWebhook(req: Request, _res: Response, next: NextFunction): void {
  const signature = req.headers['signature'];

  if (!signature || typeof signature !== 'string') {
    next(new AppError('Webhook signature em falta.', 401));
    return;
  }

  const secret = process.env.SALT_EDGE_WEBHOOK_SECRET;
  if (!secret) {
    next(new AppError('Webhook secret não configurado.', 503));
    return;
  }

  if (!Buffer.isBuffer(req.body)) {
    next(new AppError('Body em formato inválido para verificação HMAC.', 400));
    return;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('base64');

  const signatureBuffer = Buffer.from(signature, 'base64');
  const expectedBuffer = Buffer.from(expected, 'base64');

  if (signatureBuffer.length !== expectedBuffer.length) {
    next(new AppError('Webhook signature inválida.', 401));
    return;
  }

  try {
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      next(new AppError('Webhook signature inválida.', 401));
      return;
    }
    next();
  } catch {
    next(new AppError('Webhook signature inválida.', 401));
  }
}
