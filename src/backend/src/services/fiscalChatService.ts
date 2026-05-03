/**
 * Fiscal Chat Service — Anthropic Claude Sonnet 4.6 com prompt caching.
 *
 * Agrega o contexto fiscal completo do utilizador (perfil + cenários + lições
 * gerados pelo ML service) e injecta-o no system prompt como cache-breakpoint.
 * O cache Anthropic tem TTL de 5 min, ideal para conversas curtas.
 */

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { pool } from '../config/database.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:5000';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 1024;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY não configurada');
  }
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export function isChatAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ── Contexto fiscal ───────────────────────────────────────────────────────

interface FiscalContext {
  profile: Record<string, unknown> | null;
  analysis: Record<string, unknown> | null;
}

async function loadFiscalContext(userId: string): Promise<FiscalContext> {
  const [profileResult, txResult, investmentsResult] = await Promise.all([
    pool.query('SELECT * FROM fiscal_profile WHERE user_id = $1', [userId]),
    pool.query(
      `SELECT t.id, t.description, t.amount, t.transaction_date, c.name_pt AS category_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
         AND EXTRACT(YEAR FROM t.transaction_date) = $2
       ORDER BY t.transaction_date DESC LIMIT 500`,
      [userId, new Date().getFullYear()],
    ),
    pool.query(
      `SELECT id, name, ticker, type, quantity, purchase_price,
              currency, risk_level, institution, annual_rate, maturity_date
       FROM investments WHERE user_id = $1`,
      [userId],
    ),
  ]);

  let analysis: Record<string, unknown> | null = null;
  try {
    const mlRes = await axios.post(
      `${ML_SERVICE_URL}/fiscal-assistant/analyze`,
      {
        fiscal_profile: profileResult.rows[0] ?? null,
        transactions: txResult.rows,
        investments: investmentsResult.rows,
        current_month: new Date().getMonth() + 1,
      },
      { timeout: 15000 },
    );
    analysis = mlRes.data as Record<string, unknown>;
  } catch {
    analysis = null;
  }

  return { profile: profileResult.rows[0] ?? null, analysis };
}

function buildSystemPrompt(ctx: FiscalContext): string {
  const profile = ctx.profile ?? {};
  const analysis = ctx.analysis ?? {};
  const score = (analysis.fiscal_score as Record<string, unknown> | undefined) ?? {};
  const actions = (analysis.this_year_actions as unknown[]) ?? [];
  const lessons = (analysis.next_year_lessons as unknown[]) ?? [];
  const keep = (analysis.keep_doing as unknown[]) ?? [];
  const predictions = (analysis.predictions as Record<string, unknown>) ?? {};

  return `És o assistente fiscal do GoldLock, especializado em IRS português 2026 (OE 2026, Lei 73-A/2025).

Responde SEMPRE em português europeu (PT-PT), de forma clara, directa e útil.
Usa os dados reais do utilizador (abaixo) para responder. Se não tiveres dado, diz "não tenho essa informação".
Cita artigos do CIRS / EBF quando relevante. Não inventes valores.

═══════════ DADOS DO UTILIZADOR ═══════════

PERFIL FISCAL:
${JSON.stringify(profile, null, 2)}

SCORE FISCAL: ${score.score ?? '—'}/100 (${score.badge ?? '—'})
Taxa marginal: ${score.marginal_rate_pct ?? '—'}%
Potencial de optimização: ${score.optimization_potential_eur ?? 0}€

PRÓXIMAS ACÇÕES (top 3 cenários para o IRS 2026):
${actions.length === 0 ? '(nenhuma)' : actions.map((a, i) => {
    const s = a as Record<string, unknown>;
    return `${i + 1}. ${s.label} → poupa ${s.tax_saving_eur}€${
      Array.isArray(s.actions) ? '\n   ' + (s.actions as string[]).join('\n   ') : ''
    }`;
  }).join('\n')}

LIÇÕES PARA O IRS 2027 (padrões corrigíveis):
${lessons.length === 0 ? '(nenhuma)' : lessons.map((l, i) => {
    const s = l as Record<string, unknown>;
    return `${i + 1}. ${s.title}\n   ${s.description}`;
  }).join('\n')}

ESTÁ A FAZER BEM (manter):
${keep.length === 0 ? '(nenhuma)' : keep.map((k, i) => {
    const s = k as Record<string, unknown>;
    return `${i + 1}. ${s.title}`;
  }).join('\n')}

PREVISÕES FIM-DE-ANO POR CATEGORIA:
${Object.entries(predictions).map(([cat, p]) => {
    const pred = p as Record<string, unknown>;
    return `- ${cat}: previsto ${pred.predicted_year_end}€ / limite ${pred.limit_expense}€ — ${pred.alert}`;
  }).join('\n') || '(sem dados)'}

═══════════ REGRAS FISCAIS-CHAVE OE 2026 ═══════════

Escalões IRS 2026 (art.º 68.º CIRS):
1: até 8.342€ → 12,50% (parcela 0)
2: 8.342–12.587€ → 15,70% (parcela 266,94)
3: 12.587–17.838€ → 21,20% (parcela 959,23)
4: 17.838–23.089€ → 24,10% (parcela 1.476,53)
5: 23.089–29.397€ → 31,10% (parcela 3.092,76)
6: 29.397–43.090€ → 34,90% (parcela 4.209,85)
7: 43.090–46.567€ → 43,10% (parcela 7.743,23)
8: 46.567–86.634€ → 44,60% (parcela 8.441,73)
9: > 86.634€ → 48,00% (parcela 11.387,29)

Dedução específica Cat. A: 4.104€ (art.º 25.º CIRS)
Dedução por dependente: 600€ + 126€ por cada dependente acima de 3
IRS Jovem (art.º 12.º-B): isenção 100/75/75/75/50/50/50/25/25/25% até 29.542,15€
PPR (art.º 21.º EBF): 20% × montante, limite 400€ (≤34a) / 350€ (35-50a) / 300€ (>50a)
Saúde: 15%, limite 1.000€ (art.º 78.º-C)
Educação: 30%, limite 800€ (art.º 78.º-D)
Habitação/juros: 15%, limite 296€ (art.º 78.º-E)
Restauração: 15%, limite 250€ (art.º 78.º-B)

Filho dependente (art.º 13.º n.º 4 CIRS): ≤25 anos e rendimento ≤ RMMG×14 (€12.180 em 2026).`;
}

// ── Streaming ─────────────────────────────────────────────────────────────

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheRead: number;
    cacheCreation: number;
  };
}

/**
 * Envia uma mensagem ao Claude com streaming. Yields cada delta de texto e
 * devolve no fim o texto completo + uso de tokens.
 *
 * O system prompt usa cache-breakpoint para reaproveitar o contexto fiscal
 * em conversas seguidas (TTL 5 min Anthropic).
 */
export async function* streamChatResponse(
  userId: string,
  history: ChatHistoryMessage[],
  newMessage: string,
): AsyncGenerator<string, StreamResult, void> {
  const ctx = await loadFiscalContext(userId);
  const systemPrompt = buildSystemPrompt(ctx);

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history,
    { role: 'user', content: newMessage },
  ];

  const stream = await getClient().messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  let fullText = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
      yield event.delta.text;
    }
  }

  const finalMessage = await stream.finalMessage();
  return {
    text: fullText,
    usage: {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      cacheRead: finalMessage.usage.cache_read_input_tokens ?? 0,
      cacheCreation: finalMessage.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

export const CHAT_MODEL = MODEL;
