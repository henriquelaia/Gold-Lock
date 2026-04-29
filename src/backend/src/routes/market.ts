import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/errorHandler.js';
import { getQuote, getHistory, searchTicker } from '../services/marketDataService.js';

export const marketRouter = Router();

marketRouter.use(authenticate);

// GET /api/market/quote/:ticker?type=stock|etf|crypto
marketRouter.get('/quote/:ticker', async (req, res, next) => {
  try {
    const ticker    = req.params.ticker;
    const assetType = (req.query.type as string) ?? 'stock';

    const quote = await getQuote(ticker, assetType);
    res.json({ status: 'success', data: quote });
  } catch (err) {
    next(err);
  }
});

// GET /api/market/search?q=apple&type=stock
marketRouter.get('/search', async (req, res, next) => {
  try {
    const { q, type } = z.object({
      q:    z.string().min(2, 'Mínimo 2 caracteres'),
      type: z.string().optional(),
    }).parse(req.query);

    const results = await searchTicker(q, type);
    res.json({ status: 'success', data: results });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

// GET /api/market/history/:ticker?period=30d&type=stock
marketRouter.get('/history/:ticker', async (req, res, next) => {
  try {
    const ticker = req.params.ticker;
    const { period, type } = z.object({
      period: z.enum(['30d', '1y']).default('30d'),
      type:   z.string().optional(),
    }).parse(req.query);

    const points = await getHistory(ticker, type ?? 'stock', period);
    res.json({ status: 'success', data: { ticker, period, points } });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});
