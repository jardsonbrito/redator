-- Tabela principal da Lousa
CREATE TABLE IF NOT EXISTS public.lousa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  enunciado text NOT NULL,
  inicio_em timestamptz,
  fim_em timestamptz,
  capa_url text,
  turmas text[] NOT NULL DEFAULT '{}',
  permite_visitante boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de respostas dos alunos
CREATE TABLE IF NOT EXISTS public.lousa_resposta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lousa_id uuid NOT NULL REFERENCES public.lousa(id) ON DELETE CASCADE,
  aluno_id uuid,
  email_aluno text NOT NULL,
  nome_aluno text NOT NULL,
  turma text,
  conteudo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  nota numeric(5,2),
  comentario_professor text,
  submitted_at timestamptz,
  corrected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lousa_id, email_aluno)
);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_lousa_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lousa_updated_at
  BEFORE UPDATE ON public.lousa
  FOR EACH ROW EXECUTE FUNCTION public.update_lousa_updated_at();

CREATE TRIGGER update_lousa_resposta_updated_at
  BEFORE UPDATE ON public.lousa_resposta
  FOR EACH ROW EXECUTE FUNCTION public.update_lousa_updated_at();

-- Trigger para integração com Radar
CREATE OR REPLACE FUNCTION public.fn_lousa_push_radar()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'graded' AND COALESCE(OLD.status,'') <> 'graded' THEN
    INSERT INTO public.radar_dados (
      nome_aluno, 
      email_aluno, 
      turma, 
      titulo_exercicio, 
      nota, 
      data_realizacao,
      exercicio_id,
      created_at,
      updated_at
    )
    VALUES (
      NEW.nome_aluno,
      NEW.email_aluno, 
      NEW.turma, 
      (SELECT 'Lousa: ' || titulo FROM public.lousa WHERE id = NEW.lousa_id),
      COALESCE(NEW.nota, 0),
      CURRENT_DATE,
      NEW.lousa_id,
      now(),
      now()
    )
    ON CONFLICT (email_aluno, titulo_exercicio, data_realizacao)
    DO UPDATE SET 
      nota = EXCLUDED.nota,
      updated_at = EXCLUDED.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lousa_push_radar
  AFTER UPDATE ON public.lousa_resposta
  FOR EACH ROW EXECUTE FUNCTION public.fn_lousa_push_radar();

-- RLS Policies
ALTER TABLE public.lousa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lousa_resposta ENABLE ROW LEVEL SECURITY;

-- Políticas para lousa
CREATE POLICY "Admin pode gerenciar lousas" ON public.lousa
  FOR ALL USING (is_main_admin())
  WITH CHECK (is_main_admin());

CREATE POLICY "Professores podem gerenciar suas lousas" ON public.lousa
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professores p 
      WHERE p.email = auth.email() AND p.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professores p 
      WHERE p.email = auth.email() AND p.ativo = true
    )
  );

CREATE POLICY "Público pode ver lousas ativas" ON public.lousa
  FOR SELECT USING (ativo = true AND status = 'active');

-- Políticas para respostas
CREATE POLICY "Admin pode gerenciar respostas" ON public.lousa_resposta
  FOR ALL USING (is_main_admin())
  WITH CHECK (is_main_admin());

CREATE POLICY "Professores podem ver respostas de suas lousas" ON public.lousa_resposta
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lousa l
      JOIN public.professores p ON p.email = auth.email()
      WHERE l.id = lousa_resposta.lousa_id AND p.ativo = true
    )
  );

CREATE POLICY "Professores podem corrigir respostas" ON public.lousa_resposta
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lousa l
      JOIN public.professores p ON p.email = auth.email()
      WHERE l.id = lousa_resposta.lousa_id AND p.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lousa l
      JOIN public.professores p ON p.email = auth.email()
      WHERE l.id = lousa_resposta.lousa_id AND p.ativo = true
    )
  );

CREATE POLICY "Alunos podem inserir suas respostas" ON public.lousa_resposta
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Alunos podem ver suas respostas" ON public.lousa_resposta
  FOR SELECT USING (true);

CREATE POLICY "Alunos podem atualizar suas respostas" ON public.lousa_resposta
  FOR UPDATE USING (true)
  WITH CHECK (true);