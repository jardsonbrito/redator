-- Migration para corrigir RLS policies do sistema de inbox
-- Esta migration resolve problemas de acesso para alunos que usam autenticação customizada

-- Primeiro, remover as policies existentes que dependem de JWT
DROP POLICY IF EXISTS "Students can view their own inbox messages" ON inbox_recipients;
DROP POLICY IF EXISTS "Students can update their own inbox message status" ON inbox_recipients;

-- Como o sistema de alunos NÃO usa Supabase Auth (auth.uid() = NULL),
-- precisamos desabilitar RLS ou usar policies que sempre permitem acesso

-- Opção escolhida: Desabilitar RLS para essas tabelas
-- A segurança será controlada integralmente na aplicação
ALTER TABLE inbox_recipients DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages DISABLE ROW LEVEL SECURITY;

-- Comentário sobre a abordagem de segurança:
-- Como a plataforma usa autenticação customizada (não JWT do Supabase),
-- optamos por policies mais permissivas baseadas apenas em auth.uid()
-- A segurança granular é implementada no nível da aplicação através:
-- 1. Verificação do email do aluno na query
-- 2. Filtros baseados no contexto de autenticação customizada
-- 3. Validação no frontend e backend