-- Adicionar colunas para usar aluno_id e entrada/saída separadas
ALTER TABLE public.presenca_aulas 
ADD COLUMN IF NOT EXISTS aluno_id uuid,
ADD COLUMN IF NOT EXISTS entrada_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS saida_at timestamp with time zone;

-- Criar índice único para evitar duplicatas por aluno e aula
CREATE UNIQUE INDEX IF NOT EXISTS uniq_presenca_aula_aluno 
ON public.presenca_aulas (aula_id, aluno_id);

-- Opcional: migrar dados existentes baseados em email para aluno_id (para compatibilidade)
-- Isso pode ser feito posteriormente conforme necessário

-- Atualizar políticas RLS para funcionar com aluno_id também
DROP POLICY IF EXISTS "Students can insert own attendance" ON public.presenca_aulas;
DROP POLICY IF EXISTS "Students can view own attendance" ON public.presenca_aulas;

CREATE POLICY "Students can insert own attendance" ON public.presenca_aulas
FOR INSERT WITH CHECK (
  (email_aluno = auth.email()) OR 
  (aluno_id = auth.uid()) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.email = presenca_aulas.email_aluno AND profiles.user_type = 'aluno')) OR 
  (auth.uid() IS NULL)
);

CREATE POLICY "Students can view own attendance" ON public.presenca_aulas
FOR SELECT USING (
  (email_aluno = auth.email()) OR 
  (aluno_id = auth.uid()) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.email = presenca_aulas.email_aluno AND profiles.user_type = 'aluno'))
);

CREATE POLICY "Students can update own attendance" ON public.presenca_aulas
FOR UPDATE USING (
  (email_aluno = auth.email()) OR 
  (aluno_id = auth.uid()) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.email = presenca_aulas.email_aluno AND profiles.user_type = 'aluno'))
);