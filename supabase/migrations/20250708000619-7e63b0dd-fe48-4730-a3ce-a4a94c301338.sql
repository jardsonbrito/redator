-- Criar uma função específica para o corretor salvar correções
CREATE OR REPLACE FUNCTION public.salvar_correcao_corretor(
  redacao_id uuid,
  tabela_nome text,
  eh_corretor_1 boolean,
  c1_nota integer,
  c2_nota integer,
  c3_nota integer,
  c4_nota integer,
  c5_nota integer,
  nota_final integer,
  status_correcao text,
  comentario_c1 text DEFAULT '',
  comentario_c2 text DEFAULT '',
  comentario_c3 text DEFAULT '',
  comentario_c4 text DEFAULT '',
  comentario_c5 text DEFAULT '',
  elogios_pontos text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefixo text;
  update_data jsonb;
  sql_query text;
  result boolean := false;
BEGIN
  -- Determinar qual corretor está salvando
  prefixo := CASE WHEN eh_corretor_1 THEN 'corretor_1' ELSE 'corretor_2' END;
  
  -- Preparar dados de atualização
  update_data := jsonb_build_object(
    'c1_' || prefixo, c1_nota,
    'c2_' || prefixo, c2_nota,
    'c3_' || prefixo, c3_nota,
    'c4_' || prefixo, c4_nota,
    'c5_' || prefixo, c5_nota,
    'nota_final_' || prefixo, nota_final,
    'status_' || prefixo, status_correcao,
    'comentario_c1_' || prefixo, comentario_c1,
    'comentario_c2_' || prefixo, comentario_c2,
    'comentario_c3_' || prefixo, comentario_c3,
    'comentario_c4_' || prefixo, comentario_c4,
    'comentario_c5_' || prefixo, comentario_c5,
    'elogios_pontos_atencao_' || prefixo, elogios_pontos
  );
  
  -- Adicionar data de correção se status é corrigida
  IF status_correcao = 'corrigida' THEN
    update_data := update_data || jsonb_build_object('data_correcao', now());
  END IF;
  
  -- Executar update na tabela apropriada
  IF tabela_nome = 'redacoes_enviadas' THEN
    UPDATE public.redacoes_enviadas 
    SET 
      c1_corretor_1 = CASE WHEN eh_corretor_1 THEN c1_nota ELSE c1_corretor_1 END,
      c2_corretor_1 = CASE WHEN eh_corretor_1 THEN c2_nota ELSE c2_corretor_1 END,
      c3_corretor_1 = CASE WHEN eh_corretor_1 THEN c3_nota ELSE c3_corretor_1 END,
      c4_corretor_1 = CASE WHEN eh_corretor_1 THEN c4_nota ELSE c4_corretor_1 END,
      c5_corretor_1 = CASE WHEN eh_corretor_1 THEN c5_nota ELSE c5_corretor_1 END,
      nota_final_corretor_1 = CASE WHEN eh_corretor_1 THEN nota_final ELSE nota_final_corretor_1 END,
      status_corretor_1 = CASE WHEN eh_corretor_1 THEN status_correcao ELSE status_corretor_1 END,
      comentario_c1_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c1 ELSE comentario_c1_corretor_1 END,
      comentario_c2_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c2 ELSE comentario_c2_corretor_1 END,
      comentario_c3_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c3 ELSE comentario_c3_corretor_1 END,
      comentario_c4_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c4 ELSE comentario_c4_corretor_1 END,
      comentario_c5_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c5 ELSE comentario_c5_corretor_1 END,
      elogios_pontos_atencao_corretor_1 = CASE WHEN eh_corretor_1 THEN elogios_pontos ELSE elogios_pontos_atencao_corretor_1 END,
      c1_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c1_nota ELSE c1_corretor_2 END,
      c2_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c2_nota ELSE c2_corretor_2 END,
      c3_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c3_nota ELSE c3_corretor_2 END,
      c4_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c4_nota ELSE c4_corretor_2 END,
      c5_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c5_nota ELSE c5_corretor_2 END,
      nota_final_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN nota_final ELSE nota_final_corretor_2 END,
      status_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN status_correcao ELSE status_corretor_2 END,
      comentario_c1_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c1 ELSE comentario_c1_corretor_2 END,
      comentario_c2_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c2 ELSE comentario_c2_corretor_2 END,
      comentario_c3_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c3 ELSE comentario_c3_corretor_2 END,
      comentario_c4_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c4 ELSE comentario_c4_corretor_2 END,
      comentario_c5_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c5 ELSE comentario_c5_corretor_2 END,
      elogios_pontos_atencao_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN elogios_pontos ELSE elogios_pontos_atencao_corretor_2 END,
      data_correcao = CASE WHEN status_correcao = 'corrigida' THEN now() ELSE data_correcao END
    WHERE id = redacao_id;
    
    -- Verificar se deve marcar como corrigida (trigger vai cuidar disso automaticamente)
    result := true;
    
  ELSIF tabela_nome = 'redacoes_simulado' THEN
    UPDATE public.redacoes_simulado 
    SET 
      c1_corretor_1 = CASE WHEN eh_corretor_1 THEN c1_nota ELSE c1_corretor_1 END,
      c2_corretor_1 = CASE WHEN eh_corretor_1 THEN c2_nota ELSE c2_corretor_1 END,
      c3_corretor_1 = CASE WHEN eh_corretor_1 THEN c3_nota ELSE c3_corretor_1 END,
      c4_corretor_1 = CASE WHEN eh_corretor_1 THEN c4_nota ELSE c4_corretor_1 END,
      c5_corretor_1 = CASE WHEN eh_corretor_1 THEN c5_nota ELSE c5_corretor_1 END,
      nota_final_corretor_1 = CASE WHEN eh_corretor_1 THEN nota_final ELSE nota_final_corretor_1 END,
      status_corretor_1 = CASE WHEN eh_corretor_1 THEN status_correcao ELSE status_corretor_1 END,
      comentario_c1_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c1 ELSE comentario_c1_corretor_1 END,
      comentario_c2_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c2 ELSE comentario_c2_corretor_1 END,
      comentario_c3_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c3 ELSE comentario_c3_corretor_1 END,
      comentario_c4_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c4 ELSE comentario_c4_corretor_1 END,
      comentario_c5_corretor_1 = CASE WHEN eh_corretor_1 THEN comentario_c5 ELSE comentario_c5_corretor_1 END,
      elogios_pontos_atencao_corretor_1 = CASE WHEN eh_corretor_1 THEN elogios_pontos ELSE elogios_pontos_atencao_corretor_1 END,
      c1_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c1_nota ELSE c1_corretor_2 END,
      c2_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c2_nota ELSE c2_corretor_2 END,
      c3_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c3_nota ELSE c3_corretor_2 END,
      c4_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c4_nota ELSE c4_corretor_2 END,
      c5_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN c5_nota ELSE c5_corretor_2 END,
      nota_final_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN nota_final ELSE nota_final_corretor_2 END,
      status_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN status_correcao ELSE status_corretor_2 END,
      comentario_c1_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c1 ELSE comentario_c1_corretor_2 END,
      comentario_c2_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c2 ELSE comentario_c2_corretor_2 END,
      comentario_c3_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c3 ELSE comentario_c3_corretor_2 END,
      comentario_c4_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c4 ELSE comentario_c4_corretor_2 END,
      comentario_c5_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN comentario_c5 ELSE comentario_c5_corretor_2 END,
      elogios_pontos_atencao_corretor_2 = CASE WHEN NOT eh_corretor_1 THEN elogios_pontos ELSE elogios_pontos_atencao_corretor_2 END,
      data_correcao = CASE WHEN status_correcao = 'corrigida' THEN now() ELSE data_correcao END
    WHERE id = redacao_id;
    
    result := true;
  END IF;
  
  RETURN result;
END;
$$;