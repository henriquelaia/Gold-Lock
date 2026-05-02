import { Router } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/errorHandler.js';
import { db } from '../config/database.js';

export const fiscalAssistantRouter = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:5000';

// ── GET /analyze — análise fiscal completa ────────────────────────────────────

fiscalAssistantRouter.get('/analyze', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [txResult, profileResult] = await Promise.all([
      db.query(
        `SELECT t.id, t.description, t.amount, t.transaction_date,
                c.name_pt AS category_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1
           AND EXTRACT(YEAR FROM t.transaction_date) = $2
         ORDER BY t.transaction_date DESC
         LIMIT 500`,
        [userId, currentYear],
      ),
      db.query(
        'SELECT * FROM fiscal_profile WHERE user_id = $1',
        [userId],
      ),
    ]);

    const mlPayload = {
      fiscal_profile: profileResult.rows[0] ?? null,
      transactions: txResult.rows,
      current_month: currentMonth,
    };

    let mlData: Record<string, unknown>;
    try {
      const mlRes = await axios.post(`${ML_SERVICE_URL}/fiscal-assistant/analyze`, mlPayload, {
        timeout: 15000,
      });
      mlData = mlRes.data as Record<string, unknown>;
    } catch {
      throw new AppError('Serviço de IA temporariamente indisponível', 503);
    }

    res.json({ status: 'success', data: mlData });
  } catch (err) {
    next(err);
  }
});

// ── POST /train — re-treinar modelos com os dados de treino ───────────────────

fiscalAssistantRouter.post('/train', authenticate, async (_req, res, next) => {
  try {
    const mlRes = await axios.post(`${ML_SERVICE_URL}/fiscal-assistant/train`, {}, {
      timeout: 60000,
    });
    res.json({ status: 'success', data: mlRes.data });
  } catch {
    next(new AppError('Falha ao treinar modelos', 503));
  }
});

// ── GET /metrics — métricas dos modelos ──────────────────────────────────────

fiscalAssistantRouter.get('/metrics', authenticate, async (_req, res, next) => {
  try {
    const mlRes = await axios.get(`${ML_SERVICE_URL}/fiscal-assistant/metrics`, {
      timeout: 5000,
    });
    res.json({ status: 'success', data: mlRes.data });
  } catch {
    next(new AppError('Serviço de IA indisponível', 503));
  }
});
