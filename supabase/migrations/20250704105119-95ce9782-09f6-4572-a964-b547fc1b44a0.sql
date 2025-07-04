
-- Criar tabela de corretores
CREATE TABLE public.corretores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo text NOT NULL,
  email text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

-- Adicionar campos de corretor nas tabelas de redações existentes
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN corretor_id_1 uuid REFERENCES public.corretores(id),
ADD COLUMN corretor_id_2 uuid REFERENCES public.corretores(id);

ALTER TABLE public.redacoes_simulado 
ADD COLUMN corretor_id_1 uuid REFERENCES public.corretores(id),
ADD COLUMN corretor_id_2 uuid REFERENCES public.corretores(id);

ALTER TABLE public.redacoes_exercicio 
ADD COLUMN corretor_id_1 uuid REFERENCES public.corretores(id),
ADD COLUMN corretor_id_2 uuid REFERENCES public.corretores(id);

-- Habilitar RLS na tabela de corretores
ALTER TABLE public.corretores ENABLE ROW LEVEL SECURITY;

-- Política para admin gerenciar corretores
CREATE POLICY "Admin can manage corretores" 
  ON public.corretores 
  FOR ALL 
  USING (is_main_admin())
  WITH CHECK (is_main_admin());

-- Política para visualização pública dos corretores (para listagem no formulário)
CREATE POLICY "Public can view active corretores" 
  ON public.corretores 
  FOR SELECT 
  USING (ativo = true);

-- Função para verificar se um usuário é corretor
CREATE OR REPLACE FUNCTION public.is_corretor(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.corretores 
    WHERE email = user_email AND ativo = true
  );
$$;

-- Função para obter redações atribuídas a um corretor
CREATE OR REPLACE FUNCTION public.get_redacoes_corretor(corretor_email text)
RETURNS TABLE(
  id uuid,
  tipo_redacao text,
  nome_aluno text,
  email_aluno text,
  frase_tematica text,
  data_envio timestamp with time zone,
  corrigida boolean,
  texto text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Redações enviadas regulares
  SELECT 
    r.id,
    'regular' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    r.frase_tematica,
    r.data_envio,
    r.corrigida,
    r.redacao_texto as texto
  FROM public.redacoes_enviadas r
  JOIN public.corretores c1 ON r.corretor_id_1 = c1.id OR r.corretor_id_2 = c1.id
  WHERE c1.email = corretor_email AND c1.ativo = true
  
  UNION ALL
  
  -- Redações de simulado
  SELECT 
    r.id,
    'simulado' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    s.frase_tematica,
    r.data_envio,
    r.corrigida,
    r.texto
  FROM public.redacoes_simulado r
  JOIN public.simulados s ON r.id_simulado = s.id
  JOIN public.corretores c2 ON r.corretor_id_1 = c2.id OR r.corretor_id_2 = c2.id
  WHERE c2.email = corretor_email AND c2.ativo = true
  
  UNION ALL
  
  -- Redações de exercício
  SELECT 
    r.id,
    'exercicio' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    e.titulo as frase_tematica,
    r.data_envio,
    r.corrigida,
    r.redacao_texto as texto
  FROM public.redacoes_exercicio r
  JOIN public.exercicios e ON r.exercicio_id = e.id
  JOIN public.corretores c3 ON r.corretor_id_1 = c3.id OR r.corretor_id_2 = c3.id
  WHERE c3.email = corretor_email AND c3.ativo = true
  
  ORDER BY data_envio DESC;
$$;

-- Atualizar trigger para atualização automática do timestamp
CREATE OR REPLACE FUNCTION public.update_corretores_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_corretores_updated_at
  BEFORE UPDATE ON public.corretores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_corretores_updated_at();
