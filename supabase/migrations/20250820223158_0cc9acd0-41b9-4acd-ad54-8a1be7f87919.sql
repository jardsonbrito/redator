-- Atualizar a aula de teste para estar acontecendo agora
UPDATE public.aulas_virtuais 
SET 
  horario_inicio = '22:00:00',
  horario_fim = '23:30:00',
  status_transmissao = 'em_transmissao'
WHERE id = '12345678-1234-1234-1234-123456789abc'::uuid;