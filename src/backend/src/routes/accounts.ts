import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/errorHandler.js';
import { verifySaltEdgeWebhook } from '../middleware/saltEdgeWebhook.js';
import * as saltEdge from '../services/saltEdgeService.js';

export const accountsRouter = Router();

// ── GET / — listar contas ativas ──────────────────────────────────────────────

accountsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { rows } = await db.query<{
      id: string;
      bank_name: string;
      account_name: string | null;
      iban: string | null;
      balance: string;
      currency: string;
      status: string;
      last_synced_at: Date | null;
    }>(
      `SELECT id, bank_name, account_name, iban, balance, currency, status, last_synced_at
       FROM bank_accounts
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at ASC`,
      [userId],
    );

    res.json({ status: 'success', data: rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /connect — iniciar ligação Open Banking ──────────────────────────────

const connectBodySchema = z.object({
  return_to: z.string().url().optional(),
});

const ALLOWED_RETURN_ORIGINS = [
  process.env.FRONTEND_URL ?? 'http://localhost:3000',
];

function isAllowedReturnTo(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_RETURN_ORIGINS.some(origin => {
      try { return parsed.origin === new URL(origin).origin; }
      catch { return false; }
    });
  } catch {
    return false;
  }
}

accountsRouter.post('/connect', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const body = connectBodySchema.parse(req.body);

    if (body.return_to && !isAllowedReturnTo(body.return_to)) {
      throw new AppError('URL de retorno não permitida.', 400);
    }

    const { rows } = await db.query<{ salt_edge_customer_id: string | null }>(
      'SELECT salt_edge_customer_id FROM users WHERE id = $1',
      [userId],
    );

    let customerId = rows[0]?.salt_edge_customer_id ?? null;

    if (!customerId) {
      const customer = await saltEdge.createCustomer(userId);
      customerId = customer.id;
      await db.query(
        'UPDATE users SET salt_edge_customer_id = $1 WHERE id = $2',
        [customerId, userId],
      );
    }

    const session = await saltEdge.createConnectSession(
      customerId,
      body.return_to ?? `${ALLOWED_RETURN_ORIGINS[0]}/accounts`,
    );

    res.json({ status: 'success', data: { connect_url: session.connect_url } });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/balance — saldo atualizado ───────────────────────────────────────

accountsRouter.get('/:id/balance', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    const { rows } = await db.query<{
      id: string;
      balance: string;
      currency: string;
      last_synced_at: Date | null;
      salt_edge_connection_id: string | null;
      salt_edge_account_id: string | null;
    }>(
      `SELECT id, balance, currency, last_synced_at, salt_edge_connection_id, salt_edge_account_id
       FROM bank_accounts
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [accountId, userId],
    );

    if (rows.length === 0) {
      throw new AppError('Conta não encontrada.', 404);
    }

    const account = rows[0];
    const stale =
      !account.last_synced_at ||
      Date.now() - new Date(account.last_synced_at).getTime() > 60 * 60 * 1000;

    let balance = account.balance;
    let lastSyncedAt: Date | null = account.last_synced_at;

    if (stale && account.salt_edge_connection_id) {
      await saltEdge.refreshConnection(account.salt_edge_connection_id);
      const remoteAccounts = await saltEdge.getAccounts(account.salt_edge_connection_id);
      const remoteAccount = remoteAccounts.find(
        (a) => a.id === account.salt_edge_account_id,
      );

      if (remoteAccount) {
        await db.query(
          `UPDATE bank_accounts SET balance = $1, last_synced_at = NOW() WHERE id = $2`,
          [remoteAccount.balance, account.id],
        );
        balance = String(remoteAccount.balance);
        lastSyncedAt = new Date();
      }
    }

    res.json({
      status: 'success',
      data: { balance, currency: account.currency, last_synced_at: lastSyncedAt },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /sync — importar contas de todas as ligações Salt Edge do utilizador ─
// Útil em dev (sem webhook público) e como fallback de resync manual

accountsRouter.post('/sync', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { rows } = await db.query<{ salt_edge_customer_id: string | null }>(
      'SELECT salt_edge_customer_id FROM users WHERE id = $1',
      [userId],
    );

    const customerId = rows[0]?.salt_edge_customer_id;
    if (!customerId) {
      res.json({ status: 'success', data: { synced: 0, message: 'Sem ligações Salt Edge.' } });
      return;
    }

    const connections = await saltEdge.listConnections(customerId);
    let synced = 0;

    for (const conn of connections) {
      if (conn.status !== 'active') continue;

      const remoteAccounts = await saltEdge.getAccounts(conn.id);
      for (const acc of remoteAccounts) {
        await db.query(
          `INSERT INTO bank_accounts
             (user_id, bank_name, account_name, iban,
              salt_edge_connection_id, salt_edge_account_id,
              balance, currency, status, last_synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',NOW())
           ON CONFLICT (salt_edge_account_id) DO UPDATE
             SET balance        = EXCLUDED.balance,
                 last_synced_at = NOW(),
                 status         = 'active'`,
          [
            userId,
            conn.provider_name,
            acc.name,
            (acc.extra?.['iban'] as string | undefined) ?? null,
            conn.id,
            acc.id,
            acc.balance,
            acc.currency_code,
          ],
        );
        synced++;
      }
    }

    res.json({ status: 'success', data: { synced } });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id — desligar conta ──────────────────────────────────────────────

accountsRouter.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    const { rows } = await db.query<{
      id: string;
      salt_edge_connection_id: string | null;
    }>(
      'SELECT id, salt_edge_connection_id FROM bank_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId],
    );

    if (rows.length === 0) {
      throw new AppError('Conta não encontrada.', 404);
    }

    const account = rows[0];

    if (account.salt_edge_connection_id) {
      try {
        await saltEdge.deleteConnection(account.salt_edge_connection_id);
      } catch {
        // conexão pode já não existir na Salt Edge — ignorar
      }
    }

    await db.query(
      `UPDATE bank_accounts SET status = 'disconnected', updated_at = NOW() WHERE id = $1`,
      [account.id],
    );

    res.json({ status: 'success', message: 'Conta desligada.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /webhook — callback Salt Edge ───────────────────────────────────────

interface WebhookData {
  connection_id?: string;
  customer_id?: string;
  stage?: string;
  status?: string;
  type?: string;
}

interface WebhookPayload {
  data?: WebhookData & { type?: string };
  meta?: { version?: string; time?: string; type?: string };
}

accountsRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  verifySaltEdgeWebhook,
  async (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });

    try {
      const payload = JSON.parse((req.body as Buffer).toString()) as WebhookPayload;
      const data = payload.data;

      if (!data) return;

      const eventType = data.type ?? payload.meta?.type ?? '';
      const connectionId = data.connection_id;
      const customerId = data.customer_id;

      if (
        eventType === 'connection.success' ||
        data.stage === 'finish'
      ) {
        if (!connectionId || !customerId) return;

        const remoteAccounts = await saltEdge.getAccounts(connectionId);

        for (const remoteAccount of remoteAccounts) {
          await db.query(
            `INSERT INTO bank_accounts
               (user_id, bank_name, account_name, iban,
                salt_edge_connection_id, salt_edge_account_id,
                balance, currency, status, last_synced_at)
             SELECT
               u.id,
               $1, $2, $3, $4, $5, $6, $7,
               'active', NOW()
             FROM users u
             WHERE u.salt_edge_customer_id = $8
             ON CONFLICT (salt_edge_account_id) DO UPDATE
               SET balance        = EXCLUDED.balance,
                   last_synced_at = NOW(),
                   status         = 'active'`,
            [
              remoteAccount.name,
              (remoteAccount.extra?.['account_name'] as string | undefined) ?? remoteAccount.name,
              (remoteAccount.extra?.['iban'] as string | undefined) ?? null,
              connectionId,
              remoteAccount.id,
              remoteAccount.balance,
              remoteAccount.currency_code,
              customerId,
            ],
          );
        }
      } else if (eventType === 'connection.error') {
        if (!connectionId) return;
        await db.query(
          `UPDATE bank_accounts SET status = 'error' WHERE salt_edge_connection_id = $1`,
          [connectionId],
        );
      } else if (eventType === 'connection.destroyed') {
        if (!connectionId) return;
        await db.query(
          `UPDATE bank_accounts SET status = 'disconnected' WHERE salt_edge_connection_id = $1`,
          [connectionId],
        );
      }
    } catch (err) {
      console.error('[webhook] erro ao processar payload Salt Edge:', err);
    }
  },
);

