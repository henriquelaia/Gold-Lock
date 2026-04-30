import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePdf, type ParsedTransaction } from '../services/pdfImportService.js';

export const investmentsRouter = Router();

const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{10}$/;

const InvestmentSchema = z.object({
  name:          z.string().min(1).max(255),
  ticker:        z.string().max(20).optional(),
  isin:          z.string().regex(ISIN_REGEX).optional(),
  type:          z.enum(['stock', 'etf', 'bond', 'crypto', 'certificado', 'deposito']),
  quantity:      z.number().positive(),
  purchasePrice: z.number().positive(),
  purchaseDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency:      z.string().length(3).default('EUR'),
  riskLevel:     z.enum(['guaranteed', 'moderate', 'high']).default('moderate'),
  institution:   z.string().optional(),
  maturityDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  annualRate:    z.number().min(0).optional(),
  notes:         z.string().optional(),
});

investmentsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

investmentsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = InvestmentSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO investments
         (user_id, name, ticker, isin, type, quantity, purchase_price, purchase_date,
          currency, risk_level, institution, maturity_date, annual_rate, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user!.id,
        body.name,
        body.ticker     ?? null,
        body.isin       ?? null,
        body.type,
        body.quantity,
        body.purchasePrice,
        body.purchaseDate  ?? null,
        body.currency,
        body.riskLevel,
        body.institution  ?? null,
        body.maturityDate ?? null,
        body.annualRate   ?? null,
        body.notes        ?? null,
      ]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

investmentsRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const body = InvestmentSchema.partial().parse(req.body);
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (body.name          !== undefined) { sets.push(`name = $${i++}`);            params.push(body.name); }
    if (body.ticker        !== undefined) { sets.push(`ticker = $${i++}`);          params.push(body.ticker); }
    if (body.isin          !== undefined) { sets.push(`isin = $${i++}`);            params.push(body.isin); }
    if (body.type          !== undefined) { sets.push(`type = $${i++}`);            params.push(body.type); }
    if (body.quantity      !== undefined) { sets.push(`quantity = $${i++}`);        params.push(body.quantity); }
    if (body.purchasePrice !== undefined) { sets.push(`purchase_price = $${i++}`);  params.push(body.purchasePrice); }
    if (body.purchaseDate  !== undefined) { sets.push(`purchase_date = $${i++}`);   params.push(body.purchaseDate); }
    if (body.currency      !== undefined) { sets.push(`currency = $${i++}`);        params.push(body.currency); }
    if (body.riskLevel     !== undefined) { sets.push(`risk_level = $${i++}`);      params.push(body.riskLevel); }
    if (body.institution   !== undefined) { sets.push(`institution = $${i++}`);     params.push(body.institution); }
    if (body.maturityDate  !== undefined) { sets.push(`maturity_date = $${i++}`);   params.push(body.maturityDate); }
    if (body.annualRate    !== undefined) { sets.push(`annual_rate = $${i++}`);     params.push(body.annualRate); }
    if (body.notes         !== undefined) { sets.push(`notes = $${i++}`);           params.push(body.notes); }

    if (sets.length === 0) {
      res.status(400).json({ status: 'error', message: 'Nenhum campo para actualizar' });
      return;
    }
    sets.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE investments SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`,
      [...params, req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Investimento não encontrado' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

investmentsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM investments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Investimento não encontrado' });
      return;
    }
    res.json({ status: 'success', message: 'Investimento eliminado' });
  } catch (err) {
    next(err);
  }
});

// ── PDF import (Sprint 9) ───────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Apenas ficheiros PDF são aceites.'));
      return;
    }
    cb(null, true);
  },
});

interface AnnotatedTransaction extends ParsedTransaction {
  duplicate: boolean;
}

investmentsRouter.post('/import-pdf', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Ficheiro PDF é obrigatório.', 400);

    const { broker, transactions } = await parsePdf(req.file.buffer);

    // Deduplicação contra investimentos existentes (mesmo user)
    const existing = await pool.query<{ isin: string; purchase_date: string; quantity: string }>(
      'SELECT isin, purchase_date, quantity FROM investments WHERE user_id = $1 AND isin IS NOT NULL',
      [req.user!.id],
    );
    const existingKeys = new Set(
      existing.rows.map(r => `${r.isin}|${r.purchase_date}|${Number(r.quantity)}`),
    );

    const annotated: AnnotatedTransaction[] = transactions.map(tx => ({
      ...tx,
      duplicate: tx.isin
        ? existingKeys.has(`${tx.isin}|${tx.purchaseDate}|${tx.quantity}`)
        : false,
    }));

    res.json({
      status: 'success',
      data: { broker, transactions: annotated, total: annotated.length },
    });
  } catch (err) {
    if (err instanceof multer.MulterError) return next(new AppError(err.message, 400));
    if (err instanceof Error && err.message.startsWith('Apenas ficheiros PDF')) {
      return next(new AppError(err.message, 400));
    }
    next(err);
  }
});

const ConfirmImportSchema = z.object({
  transactions: z.array(z.object({
    isin:          z.string().regex(ISIN_REGEX).optional(),
    ticker:        z.string().max(20).optional(),
    name:          z.string().min(1).max(255),
    type:          z.enum(['stock', 'etf', 'crypto']),
    quantity:      z.number().positive(),
    purchasePrice: z.number().positive(),
    purchaseDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currency:      z.string().length(3),
    institution:   z.string().max(255),
  })).min(1).max(100),
});

investmentsRouter.post('/import-pdf/confirm', authenticate, async (req, res, next) => {
  try {
    const { transactions } = ConfirmImportSchema.parse(req.body);

    let inserted = 0;
    let skipped = 0;

    // Inserir uma transacção de cada vez para tirar partido do UNIQUE composto.
    // ON CONFLICT DO NOTHING + RETURNING permite contar inseridas vs ignoradas.
    for (const tx of transactions) {
      const result = await pool.query(
        `INSERT INTO investments
           (user_id, name, ticker, isin, type, quantity, purchase_price, purchase_date,
            currency, risk_level, institution)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'moderate',$10)
         ON CONFLICT (user_id, isin, purchase_date, quantity)
           WHERE isin IS NOT NULL AND purchase_date IS NOT NULL
         DO NOTHING
         RETURNING id`,
        [
          req.user!.id,
          tx.name,
          tx.ticker ?? null,
          tx.isin   ?? null,
          tx.type,
          tx.quantity,
          tx.purchasePrice,
          tx.purchaseDate,
          tx.currency,
          tx.institution,
        ],
      );
      if (result.rowCount && result.rowCount > 0) inserted++;
      else skipped++;
    }

    res.json({ status: 'success', data: { inserted, skipped } });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});
