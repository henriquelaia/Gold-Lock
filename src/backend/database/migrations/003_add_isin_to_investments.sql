-- Sprint 9 — PDF Import de Corretoras
-- Adiciona coluna ISIN à tabela investments para permitir deduplicação fiável
-- entre uploads sucessivos do mesmo PDF (mesmo ISIN + data + quantidade no mesmo user).

ALTER TABLE investments ADD COLUMN IF NOT EXISTS isin VARCHAR(12);

CREATE INDEX IF NOT EXISTS idx_investments_isin
  ON investments(isin) WHERE isin IS NOT NULL;

-- UNIQUE composto para INSERT ... ON CONFLICT DO NOTHING durante imports.
-- Permite múltiplas posições do mesmo título (ISIN) desde que difiram em data ou quantidade.
CREATE UNIQUE INDEX IF NOT EXISTS uq_investments_user_isin_date_qty
  ON investments(user_id, isin, purchase_date, quantity)
  WHERE isin IS NOT NULL AND purchase_date IS NOT NULL;
