import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const fiscalProfileRouter = Router();

const FiscalProfileSchema = z.object({
  grossIncomeAnnual:            z.number().positive().optional(),
  socialSecurityContributions:  z.number().min(0).optional(),
  maritalStatus:                z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  dependents:                   z.number().int().min(0).optional(),
  disabilityPercentage:         z.number().min(0).max(100).optional(),
  withholdingTax:               z.number().min(0).optional(),
  pprContributions:             z.number().min(0).optional(),
  fiscalYear:                   z.number().int().min(2020).optional(),
});

fiscalProfileRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fiscal_profile WHERE user_id = $1',
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

fiscalProfileRouter.put('/', authenticate, async (req, res, next) => {
  try {
    const body = FiscalProfileSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO fiscal_profile
         (user_id, gross_income_annual, social_security_contributions, marital_status,
          dependents, disability_percentage, withholding_tax, ppr_contributions, fiscal_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         gross_income_annual           = COALESCE($2, fiscal_profile.gross_income_annual),
         social_security_contributions = COALESCE($3, fiscal_profile.social_security_contributions),
         marital_status                = COALESCE($4, fiscal_profile.marital_status),
         dependents                    = COALESCE($5, fiscal_profile.dependents),
         disability_percentage         = COALESCE($6, fiscal_profile.disability_percentage),
         withholding_tax               = COALESCE($7, fiscal_profile.withholding_tax),
         ppr_contributions             = COALESCE($8, fiscal_profile.ppr_contributions),
         fiscal_year                   = COALESCE($9, fiscal_profile.fiscal_year),
         updated_at                    = NOW()
       RETURNING *`,
      [
        req.user!.id,
        body.grossIncomeAnnual            ?? null,
        body.socialSecurityContributions  ?? null,
        body.maritalStatus                ?? null,
        body.dependents                   ?? null,
        body.disabilityPercentage         ?? null,
        body.withholdingTax               ?? null,
        body.pprContributions             ?? null,
        body.fiscalYear                   ?? new Date().getFullYear(),
      ]
    );
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});
