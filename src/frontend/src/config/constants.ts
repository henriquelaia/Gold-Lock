/**
 * ATENÇÃO — TAXA DE CÂMBIO ESTÁTICA
 *
 * Este valor é um placeholder temporário para desenvolvimento (Sprint 4).
 * Qualquer conversão de moeda (USD→EUR, GBP→EUR, etc.) DEVE usar taxas
 * em tempo real a partir de uma API externa, nunca valores hardcoded.
 *
 * Implementação obrigatória no Sprint 10:
 *   - Integrar API de câmbio (ex: Frankfurter https://api.frankfurter.app/latest)
 *   - Criar hook `useExchangeRates()` que faz fetch e cacheia via React Query
 *   - Substituir todas as referências a EUR_RATE pelo valor devolvido pelo hook
 *   - Atualizar automaticamente a cada 4 horas (staleTime no React Query)
 *
 * Ficheiros que usam EUR_RATE e precisam de migrar:
 *   - src/pages/InvestmentsPage.tsx
 *   - src/pages/DashboardPage.tsx
 */
export const EUR_RATE = 0.92; // TODO Sprint 10: remover — usar useExchangeRates()
