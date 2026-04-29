import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../services/api';

export interface Quote {
  ticker: string;
  price: number;
  currency: string;
  change24h: number | null;
  source: 'polygon' | 'coingecko';
  cachedAt: string;
}

export interface HistoryPoint {
  date: string;
  close: number;
}

export interface SearchResult {
  ticker: string;
  name: string;
  type: string;
  exchange: string;
}

const QUOTABLE_TYPES = ['stock', 'etf', 'bond', 'crypto'];

export function useMarketQuote(ticker: string | undefined, assetType: string) {
  return useQuery<Quote>({
    queryKey: ['market', 'quote', ticker, assetType],
    queryFn: () =>
      marketApi.quote(ticker!, assetType).then((r) => r.data.data as Quote),
    staleTime: 15 * 60 * 1000,
    enabled: !!ticker && QUOTABLE_TYPES.includes(assetType),
    retry: 1,
  });
}

export function useMarketHistory(
  ticker: string | undefined,
  assetType: string,
  period: '30d' | '1y' = '30d'
) {
  return useQuery<{ ticker: string; period: string; points: HistoryPoint[] }>({
    queryKey: ['market', 'history', ticker, assetType, period],
    queryFn: () =>
      marketApi.history(ticker!, period, assetType).then((r) => r.data.data),
    staleTime: 60 * 60 * 1000,
    enabled: !!ticker && QUOTABLE_TYPES.includes(assetType),
    retry: 1,
  });
}

export function useMarketSearch(query: string, assetType?: string) {
  return useQuery<SearchResult[]>({
    queryKey: ['market', 'search', query, assetType],
    queryFn: () =>
      marketApi.search(query, assetType).then((r) => r.data.data as SearchResult[]),
    staleTime: 0,
    enabled: query.length >= 2,
    retry: 1,
  });
}
