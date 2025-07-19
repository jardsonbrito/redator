-- Criar função para marcar redação como "em_correcao" quando corretor inicia correção
CREATE OR REPLACE FUNCTION public.iniciar_correcao_redacao(
  redacao_id uuid,
  tabela_nome text,
  corretor_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  corretor_info record;
  eh_corretor_1 boolean;
  eh_corretor_2 boolean;
BEGIN
  -- Buscar informações do corretor
  SELECT id, ativo INTO corretor_info 
  FROM public.corretores 
  WHERE email = corretor_email AND ativo = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Corretor não encontrado ou inativo';
  END IF;
  
  -- Atualizar status baseado na tabela
  IF tabela_nome = 'redacoes_enviadas' THEN
    -- Verificar se é corretor 1 ou 2
    SELECT 
      (corretor_id_1 = corretor_info.id) as eh_corretor_1,
      (corretor_id_2 = corretor_info.id) as eh_corretor_2
    INTO eh_corretor_1, eh_corretor_2
    FROM public.redacoes_enviadas 
    WHERE id = redacao_id;
    
    IF eh_corretor_1 THEN
      UPDATE public.redacoes_enviadas 
      SET 
        status_corretor_1 = 'em_correcao',
        status = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_1 = 'pendente';
    ELSIF eh_corretor_2 THEN
      UPDATE public.redacoes_enviadas 
      SET 
        status_corretor_2 = 'em_correcao',
        status = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_2 = 'pendente';
    END IF;
    
  ELSIF tabela_nome = 'redacoes_simulado' THEN
    -- Verificar se é corretor 1 ou 2
    SELECT 
      (corretor_id_1 = corretor_info.id) as eh_corretor_1,
      (corretor_id_2 = corretor_info.id) as eh_corretor_2
    INTO eh_corretor_1, eh_corretor_2
    FROM public.redacoes_simulado 
    WHERE id = redacao_id;
    
    IF eh_corretor_1 THEN
      UPDATE public.redacoes_simulado 
      SET status_corretor_1 = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_1 = 'pendente';
    ELSIF eh_corretor_2 THEN
      UPDATE public.redacoes_simulado 
      SET status_corretor_2 = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_2 = 'pendente';
    END IF;
    
  ELSIF tabela_nome = 'redacoes_exercicio' THEN
    -- Verificar se é corretor 1 ou 2
    SELECT 
      (corretor_id_1 = corretor_info.id) as eh_corretor_1,
      (corretor_id_2 = corretor_info.id) as eh_corretor_2
    INTO eh_corretor_1, eh_corretor_2
    FROM public.redacoes_exercicio 
    WHERE id = redacao_id;
    
    IF eh_corretor_1 THEN
      UPDATE public.redacoes_exercicio 
      SET status_corretor_1 = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_1 = 'pendente';
    ELSIF eh_corretor_2 THEN
      UPDATE public.redacoes_exercicio 
      SET status_corretor_2 = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_2 = 'pendente';
    END IF;
  END IF;
  
  RETURN true;
END;
$function$;