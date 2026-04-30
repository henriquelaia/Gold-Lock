/**
 * Sprint 9 — PDF Import de Corretoras
 *
 * Extrai transacções de compra a partir de extractos PDF de:
 *   - DEGIRO (Account Statement, formato europeu)
 *   - XTB (Statement of Account, formato US/UK)
 *   - Trade Republic (Securities Statement, formato alemão)
 *
 * Cada parser é uma função pura (texto → ParsedTransaction[]) para facilitar
 * testes unitários no Sprint 11.
 */

// pdfjs-dist legacy build evita worker setup em ambiente Node
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface ParsedTransaction {
  isin?:         string;
  ticker?:       string;
  name:          string;
  type:          'stock' | 'etf' | 'crypto';
  quantity:      number;
  purchasePrice: number;
  purchaseDate:  string;       // YYYY-MM-DD
  currency:      string;       // EUR / USD / GBP
  institution:   string;       // 'DEGIRO' | 'XTB' | 'Trade Republic'
}

export type Broker = 'degiro' | 'xtb' | 'traderepublic' | 'unknown';

// ── Extracção de texto ─────────────────────────────────────────────────────

export async function extractText(pdfBuffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(pdfBuffer);
  const doc = await getDocument({ data: uint8 }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ');
    pages.push(pageText);
  }
  return pages.join('\n');
}

// ── Detecção de broker ─────────────────────────────────────────────────────

export function detectBroker(text: string): Broker {
  if (/Trade Republic/i.test(text)) return 'traderepublic';
  if (/\bXTB\b|X-Trade Brokers/i.test(text)) return 'xtb';
  if (/\bDEGIRO\b|flatexDEGIRO/i.test(text)) return 'degiro';
  return 'unknown';
}

// ── Helpers comuns ─────────────────────────────────────────────────────────

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/;

function parseEuropeanNumber(raw: string): number {
  // '1.234,56' → '1234.56'; '1234,56' → '1234.56'; '1234.56' → '1234.56'
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  return Number(cleaned);
}

function parseUsNumber(raw: string): number {
  // '1,234.56' → '1234.56'; '1234.56' → '1234.56'
  const cleaned = raw.replace(/,/g, '');
  return Number(cleaned);
}

