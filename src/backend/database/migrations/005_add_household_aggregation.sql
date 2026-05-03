-- Migration 005 — Agregação familiar (Fase 2 Sprint 10d)
-- Adiciona campos para comparar IRS Jovem vs incluir com pais como dependente.
-- Art.º 13.º n.º 4 CIRS — filho pode ser dependente se ≤ 25 anos e
-- rendimento ≤ retribuição mínima mensal garantida × 14 (€12.180 em 2026).

ALTER TABLE fiscal_profile
  ADD COLUMN IF NOT EXISTS parent_household_income NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS parent_marital_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parent_other_dependents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS can_be_aggregated_with_parents BOOLEAN DEFAULT FALSE;

-- Constraint num passo separado para que ALTER TABLE seja idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fiscal_profile_parent_marital_status_check'
  ) THEN
    ALTER TABLE fiscal_profile
      ADD CONSTRAINT fiscal_profile_parent_marital_status_check
      CHECK (parent_marital_status IS NULL
             OR parent_marital_status IN ('single','married','divorced','widowed'));
  END IF;
END $$;

COMMENT ON COLUMN fiscal_profile.parent_household_income
  IS 'Rendimento bruto anual dos pais (€) — usado no cenário aggregated_with_parents';
COMMENT ON COLUMN fiscal_profile.parent_marital_status
  IS 'Estado civil dos pais — afecta quociente conjugal no motor IRS';
COMMENT ON COLUMN fiscal_profile.parent_other_dependents
  IS 'Outros dependentes que os pais já têm (excluindo o utilizador)';
COMMENT ON COLUMN fiscal_profile.can_be_aggregated_with_parents
  IS 'Flag derivada — TRUE se age ≤ 25 e gross_income ≤ RMMG×14 (art.º 13.º n.º 4 CIRS)';
