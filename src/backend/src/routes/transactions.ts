import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';

export const transactionsRouter = Router();

transactionsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, type } = req.query;
    const userId = req.user!.id;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = ['t.user_id = $1'];
    const params: unknown[] = [userId];
    let i = 2;

    if (category) { conditions.push(`c.name = $${i++}`); params.push(category); }
    if (startDate) { conditions.push(`t.transaction_date >= $${i++}`); params.push(startDate); }
    if (endDate)   { conditions.push(`t.transaction_date <= $${i++}`); params.push(endDate); }
    if (type === 'expense') conditions.push('t.amount < 0');
    if (type === 'income')  conditions.push('t.amount > 0');

    const where = conditions.join(' AND ');

    const [rows, countRow] = await Promise.all([
      pool.query(
        `SELECT t.id, t.description, t.amount, t.currency, t.transaction_date, t.is_recurring,
                t.ml_confidence, t.notes, t.bank_account_id,
                c.name_pt AS category_name, c.icon AS category_icon, c.color AS category_color, c.id AS category_id,
                b.bank_name, b.account_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
         WHERE ${where}
         ORDER BY t.transaction_date DESC, t.created_at DESC
         LIMIT $${i++} OFFSET $${i++}`,
        [...params, Number(limit), offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE ${where}`,
        params
      ),
    ]);

    const total = parseInt(countRow.rows[0].count, 10);
    res.json({
      status: 'success',
      data: rows.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.get('/summary', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-');

    const result = await pool.query(
      `SELECT
         c.name_pt AS category,
         c.color,
         SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS income,
         SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) AS expenses
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
         AND EXTRACT(YEAR  FROM t.transaction_date) = $2
         AND EXTRACT(MONTH FROM t.transaction_date) = $3
       GROUP BY c.name_pt, c.color`,
      [userId, year, mon]
    );

    const income   = result.rows.reduce((s, r) => s + Number(r.income   || 0), 0);
    const expenses = result.rows.reduce((s, r) => s + Number(r.expenses || 0), 0);
    const byCategory = result.rows
      .filter(r => r.category && Number(r.expenses) > 0)
      .map(r => ({ category: r.category, color: r.color, total: Number(r.expenses) }))
      .sort((a, b) => b.total - a.total);

    res.json({ status: 'success', data: { income, expenses, savings: income - expenses, byCategory } });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.put('/:id/category', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;
    const userId = req.user!.id;

    if (!categoryId) {
      res.status(400).json({ status: 'error', message: 'categoryId é obrigatório' });
      return;
    }

    const result = await pool.query(
      `UPDATE transactions
       SET category_id = $1, ml_categorized = false, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [categoryId, id, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Transação não encontrada' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Salt Edge sync — implementado no Módulo B
transactionsRouter.post('/sync', authenticate, async (_req, res) => {
  res.json({ status: 'success', message: 'Sync agendado. Integração Salt Edge disponível no Módulo B.' });
});
