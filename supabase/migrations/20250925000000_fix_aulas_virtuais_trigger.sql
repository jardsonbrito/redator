-- Fix aulas_virtuais trigger that's causing updated_at error

-- Drop existing problematic trigger
DROP TRIGGER IF EXISTS update_aulas_virtuais_updated_at ON public.aulas_virtuais;
DROP TRIGGER IF EXISTS update_aulas_virtuais_updated_at_trigger ON public.aulas_virtuais;

-- Drop old functions that might be causing issues
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_aulas_virtuais_updated_at() CASCADE;

-- Create correct function that updates atualizado_em (the actual field name)
CREATE OR REPLACE FUNCTION public.update_aulas_virtuais_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger with correct function
CREATE TRIGGER update_aulas_virtuais_atualizado_em_trigger
  BEFORE UPDATE ON public.aulas_virtuais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_aulas_virtuais_atualizado_em();

-- Create RPC function for safe updates (bypasses trigger if needed)
CREATE OR REPLACE FUNCTION public.update_aula_virtual_safe(
  p_aula_id UUID,
  p_titulo TEXT,
  p_descricao TEXT,
  p_data_aula DATE,
  p_horario_inicio TIME,
  p_horario_fim TIME,
  p_turmas_autorizadas TEXT[],
  p_imagem_capa_url TEXT,
  p_link_meet TEXT,
  p_abrir_aba_externa BOOLEAN,
  p_permite_visitante BOOLEAN,
  p_ativo BOOLEAN,
  p_eh_aula_ao_vivo BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update the record manually to avoid trigger issues
  UPDATE public.aulas_virtuais
  SET
    titulo = p_titulo,
    descricao = p_descricao,
    data_aula = p_data_aula,
    horario_inicio = p_horario_inicio,
    horario_fim = p_horario_fim,
    turmas_autorizadas = p_turmas_autorizadas,
    imagem_capa_url = p_imagem_capa_url,
    link_meet = p_link_meet,
    abrir_aba_externa = p_abrir_aba_externa,
    permite_visitante = p_permite_visitante,
    ativo = p_ativo,
    eh_aula_ao_vivo = p_eh_aula_ao_vivo,
    atualizado_em = now()
  WHERE id = p_aula_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aula não encontrada';
  END IF;
END;
$$;