-- Adiciona campos IRS Jovem ao perfil fiscal (art.º 12.º-B CIRS, OE 2026)
ALTER TABLE fiscal_profile
  ADD COLUMN IF NOT EXISTS is_irs_jovem  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS years_working INTEGER,
  ADD COLUMN IF NOT EXISTS age           INTEGER;
