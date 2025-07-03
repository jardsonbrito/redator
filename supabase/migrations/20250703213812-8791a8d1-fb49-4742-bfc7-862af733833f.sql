-- CORREÇÃO 1: Remover políticas redundantes e conflitantes

-- Limpar políticas duplicadas e problemáticas na tabela aulas_virtuais
DROP POLICY IF EXISTS "Public can view active aulas" ON aulas_virtuais;
DROP POLICY IF EXISTS "Público pode ver aulas ativas" ON aulas_virtuais;

-- Recriar com política única e correta
CREATE POLICY "Public can view active aulas_virtuais" 
ON aulas_virtuais 
FOR SELECT 
TO public
USING (ativo = true);

-- CORREÇÃO 2: Padronizar políticas de presença que estão conflitantes
DROP POLICY IF EXISTS "Acesso público limitado para presença" ON presenca_aulas;
DROP POLICY IF EXISTS "Alunos podem ver própria presença" ON presenca_aulas;
DROP POLICY IF EXISTS "Qualquer um pode registrar presença" ON presenca_aulas;
DROP POLICY IF EXISTS "Visitantes podem registrar presença" ON presenca_aulas;

-- Recriar políticas simplificadas para presença
CREATE POLICY "Public can view presenca" 
ON presenca_aulas 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Public can insert presenca" 
ON presenca_aulas 
FOR INSERT 
TO public
WITH CHECK (true);