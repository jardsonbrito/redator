-- Criar função para verificar permissões de biblioteca
CREATE OR REPLACE FUNCTION public.verificar_permissao_biblioteca(
  material_id uuid,
  user_turma text DEFAULT NULL,
  is_visitante boolean DEFAULT false
) 
RETURNS boolean
LANGUAGE plpgsql
STABLE
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

-- Criar função para gerar URL assinada de download
CREATE OR REPLACE FUNCTION public.gerar_url_download_biblioteca(
  material_id uuid,
  user_turma text DEFAULT NULL,
  is_visitante boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  material_record record;
  can_access boolean;
  signed_url text;
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
  SELECT arquivo_url, arquivo_nome
  INTO material_record
  FROM public.biblioteca_materiais
  WHERE id = material_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'material_not_found',
      'message', 'Material não encontrado'
    );
  END IF;
  
  -- Para bucket público, retornar URL pública
  -- Em produção, consideraria usar signed URLs com expiração
  RETURN jsonb_build_object(
    'success', true,
    'arquivo_url', material_record.arquivo_url,
    'arquivo_nome', material_record.arquivo_nome
  );
END;
$$;