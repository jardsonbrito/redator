-- ============================================================
-- Migração: GRANTs explícitos no schema public
-- Data: 2026-05-28
-- Motivo: Supabase deixará de expor tabelas do schema public
--         automaticamente ao Data API a partir de 30/10/2026.
--         Projetos existentes precisam garantir GRANTs explícitos.
-- Referência: https://supabase.com/changelog (maio 2026)
-- ============================================================

-- 1. Cobre todas as tabelas e sequências já existentes
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Garante que novas tabelas/sequências criadas no futuro
--    também recebam GRANTs automaticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
