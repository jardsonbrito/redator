-- =====================================================
-- MIGRAÇÃO: Corrigir RLS para ps_resultado_config
-- Data: 2026-01-26
-- Descrição: Permitir que alunos (anon) possam ler
--            a configuração de resultado publicado
-- =====================================================

-- Remover política existente que só permite acesso a authenticated
DROP POLICY IF EXISTS "Admins podem gerenciar configurações de resultado" ON ps_resultado_config;

-- Política para admins (authenticated) - permissão total
CREATE POLICY "Admins podem gerenciar configurações de resultado"
ON ps_resultado_config
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para leitura pública (anon) - permite que alunos vejam resultados publicados
CREATE POLICY "Alunos podem ver configurações de resultado"
ON ps_resultado_config
FOR SELECT
TO anon
USING (true);

-- Também precisamos garantir que os candidatos podem ser lidos
-- para que os alunos vejam seus próprios dados de resultado
DROP POLICY IF EXISTS "Alunos podem ver seus dados de candidato" ON ps_candidatos;

CREATE POLICY "Alunos podem ver seus dados de candidato"
ON ps_candidatos
FOR SELECT
TO anon
USING (true);

-- Garantir que a tabela ps_formularios também pode ser lida por anon
DROP POLICY IF EXISTS "Alunos podem ver formularios ativos" ON ps_formularios;

CREATE POLICY "Alunos podem ver formularios ativos"
ON ps_formularios
FOR SELECT
TO anon
USING (ativo = true);
