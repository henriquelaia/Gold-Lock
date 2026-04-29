import axios from 'axios';
import { redisClient } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';

const MASSIVE_BASE   = 'https://api.massive.com';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const TTL_QUOTE   = 900;   // 15 min
const TTL_HISTORY = 3600;  // 1 hora

export interface Quote {
  ticker: string;
  price: number;
  currency: string;
  change24h: number | null;
  source: 'massive' | 'coingecko';
  cachedAt: string;
}

export interface SearchResult {
  ticker: string;
  name: string;
  type: string;
  exchange: string;
}

export interface HistoryPoint {
  date: string;
  close: number;
}

// ── Massive (stocks / ETFs) ────────────────────────────────────────────────

function massiveHeaders(): Record<string, string> {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new AppError('MASSIVE_API_KEY não configurada', 503);
  return { Authorization: `Bearer ${key}` };
}

async function getMassiveQuote(ticker: string): Promise<Quote> {
  const url = `${MASSIVE_BASE}/v2/aggs/ticker/${ticker.toUpperCase()}/prev`;
  const { data } = await axios.get(url, {
    headers: massiveHeaders(),
    timeout: 5000,
  });

  if (data.resultsCount === 0 || !data.results?.[0]) {
    throw new AppError(`Ticker ${ticker} não encontrado`, 404);
  }

  const r = data.results[0];
  return {
    ticker: ticker.toUpperCase(),
    price: r.c,
    currency: 'USD',
    change24h: r.o ? parseFloat((((r.c - r.o) / r.o) * 100).toFixed(2)) : null,
    source: 'massive',
    cachedAt: new Date().toISOString(),
  };
}

async function getMassiveHistory(ticker: string, period: '30d' | '1y'): Promise<HistoryPoint[]> {
  const to   = new Date();
  const from = new Date();
  if (period === '30d') from.setDate(from.getDate() - 30);
  else                  from.setFullYear(from.getFullYear() - 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const url  = `${MASSIVE_BASE}/v2/aggs/ticker/${ticker.toUpperCase()}/range/1/day/${fmt(from)}/${fmt(to)}`;

  const { data } = await axios.get(url, {
    headers: massiveHeaders(),
    params: { sort: 'asc', limit: 365 },
    timeout: 8000,
  });

  if (!data.results?.length) return [];

  return (data.results as Array<{ t: number; c: number }>).map((r) => ({
    date: new Date(r.t).toISOString().split('T')[0],
    close: r.c,
  }));
}

async function searchMassive(query: string): Promise<SearchResult[]> {
  const { data } = await axios.get(`${MASSIVE_BASE}/v3/reference/tickers`, {
    headers: massiveHeaders(),
    params: { search: query, active: true, limit: 10 },
    timeout: 5000,
  });

  return (data.results ?? []).map((r: Record<string, string>) => ({
    ticker:   r.ticker,
    name:     r.name,
    type:     r.type,
    exchange: r.primary_exchange ?? '',
  }));
}

// ── CoinGecko ──────────────────────────────────────────────────────────────

async function getCoinGeckoQuote(coinId: string): Promise<Quote> {
  const { data } = await axios.get(`${COINGECKO_BASE}/simple/price`, {
    params: { ids: coinId.toLowerCase(), vs_currencies: 'usd,eur', include_24hr_change: true },
    timeout: 5000,
  });

  const coin = data[coinId.toLowerCase()];
  if (!coin) throw new AppError(`Coin "${coinId}" não encontrada`, 404);

  return {
    ticker: coinId.toLowerCase(),
    price: coin.usd,
    currency: 'USD',
    change24h: coin.usd_24h_change != null
      ? parseFloat(coin.usd_24h_change.toFixed(2))
      : null,
    source: 'coingecko',
    cachedAt: new Date().toISOString(),
  };
}

async function getCoinGeckoHistory(coinId: string, period: '30d' | '1y'): Promise<HistoryPoint[]> {
  const days = period === '30d' ? 30 : 365;
  const { data } = await axios.get(`${COINGECKO_BASE}/coins/${coinId.toLowerCase()}/market_chart`, {
    params: { vs_currency: 'usd', days, interval: 'daily' },
    timeout: 8000,
  });

  return (data.prices as Array<[number, number]>).map(([ts, price]) => ({
    date: new Date(ts).toISOString().split('T')[0],
    close: parseFloat(price.toFixed(4)),
  }));
}

async function searchCoinGecko(query: string): Promise<SearchResult[]> {
  const { data } = await axios.get(`${COINGECKO_BASE}/search`, {
    params: { query },
    timeout: 5000,
  });

  return (data.coins ?? []).slice(0, 10).map((c: Record<string, string>) => ({
    ticker:   c.id,
    name:     c.name,
    type:     'crypto',
    exchange: 'CoinGecko',
  }));
}

// ── Helpers Redis ──────────────────────────────────────────────────────────

async function fromCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await redisClient.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function toCache(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch {
    // cache write failing não deve bloquear a resposta
  }
}

// ── API Pública ────────────────────────────────────────────────────────────

export async function getQuote(ticker: string, assetType: string): Promise<Quote> {
  const cacheKey = `market:quote:${ticker.toLowerCase()}`;
  const cached = await fromCache<Quote>(cacheKey);
  if (cached) return cached;

  let quote: Quote;
  try {
    quote = assetType === 'crypto'
      ? await getCoinGeckoQuote(ticker)
      : await getMassiveQuote(ticker);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Serviço de cotações indisponível', 503);
  }

  await toCache(cacheKey, quote, TTL_QUOTE);
  return quote;
}

export async function getHistory(ticker: string, assetType: string, period: '30d' | '1y'): Promise<HistoryPoint[]> {
  const cacheKey = `market:history:${ticker.toLowerCase()}:${period}`;
  const cached = await fromCache<HistoryPoint[]>(cacheKey);
  if (cached) return cached;

  let points: HistoryPoint[];
  try {
    points = assetType === 'crypto'
      ? await getCoinGeckoHistory(ticker, period)
      : await getMassiveHistory(ticker, period);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Serviço de cotações indisponível', 503);
  }

  await toCache(cacheKey, points, TTL_HISTORY);
  return points;
}

export async function searchTicker(query: string, assetType?: string): Promise<SearchResult[]> {
  if (assetType === 'crypto') return searchCoinGecko(query);
  try {
    const results = await searchMassive(query);
    if (results.length === 0) {
      const crypto = await searchCoinGecko(query);
      return crypto;
    }
    return results;
  } catch {
    return searchCoinGecko(query);
  }
}
