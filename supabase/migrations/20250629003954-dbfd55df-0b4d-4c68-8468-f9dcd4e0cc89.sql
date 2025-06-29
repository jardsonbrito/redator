
-- Criar tabela para redações enviadas pelos usuários
CREATE TABLE public.redacoes_enviadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frase_tematica TEXT NOT NULL,
  redacao_texto TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nota_c1 INTEGER DEFAULT NULL CHECK (nota_c1 >= 0 AND nota_c1 <= 200),
  nota_c2 INTEGER DEFAULT NULL CHECK (nota_c2 >= 0 AND nota_c2 <= 200),
  nota_c3 INTEGER DEFAULT NULL CHECK (nota_c3 >= 0 AND nota_c3 <= 200),
  nota_c4 INTEGER DEFAULT NULL CHECK (nota_c4 >= 0 AND nota_c4 <= 200),
  nota_c5 INTEGER DEFAULT NULL CHECK (nota_c5 >= 0 AND nota_c5 <= 200),
  nota_total INTEGER DEFAULT NULL CHECK (nota_total >= 0 AND nota_total <= 1000),
  comentario_admin TEXT DEFAULT NULL,
  corrigida BOOLEAN DEFAULT FALSE,
  data_correcao TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Habilitar RLS para segurança
ALTER TABLE public.redacoes_enviadas ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer pessoa veja redações públicas
CREATE POLICY "Permitir visualização pública de redações enviadas" 
  ON public.redacoes_enviadas 
  FOR SELECT 
  USING (true);

-- Política para permitir que qualquer pessoa insira redações (sem login)
CREATE POLICY "Permitir inserção pública de redações" 
  ON public.redacoes_enviadas 
  FOR INSERT 
  WITH CHECK (true);

-- Política para permitir que apenas admins atualizem (correções)
CREATE POLICY "Apenas admins podem corrigir redações" 
  ON public.redacoes_enviadas 
  FOR UPDATE 
  USING (public.is_admin());

-- Índice para melhorar performance de consultas por data
CREATE INDEX idx_redacoes_enviadas_data_envio ON public.redacoes_enviadas(data_envio DESC);

-- Índice para consultas de redações corrigidas
CREATE INDEX idx_redacoes_enviadas_corrigida ON public.redacoes_enviadas(corrigida);
