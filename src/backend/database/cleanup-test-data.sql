-- Apagar todos os utilizadores e dados associados (CASCADE limpa tabelas dependentes)
-- Usar antes de abrir o projeto a utilizadores reais
--
-- Executar com:
--   docker exec -i goldlock-postgres psql -U goldlock -d goldlock_db < database/cleanup-test-data.sql
--
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
