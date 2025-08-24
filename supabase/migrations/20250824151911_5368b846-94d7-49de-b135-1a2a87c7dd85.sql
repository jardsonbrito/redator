-- Corrigir search_path nas funções recém criadas
DROP FUNCTION IF EXISTS public.verificar_permissao_biblioteca(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.gerar_url_download_biblioteca(uuid, text, boolean);

-- Recriar funções com search_path seguro
CREATE OR REPLACE FUNCTION public.verificar_permissao_biblioteca(
  material_id uuid,
  user_turma text DEFAULT NULL,
  is_visitante boolean DEFAULT false
) 
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  material_record record;
BEGIN
  -- Buscar material
  SELECT turmas_autorizadas, permite_visitante
  INTO material_record
  FROM public.biblioteca_materiais
  WHERE id = material_id AND status = 'publicado';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Se é visitante
  IF is_visitante THEN
    RETURN material_record.permite_visitante = true;
  END IF;
  
  -- Se é aluno, verificar se a turma está autorizada
  IF user_turma IS NOT NULL THEN
    RETURN user_turma = ANY(material_record.turmas_autorizadas);
  END IF;
  
  RETURN false;
END;
$$;

-- Função para gerar URL de download com validação
CREATE OR REPLACE FUNCTION public.gerar_url_download_biblioteca(
  material_id uuid,
  user_turma text DEFAULT NULL,
  is_visitante boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  material_record record;
  can_access boolean;
BEGIN
  -- Verificar permissão
  SELECT public.verificar_permissao_biblioteca(material_id, user_turma, is_visitante) INTO can_access;
  
  IF NOT can_access THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'permission_denied',
      'message', 'Você não tem permissão para acessar este material'
    );
  END IF;
  
  -- Buscar dados do material
  SELECT arquivo_url, arquivo_nome, titulo
  INTO material_record
  FROM public.biblioteca_materiais
  WHERE id = material_id AND status = 'publicado';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'material_not_found',
      'message', 'Material não encontrado'
    );
  END IF;
  
  -- Registrar tentativa de acesso para auditoria
  INSERT INTO public.access_logs (
    table_name,
    record_id,
    action,
    user_id,
    timestamp
  ) VALUES (
    'biblioteca_materiais',
    material_id,
    'download_requested',
    auth.uid(),
    now()
  );
  
  -- Retornar dados para download
  RETURN jsonb_build_object(
    'success', true,
    'arquivo_url', material_record.arquivo_url,
    'arquivo_nome', material_record.arquivo_nome,
    'titulo', material_record.titulo
  );
END;
$$;