function ddMmYyyyToIso(s: string, sep: '-' | '.' | '/' = '-'): string {
  const [d, m, y] = s.split(sep);
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const ETF_ISSUERS_RE = /(iShares|Vanguard|Lyxor|SPDR|Xtrackers|Amundi|VanEck|WisdomTree|HSBC ETF|Invesco|JPMorgan ETF)\b/i;
const CRYPTO_KEYWORDS_RE = /\b(Bitcoin|Ethereum|Solana|Cardano|Polkadot|Ripple|BTC|ETH|SOL|ADA|DOT|XRP)\b/i;
const CRYPTO_TICKERS_RE = /\.(BTC|ETH|SOL|ADA|DOT|XRP|USDT|BUSD)$/i;

function inferType(name: string, ticker?: string): 'stock' | 'etf' | 'crypto' {
  if ((ticker && CRYPTO_TICKERS_RE.test(ticker)) || CRYPTO_KEYWORDS_RE.test(name)) return 'crypto';
  if (/\bETF\b/i.test(name) || ETF_ISSUERS_RE.test(name)) return 'etf';
  return 'stock';
}

// ── Parser DEGIRO ──────────────────────────────────────────────────────────

/**
 * Account Statement Degiro — linhas tabulares no formato:
 *   DD-MM-YYYY  HH:MM  PRODUTO  ISIN  BOLSA  Compra/Venda  QTD  PREÇO  CCY
 * Exemplo: "01-04-2024 09:32 iShares Core S&P 500 ETF IE00B5BMR087 NDQ Compra 10 482,50 EUR"
 *
 * O Degiro também usa formato "Compra 10 a 482,50 EUR/título" em alguns extractos
 * — capturado pela segunda regex como fallback.
 */
export function parseDegiro(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Formato tabular principal
  const TABULAR = /(\d{2}-\d{2}-\d{4})\s+\d{2}:\d{2}\s+(.+?)\s+([A-Z]{2}[A-Z0-9]{10})\s+\S+\s+(?:Compra|Buy)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+([A-Z]{3})/g;
  for (const m of text.matchAll(TABULAR)) {
    const [, date, name, isin, qty, price, currency] = m;
    if (!ISIN_RE.test(isin)) continue;
    const cleanName = name.trim().replace(/\s+/g, ' ');
    transactions.push({
      isin,
      name:          cleanName,
      type:          inferType(cleanName),
      quantity:      parseEuropeanNumber(qty),
      purchasePrice: parseEuropeanNumber(price),
      purchaseDate:  ddMmYyyyToIso(date, '-'),
      currency,
      institution:   'DEGIRO',
    });
  }

  // Formato narrativo: "Compra 10 título a 482,50 EUR"
  const NARRATIVE = /(?:Compra|Buy)\s+(\d+(?:[.,]\d+)?)\s+(?:títulos?|shares?|de\s+)?(.+?)\s+(?:a\s+|@\s*)(\d+(?:[.,]\d+)?)\s*([A-Z]{3})[^\n]*?(?:ISIN[:\s]*)?([A-Z]{2}[A-Z0-9]{10})?[^\n]*?(\d{2}-\d{2}-\d{4})/g;
  for (const m of text.matchAll(NARRATIVE)) {
    const [, qty, name, price, currency, isin, date] = m;
    if (isin && !ISIN_RE.test(isin)) continue;
    // Evitar duplicar com o formato tabular
    if (isin && transactions.some(t => t.isin === isin && t.purchaseDate === ddMmYyyyToIso(date, '-'))) continue;
    const cleanName = name.trim().replace(/\s+/g, ' ');
    transactions.push({
      isin:          isin || undefined,
      name:          cleanName,
      type:          inferType(cleanName),
      quantity:      parseEuropeanNumber(qty),
      purchasePrice: parseEuropeanNumber(price),
      purchaseDate:  ddMmYyyyToIso(date, '-'),
      currency,
      institution:   'DEGIRO',
    });
  }

  return transactions;
}

// ── Parser XTB ─────────────────────────────────────────────────────────────

/**
 * XTB Statement of Account — secções "Closed Positions" e "Open Positions".
 * Linha típica:
 *   SYMBOL  Buy  VOLUME  YYYY-MM-DD HH:MM:SS  OPEN_PRICE  ...  CCY
 * Ex: "AAPL.US Buy 10 2024-03-15 14:32:01 178.42 USD"
 *
 * XTB não inclui ISIN nas tabelas de posições — apenas symbol/ticker.
 * Datas em formato ISO (YYYY-MM-DD) e números com ponto decimal.
 */
export function parseXTB(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Bloco principal: Symbol Buy Volume Date Time Price ... Currency
  const TX_LINE = /([A-Z][A-Z0-9.]{1,15})\s+Buy\s+(\d+(?:\.\d+)?)\s+(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}\s+(\d+(?:\.\d+)?)[^\n]*?([A-Z]{3})\s/g;
  for (const m of text.matchAll(TX_LINE)) {
    const [, symbol, qty, date, price, currency] = m;
    transactions.push({
      ticker:        symbol,
      name:          symbol,           // XTB raramente inclui o nome completo na tabela
      type:          inferType(symbol, symbol),
      quantity:      parseUsNumber(qty),
      purchasePrice: parseUsNumber(price),
      purchaseDate:  date,
      currency,
      institution:   'XTB',
    });
  }

  // Fallback narrativo: "Bought 10 AAPL @ 178.42 USD on 2024-03-15"
  const NARRATIVE = /Bought\s+(\d+(?:\.\d+)?)\s+([A-Z][A-Z0-9.]{1,15})\s+(?:@|at)\s+(\d+(?:\.\d+)?)\s+([A-Z]{3})\s+on\s+(\d{4}-\d{2}-\d{2})/g;
  for (const m of text.matchAll(NARRATIVE)) {
    const [, qty, symbol, price, currency, date] = m;
    if (transactions.some(t => t.ticker === symbol && t.purchaseDate === date)) continue;
    transactions.push({
      ticker:        symbol,
      name:          symbol,
      type:          inferType(symbol, symbol),
      quantity:      parseUsNumber(qty),
      purchasePrice: parseUsNumber(price),
      purchaseDate:  date,
      currency,
      institution:   'XTB',
    });
  }

  return transactions;
}

// ── Parser Trade Republic ─────────────────────────────────────────────────

/**
 * Trade Republic Securities Statement — secção de transacções.
 * Formato alemão (datas DD.MM.YYYY, números com vírgula decimal).
 *
 * Linha típica:
 *   DD.MM.YYYY  ISIN  NOME  Kauf/Compra  QTD × PRECO  TOTAL EUR
 * Ex: "15.03.2024 US0378331005 Apple Inc. Kauf 5 × 178,42 892,10 EUR"
 *
 * Trade Republic exporta também o portfólio agregado (sem datas individuais);
 * neste caso o regex não captura nada e devolvemos array vazio.
 */
export function parseTradeRepublic(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Formato com Kauf/Compra explícito
  const TX_KAUF = /(\d{2}\.\d{2}\.\d{4})\s+([A-Z]{2}[A-Z0-9]{10})\s+(.+?)\s+(?:Kauf|Compra|Buy)\s+(\d+(?:,\d+)?)\s*[×x]\s*(\d+(?:,\d+)?)\s+(?:\d+(?:,\d+)?)?\s*EUR/g;
  for (const m of text.matchAll(TX_KAUF)) {
    const [, date, isin, name, qty, price] = m;
    if (!ISIN_RE.test(isin)) continue;
    const cleanName = name.trim().replace(/\s+/g, ' ');
    transactions.push({
      isin,
      name:          cleanName,
      type:          inferType(cleanName),
      quantity:      parseEuropeanNumber(qty),
      purchasePrice: parseEuropeanNumber(price),
      purchaseDate:  ddMmYyyyToIso(date, '.'),
      currency:      'EUR',
      institution:   'Trade Republic',
    });
  }

  // Formato compacto sem keyword Kauf (multiplica directamente)
  const TX_COMPACT = /(\d{2}\.\d{2}\.\d{4})\s+([A-Z]{2}[A-Z0-9]{10})\s+(.+?)\s+(\d+(?:,\d+)?)\s*[×x]\s*(\d+(?:,\d+)?)\s*EUR/g;
  for (const m of text.matchAll(TX_COMPACT)) {
    const [, date, isin, name, qty, price] = m;
    if (!ISIN_RE.test(isin)) continue;
    const isoDate = ddMmYyyyToIso(date, '.');
    if (transactions.some(t => t.isin === isin && t.purchaseDate === isoDate)) continue;
    const cleanName = name.trim().replace(/\s+/g, ' ');
    transactions.push({
      isin,
      name:          cleanName,
      type:          inferType(cleanName),
      quantity:      parseEuropeanNumber(qty),
      purchasePrice: parseEuropeanNumber(price),
      purchaseDate:  isoDate,
      currency:      'EUR',
      institution:   'Trade Republic',
    });
  }

  return transactions;
}

// ── Orchestrador ──────────────────────────────────────────────────────────

export async function parsePdf(buffer: Buffer): Promise<{ broker: Broker; transactions: ParsedTransaction[] }> {
  const text = await extractText(buffer);
  const broker = detectBroker(text);

  let transactions: ParsedTransaction[] = [];
  switch (broker) {
    case 'degiro':        transactions = parseDegiro(text);        break;
    case 'xtb':           transactions = parseXTB(text);           break;
    case 'traderepublic': transactions = parseTradeRepublic(text); break;
    default:              transactions = [];                       break;
  }

  return { broker, transactions };
}
