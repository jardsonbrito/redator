
-- Criar tabela para controlar histórico de importações CSV
CREATE TABLE public.importacao_csv (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id),
  nome_arquivo TEXT NOT NULL,
  total_registros INTEGER NOT NULL,
  registros_importados INTEGER NOT NULL,
  registros_rejeitados INTEGER NOT NULL,
  detalhes_erros JSONB,
  data_importacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.importacao_csv ENABLE ROW LEVEL SECURITY;

-- Política para permitir que apenas admins vejam e gerenciem importações
CREATE POLICY "Apenas admin pode gerenciar importações"
  ON public.importacao_csv
  FOR ALL
  USING (is_main_admin())
  WITH CHECK (is_main_admin());
