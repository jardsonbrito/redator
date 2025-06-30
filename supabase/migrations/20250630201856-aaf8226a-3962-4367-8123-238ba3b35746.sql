
-- Adicionar campos necessários na tabela redacoes_enviadas
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN IF NOT EXISTS tipo_envio TEXT DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS turma TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aguardando';

-- Criar índice no campo email para consulta rápida
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_email ON public.redacoes_enviadas(email_aluno);

-- Criar índice no campo turma para filtragem
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_turma ON public.redacoes_enviadas(turma);

-- Atualizar registros existentes para ter status correto
UPDATE public.redacoes_enviadas 
SET status = CASE 
  WHEN corrigida = true THEN 'corrigido'
  ELSE 'aguardando'
END
WHERE status IS NULL OR status = 'aguardando';

-- Criar enum para tipos de envio (opcional, para validação)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_envio_enum') THEN
        CREATE TYPE tipo_envio_enum AS ENUM ('regular', 'exercicio', 'simulado', 'visitante');
    END IF;
END
$$;

-- Função para buscar redações por turma e email
CREATE OR REPLACE FUNCTION public.get_redacoes_by_turma_and_email(
  p_turma TEXT,
  p_email TEXT
)
RETURNS TABLE (
  id UUID,
  frase_tematica TEXT,
  nome_aluno TEXT,
  email_aluno TEXT,
  tipo_envio TEXT,
  data_envio TIMESTAMP WITH TIME ZONE,
  status TEXT,
  corrigida BOOLEAN,
  nota_total INTEGER,
  comentario_admin TEXT,
  data_correcao TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    r.id,
    r.frase_tematica,
    r.nome_aluno,
    r.email_aluno,
    COALESCE(r.tipo_envio, 'regular') as tipo_envio,
    r.data_envio,
    COALESCE(r.status, CASE WHEN r.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    r.corrigida,
    r.nota_total,
    r.comentario_admin,
    r.data_correcao
  FROM public.redacoes_enviadas r
  WHERE r.turma = p_turma 
  AND r.email_aluno = p_email
  ORDER BY r.data_envio DESC;
$$;

-- Função para buscar redações por turma (para listagem geral)
CREATE OR REPLACE FUNCTION public.get_redacoes_by_turma(p_turma TEXT)
RETURNS TABLE (
  id UUID,
  frase_tematica TEXT,
  nome_aluno TEXT,
  tipo_envio TEXT,
  data_envio TIMESTAMP WITH TIME ZONE,
  status TEXT,
  corrigida BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    r.id,
    r.frase_tematica,
    r.nome_aluno,
    COALESCE(r.tipo_envio, 'regular') as tipo_envio,
    r.data_envio,
    COALESCE(r.status, CASE WHEN r.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    r.corrigida
  FROM public.redacoes_enviadas r
  WHERE r.turma = p_turma 
  AND COALESCE(r.tipo_envio, 'regular') != 'visitante'
  ORDER BY r.data_envio DESC;
$$;
