
-- Habilitar RLS na tabela redacoes_exercicio
ALTER TABLE public.redacoes_exercicio ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para a tabela redacoes_exercicio

-- Política para permitir que qualquer pessoa insira redações de exercício
CREATE POLICY "Anyone can insert redacoes_exercicio" 
ON public.redacoes_exercicio 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir que qualquer pessoa visualize redações de exercício
CREATE POLICY "Anyone can view redacoes_exercicio" 
ON public.redacoes_exercicio 
FOR SELECT 
USING (true);

-- Política para permitir que apenas o admin principal gerencie todas as redações
CREATE POLICY "Main admin can manage all redacoes_exercicio" 
ON public.redacoes_exercicio 
FOR ALL 
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_redacoes_exercicio_exercicio_id ON public.redacoes_exercicio(exercicio_id);
CREATE INDEX IF NOT EXISTS idx_redacoes_exercicio_corrigida ON public.redacoes_exercicio(corrigida);
CREATE INDEX IF NOT EXISTS idx_redacoes_exercicio_data_envio ON public.redacoes_exercicio(data_envio DESC);
