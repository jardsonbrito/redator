-- Inserir uma aula de teste para hoje para testar a funcionalidade
INSERT INTO public.aulas_virtuais (
  id,
  titulo,
  descricao,
  data_aula,
  horario_inicio,
  horario_fim,
  link_meet,
  turmas_autorizadas,
  permite_visitante,
  eh_aula_ao_vivo,
  ativo,
  status_transmissao
) VALUES (
  '12345678-1234-1234-1234-123456789abc'::uuid,
  'Aula de Teste - Funcionalidade de Presença',
  'Aula criada para testar o sistema de presença',
  CURRENT_DATE,
  '19:00:00',
  '20:30:00',
  'https://meet.google.com/test-presenca',
  ARRAY['Turma A', 'Turma B', 'Turma C'],
  true,
  true,
  true,
  'em_transmissao'
)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  data_aula = EXCLUDED.data_aula,
  status_transmissao = EXCLUDED.status_transmissao;