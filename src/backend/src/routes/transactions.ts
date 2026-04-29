import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/errorHandler.js';
import * as saltEdge from '../services/saltEdgeService.js';

export const transactionsRouter = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:5000';

// ── GET / — listar com filtros e paginação ─────────────────────────────────

const listQuerySchema = z.object({
  account_id:  z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  type:        z.enum(['income', 'expense']).optional(),
  search:      z.string().max(200).optional(),
  from_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  offset:      z.coerce.number().int().min(0).default(0),
  // legacy pagination support (frontend uses page/limit)
  page:        z.coerce.number().int().min(1).optional(),
});

transactionsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const q = listQuerySchema.parse(req.query);

    // Support both page/limit and offset/limit
    const offset = q.page ? (q.page - 1) * q.limit : q.offset;

    const conditions: string[] = ['t.user_id = $1'];
    const params: unknown[] = [userId];
    let idx = 2;

    if (q.account_id)  { conditions.push(`t.bank_account_id = $${idx++}`); params.push(q.account_id); }
    if (q.category_id) { conditions.push(`t.category_id = $${idx++}`);      params.push(q.category_id); }
    if (q.type === 'expense') conditions.push('t.amount < 0');
    if (q.type === 'income')  conditions.push('t.amount > 0');
    if (q.search) { conditions.push(`t.description ILIKE $${idx++}`); params.push(`%${q.search}%`); }
    if (q.from_date) { conditions.push(`t.transaction_date >= $${idx++}`); params.push(q.from_date); }
    if (q.to_date)   { conditions.push(`t.transaction_date <= $${idx++}`); params.push(q.to_date); }

    const where = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT
           t.id, t.bank_account_id, t.category_id,
           t.description, t.amount, t.currency,
           t.transaction_date, t.is_recurring,
           t.ml_confidence, t.ml_categorized, t.notes,
           c.name_pt AS category_name, c.icon AS category_icon, c.color AS category_color,
           ba.bank_name
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         LEFT JOIN bank_accounts ba ON ba.id = t.bank_account_id
         WHERE ${where}
         ORDER BY t.transaction_date DESC, t.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, q.limit, offset],
      ),
      db.query(
        `SELECT COUNT(*)::int AS total FROM transactions t WHERE ${where}`,
        params,
      ),
    ]);

    const total = countResult.rows[0].total;
    const pages = Math.ceil(total / q.limit);

    res.json({
      status: 'success',
      data: dataResult.rows,
      pagination: { page: q.page ?? 1, limit: q.limit, total, pages },
      meta: { total, limit: q.limit, offset },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /summary — resumo mensal com byCategory e byMonth ─────────────────

const summaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

transactionsRouter.get('/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { month } = summaryQuerySchema.parse(req.query);

    const target = month ?? new Date().toISOString().slice(0, 7);
    const [year, mon] = target.split('-');
    const fromDate = `${year}-${mon}-01`;
    const toDate   = `${year}-${mon}-${new Date(Number(year), Number(mon), 0).getDate()}`;

    const [monthRow, categoryRows, historyRows] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::numeric AS income,
           COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::numeric AS expenses,
           COUNT(*)::int AS transaction_count
         FROM transactions
         WHERE user_id = $1 AND transaction_date BETWEEN $2 AND $3`,
        [userId, fromDate, toDate],
      ),
      db.query(
        `SELECT
           c.name_pt AS category_name, c.icon AS category_icon, c.color AS category_color,
           COALESCE(SUM(ABS(t.amount)), 0)::numeric AS total
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1
           AND t.amount < 0
           AND t.transaction_date BETWEEN $2 AND $3
         GROUP BY c.id, c.name_pt, c.icon, c.color
         ORDER BY total DESC
         LIMIT 10`,
        [userId, fromDate, toDate],
      ),
      db.query(
        `SELECT
           EXTRACT(YEAR  FROM transaction_date)::int AS year,
           EXTRACT(MONTH FROM transaction_date)::int AS month,
           COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::numeric AS income,
           COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::numeric AS expenses
         FROM transactions
         WHERE user_id = $1
         GROUP BY year, month
         ORDER BY year DESC, month DESC
         LIMIT 12`,
        [userId],
      ),
    ]);

    const row = monthRow.rows[0];
    res.json({
      status: 'success',
      data: {
        month: target,
        income: Number(row.income),
        expenses: Number(row.expenses),
        savings: Number(row.income) - Number(row.expenses),
        transaction_count: row.transaction_count,
        byCategory: categoryRows.rows,
        byMonth: historyRows.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /:id/category — corrigir categoria ────────────────────────────────

const updateCategorySchema = z.object({
  categoryId: z.string().uuid(),
});

transactionsRouter.put('/:id/category', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const txId = req.params.id;
    const { categoryId } = updateCategorySchema.parse(req.body);

    const { rowCount } = await db.query(
      `UPDATE transactions
         SET category_id = $1, ml_categorized = false, updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [categoryId, txId, userId],
    );

    if (!rowCount) throw new AppError('Transação não encontrada.', 404);
    res.json({ status: 'success', message: 'Categoria atualizada.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /sync — sincronizar via Salt Edge + ML ───────────────────────────

transactionsRouter.post('/sync', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { rows: accounts } = await db.query<{
      id: string;
      salt_edge_connection_id: string;
      salt_edge_account_id: string;
    }>(
      `SELECT id, salt_edge_connection_id, salt_edge_account_id
       FROM bank_accounts
       WHERE user_id = $1 AND status = 'active'
         AND salt_edge_connection_id IS NOT NULL
         AND salt_edge_account_id IS NOT NULL`,
      [userId],
    );

    if (accounts.length === 0) {
      res.json({ status: 'success', synced: 0 });
      return;
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const fromDateStr = fromDate.toISOString().slice(0, 10);

    let totalSynced = 0;
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      for (const account of accounts) {
        let remoteTxs;
        try {
          remoteTxs = await saltEdge.getTransactions(
            account.salt_edge_connection_id,
            account.salt_edge_account_id,
            fromDateStr,
          );
        } catch {
          continue;
        }

        if (remoteTxs.length === 0) continue;

        let mlPredictions: Array<{ category: string; confidence: number }> = [];
        try {
          const mlRes = await axios.post(
            `${ML_SERVICE_URL}/categorize`,
            { transactions: remoteTxs.map(tx => ({ description: tx.description, amount: tx.amount })) },
            { timeout: 10000 },
          );
          mlPredictions = mlRes.data.predictions ?? [];
        } catch {
          // ML indisponível — continuar sem categorização
        }

        const { rows: categoryRows } = await client.query<{ id: string; name: string }>(
          'SELECT id, name FROM categories',
        );
        const categoryByName = Object.fromEntries(categoryRows.map(c => [c.name, c.id]));

        for (let i = 0; i < remoteTxs.length; i++) {
          const tx = remoteTxs[i];
          const pred = mlPredictions[i];
          const categoryId = pred ? (categoryByName[pred.category] ?? null) : null;
          const mlConfidence = pred?.confidence ?? null;

          await client.query(
            `INSERT INTO transactions
               (user_id, bank_account_id, category_id, salt_edge_transaction_id,
                description, amount, currency, transaction_date,
                ml_confidence, ml_categorized)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (salt_edge_transaction_id) DO UPDATE
               SET amount        = EXCLUDED.amount,
                   description   = EXCLUDED.description,
                   ml_confidence = EXCLUDED.ml_confidence,
                   updated_at    = NOW()`,
            [
              userId, account.id, categoryId, tx.id,
              tx.description, tx.amount, tx.currency_code, tx.made_on,
              mlConfidence, categoryId !== null,
            ],
          );
          totalSynced++;
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ status: 'success', synced: totalSynced });
  } catch (err) {
    next(err);
  }
});
