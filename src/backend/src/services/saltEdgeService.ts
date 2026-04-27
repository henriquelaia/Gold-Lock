import axios, { isAxiosError, type AxiosError } from 'axios';
import { AppError } from '../middleware/errorHandler.js';

// --- Tipos públicos ---

export interface SaltEdgeAccount {
  id: string;
  name: string;
  nature: string; // 'account' | 'savings' | 'card' | etc.
  balance: number;
  currency_code: string;
  extra: Record<string, unknown>;
}

export interface SaltEdgeTransaction {
  id: string;
  description: string;
  amount: number;
  currency_code: string;
  made_on: string; // YYYY-MM-DD
  status: 'posted' | 'pending';
  extra: Record<string, unknown>;
}

export interface SaltEdgeCustomer {
  id: string;        // normalizado — mapeado de customer_id na v6
  identifier: string;
}

export interface SaltEdgeConnectSession {
  connect_url: string;
  expires_at: string;
}

// --- Helpers internos ---

function getHeaders(): Record<string, string> {
  const appId = process.env.SALT_EDGE_APP_ID;
  const secret = process.env.SALT_EDGE_SECRET;

  if (!appId || !secret) {
    throw new AppError('Salt Edge não configurado.', 503);
  }

  return {
    'App-id': appId,
    'Secret': secret,
    'Content-Type': 'application/json',
  };
}

function getBaseUrl(): string {
  return process.env.SALT_EDGE_BASE_URL ?? 'https://www.saltedge.com/api/v6';
}

function handleError(err: unknown): never {
  if (err instanceof AppError) throw err;
  if (isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
    const message = axiosErr.response?.data?.error?.message ?? 'Erro Salt Edge';
    const s = axiosErr.response?.status;
    const status = s === 422 || s === 404 || s === 409 ? s : 502;
    throw new AppError(message, status);
  }
  throw new AppError('Erro inesperado ao contactar Salt Edge.', 502);
}

// --- Funções públicas ---

export async function createCustomer(identifier: string): Promise<SaltEdgeCustomer> {
  function normalize(raw: { customer_id?: string; id?: string; identifier: string }): SaltEdgeCustomer {
    return { id: raw.customer_id ?? raw.id ?? '', identifier: raw.identifier };
  }

  try {
    const { data } = await axios.post(
      `${getBaseUrl()}/customers`,
      { data: { identifier } },
      { headers: getHeaders() },
    );
    return normalize(data.data);
  } catch (err) {
    // Se já existe (409 DuplicatedCustomer), buscar pelo identifier
    if (isAxiosError(err) && err.response?.status === 409) {
      const message = (err.response.data as { error?: { message?: string } })?.error?.message ?? '';
      if (message.includes('already exists')) {
        const { data } = await axios.get(`${getBaseUrl()}/customers`, {
          headers: getHeaders(),
          params: { identifier },
        });
        const existing = (data.data as Array<{ customer_id?: string; id?: string; identifier: string }>)[0];
        if (existing) return normalize(existing);
      }
    }
    handleError(err);
  }
}

export async function createConnectSession(
  customerId: string,
  returnTo: string,
): Promise<SaltEdgeConnectSession> {
  try {
    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data } = await axios.post(
      `${getBaseUrl()}/connections/connect`,
      {
        data: {
          customer_id: customerId,
          consent: {
            scopes: ['accounts', 'transactions'],
            from_date: fromDate,
          },
          attempt: {
            return_to: returnTo,
          },
        },
      },
      { headers: getHeaders() },
    );
    return {
      connect_url: data.data.connect_url,
      expires_at: data.data.expires_at ?? new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  } catch (err) {
    handleError(err);
  }
}

export async function getAccounts(connectionId: string): Promise<SaltEdgeAccount[]> {
  try {
    const { data } = await axios.get(`${getBaseUrl()}/accounts`, {
      headers: getHeaders(),
      params: { connection_id: connectionId },
    });
    return data.data as SaltEdgeAccount[];
  } catch (err) {
    handleError(err);
  }
}

export async function getTransactions(
  connectionId: string,
  accountId: string,
  fromDate?: string,
): Promise<SaltEdgeTransaction[]> {
  try {
    const { data } = await axios.get(`${getBaseUrl()}/transactions`, {
      headers: getHeaders(),
      params: {
        connection_id: connectionId,
        account_id: accountId,
        ...(fromDate ? { from_date: fromDate } : {}),
      },
    });
    return data.data as SaltEdgeTransaction[];
  } catch (err) {
    handleError(err);
  }
}

export async function deleteConnection(connectionId: string): Promise<void> {
  try {
    await axios.delete(`${getBaseUrl()}/connections/${connectionId}`, {
      headers: getHeaders(),
    });
  } catch (err) {
    handleError(err);
  }
}

export async function refreshConnection(connectionId: string): Promise<void> {
  try {
    await axios.put(
      `${getBaseUrl()}/connections/${connectionId}/refresh`,
      {},
      { headers: getHeaders() },
    );
  } catch (err) {
    handleError(err);
  }
}
