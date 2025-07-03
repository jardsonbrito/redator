-- Inserir aula virtual de teste para visitantes (horário atual + 1 hora)
INSERT INTO public.aulas_virtuais (
  titulo, 
  descricao, 
  data_aula, 
  horario_inicio, 
  horario_fim, 
  turmas_autorizadas, 
  link_meet, 
  permite_visitante, 
  ativo
) VALUES (
  'Aula Teste para Visitantes',
  'Aula de demonstração para visitantes testarem o sistema',
  CURRENT_DATE,
  (CURRENT_TIME + INTERVAL '5 minutes')::time,
  (CURRENT_TIME + INTERVAL '2 hours')::time,
  '{"Turma A"}',
  'https://meet.google.com/test-visitantes',
  true,
  true
) ON CONFLICT DO NOTHING;