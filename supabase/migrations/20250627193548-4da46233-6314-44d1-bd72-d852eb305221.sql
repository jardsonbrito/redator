
-- Remove todas as tabelas desnecessárias para o App do Redator
-- Mantendo apenas: temas, redacoes, videos, profiles

-- Remove tabelas relacionadas a atividades
DROP TABLE IF EXISTS atividades_corretores CASCADE;
DROP TABLE IF EXISTS atividades_turmas CASCADE;
DROP TABLE IF EXISTS atividades CASCADE;

-- Remove tabelas relacionadas a turmas e corretores
DROP TABLE IF EXISTS corretores_turmas CASCADE;
DROP TABLE IF EXISTS turmas CASCADE;

-- Remove tabelas relacionadas a fórum
DROP TABLE IF EXISTS forum_comentarios CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;

-- Remove tabelas relacionadas a marcações e correções
DROP TABLE IF EXISTS marcacoes CASCADE;

-- Remove tabelas administrativas não necessárias
DROP TABLE IF EXISTS avisos CASCADE;
DROP TABLE IF EXISTS configuracoes CASCADE;
DROP TABLE IF EXISTS credit_audit CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;

-- Remove tabela de usuários simples (vamos usar apenas profiles)
DROP TABLE IF EXISTS usuarios_simples CASCADE;

-- Remove tipos enum que não serão mais necessários
DROP TYPE IF EXISTS atividade_status CASCADE;
DROP TYPE IF EXISTS redacao_status CASCADE;
DROP TYPE IF EXISTS competencia CASCADE;
DROP TYPE IF EXISTS user_type CASCADE;
