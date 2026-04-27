import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requests por janela
  message: {
    status: 'error',
    message: 'Demasiados pedidos. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter mais restritivo para auth
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    message: 'Demasiadas tentativas de autenticação. Tente novamente em 15 minutos.',
  },
});
