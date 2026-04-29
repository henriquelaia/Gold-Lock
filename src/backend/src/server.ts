import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

interface RawBodyRequest extends express.Request { rawBody?: Buffer; }

import { authRouter } from './routes/auth.js';
import { accountsRouter } from './routes/accounts.js';
import { transactionsRouter } from './routes/transactions.js';
import { budgetsRouter } from './routes/budgets.js';
import { goalsRouter } from './routes/goals.js';
import { investmentsRouter } from './routes/investments.js';
import { irsRouter } from './routes/irs.js';
import { categoriesRouter } from './routes/categories.js';
import { fiscalProfileRouter } from './routes/fiscalProfile.js';
import { marketRouter } from './routes/market.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import './config/database.js';
import './config/redis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware Global ──
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({
  limit: '10mb',
  verify: (_req, _res, buf) => { (_req as RawBodyRequest).rawBody = buf; },
}));
app.use(rateLimiter);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'goldlock-backend', timestamp: new Date().toISOString() });
});

// ── Rotas ──
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/investments', investmentsRouter);
app.use('/api/irs', irsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/fiscal-profile', fiscalProfileRouter);
app.use('/api/market', marketRouter);

// ── Error Handler ──
app.use(errorHandler);

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`🚀 Gold Lock Backend running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
