-- Script para criar dados de teste para o sistema de Inbox
-- Execute este script caso as tabelas estejam vazias

-- Criar alguns alunos de teste (apenas se não existirem)
-- Usar a estrutura correta da tabela profiles

INSERT INTO profiles (id, email, nome, user_type, ativo, turma, turma_codigo, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'aluno1@teste.com', 'João Silva', 'aluno', true, 'Turma A - 2024', 'TRA2024', NOW(), NOW()),
  (gen_random_uuid(), 'aluno2@teste.com', 'Maria Santos', 'aluno', true, 'Turma A - 2024', 'TRA2024', NOW(), NOW()),
  (gen_random_uuid(), 'aluno3@teste.com', 'Pedro Oliveira', 'aluno', true, 'Turma B - 2024', 'TRB2024', NOW(), NOW()),
  (gen_random_uuid(), 'aluno4@teste.com', 'Ana Costa', 'aluno', true, 'Turma B - 2024', 'TRB2024', NOW(), NOW()),
  (gen_random_uuid(), 'aluno5@teste.com', 'Carlos Lima', 'aluno', true, 'Turma C - 2024', 'TRC2024', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Verificar dados criados
SELECT 'Alunos criados para teste do inbox:' as info;
SELECT email, nome, turma, turma_codigo
FROM profiles
WHERE user_type = 'aluno' AND email LIKE '%@teste.com'
ORDER BY turma, nome;