-- Corrige contar_mensagens_nao_lidas_corretor para usar a mesma lógica
-- da página de Recados: conta conversas onde a ÚLTIMA mensagem é do aluno
-- (conversa ainda não respondida), em vez de contar mensagens com lida=false.
-- Isso garante que o badge no dashboard some APENAS quando o corretor responder,
-- não quando ele simplesmente abrir e ler a mensagem.
CREATE OR REPLACE FUNCTION public.contar_mensagens_nao_lidas_corretor(corretor_email text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COUNT(*)::integer
  FROM (
    SELECT DISTINCT ON (m.aluno_id, m.corretor_id)
      m.autor
    FROM public.ajuda_rapida_mensagens m
    JOIN public.corretores c ON m.corretor_id = c.id
    WHERE c.email = corretor_email
      AND c.ativo = true
    ORDER BY m.aluno_id, m.corretor_id, m.criado_em DESC
  ) ultimas_msgs
  WHERE ultimas_msgs.autor = 'aluno';
$function$;
