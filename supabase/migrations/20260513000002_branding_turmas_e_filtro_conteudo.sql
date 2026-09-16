-- Branding por turma
ALTER TABLE public.turmas_alunos
  ADD COLUMN IF NOT EXISTS logo_url       TEXT,
  ADD COLUMN IF NOT EXISTS cor_primaria   TEXT,
  ADD COLUMN IF NOT EXISTS cor_secundaria TEXT,
  ADD COLUMN IF NOT EXISTS cor_destaque   TEXT;

-- Filtro de conteúdo por turma (turmas_permitidas = null → disponível para todas)
ALTER TABLE public.temas
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.micro_itens
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

COMMENT ON COLUMN public.turmas_alunos.logo_url       IS 'URL do logotipo da turma (opcional — null usa padrão do App do Redator)';
COMMENT ON COLUMN public.turmas_alunos.cor_primaria   IS 'Cor principal em hex (ex: #3F0077). null = tema padrão';
COMMENT ON COLUMN public.turmas_alunos.cor_secundaria IS 'Cor secundária em hex';
COMMENT ON COLUMN public.turmas_alunos.cor_destaque   IS 'Cor de destaque / botões em hex';
COMMENT ON COLUMN public.temas.turmas_permitidas       IS 'Turmas que podem ver este tema. null = todas';
COMMENT ON COLUMN public.micro_itens.turmas_permitidas IS 'Turmas que podem ver este item. null = todas';
