-- ============================================================
-- MÓDULO: MICROAPRENDIZAGEM
-- Migration: 20260405000000
-- ============================================================

-- ----------------------------------------------------------
-- 1. TÓPICOS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.micro_topicos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo      text        NOT NULL,
  descricao   text,
  ordem       int         NOT NULL DEFAULT 0,
  ativo       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_micro_topicos_ordem
  ON public.micro_topicos (ordem);

-- ----------------------------------------------------------
-- 2. ITENS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.micro_itens (
  id                    uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  topico_id             uuid    NOT NULL
                          REFERENCES public.micro_topicos(id) ON DELETE CASCADE,
  titulo                text    NOT NULL,
  descricao_curta       text,
  tipo                  text    NOT NULL
                          CHECK (tipo IN (
                            'video','audio','podcast','microtexto',
                            'infografico','card','quiz','flashcard'
                          )),
  status                text    NOT NULL DEFAULT 'inativo'
                          CHECK (status IN ('ativo','inativo')),
  ordem                 int     NOT NULL DEFAULT 0,
  planos_permitidos     text[]  NOT NULL DEFAULT '{}',
  conteudo_url          text,           -- YouTube / Podcast URL
  conteudo_storage_path text,           -- path no bucket (áudio/PDF/infográfico)
  conteudo_texto        text,           -- tipo "card" (post-it)
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_micro_itens_topico_status
  ON public.micro_itens (topico_id, status, ordem);

CREATE INDEX IF NOT EXISTS idx_micro_itens_planos
  ON public.micro_itens USING GIN (planos_permitidos);

-- ----------------------------------------------------------
-- 3. QUIZ — QUESTÕES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.micro_quiz_questoes (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id        uuid NOT NULL
                   REFERENCES public.micro_itens(id) ON DELETE CASCADE,
  enunciado      text NOT NULL,
  ordem          int  NOT NULL DEFAULT 0,
  tentativas_max int  NOT NULL DEFAULT 3
);

CREATE INDEX IF NOT EXISTS idx_micro_quiz_questoes_item
  ON public.micro_quiz_questoes (item_id, ordem);

-- ----------------------------------------------------------
-- 4. QUIZ — ALTERNATIVAS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.micro_quiz_alternativas (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  questao_id    uuid    NOT NULL
                  REFERENCES public.micro_quiz_questoes(id) ON DELETE CASCADE,
  texto         text    NOT NULL,
  correta       boolean NOT NULL DEFAULT false,
  justificativa text,
  ordem         int     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_micro_quiz_alt_questao
  ON public.micro_quiz_alternativas (questao_id, ordem);

-- ----------------------------------------------------------
-- 5. PROGRESSO DO ALUNO
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.micro_progresso (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  email_aluno  text    NOT NULL,
  item_id      uuid    NOT NULL
                 REFERENCES public.micro_itens(id) ON DELETE CASCADE,
  status       text    NOT NULL DEFAULT 'nao_iniciado'
                 CHECK (status IN ('nao_iniciado','em_andamento','concluido')),
  iniciado_em  timestamptz,
  concluido_em timestamptz,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (email_aluno, item_id)
);

CREATE INDEX IF NOT EXISTS idx_micro_progresso_email
  ON public.micro_progresso (email_aluno);

CREATE INDEX IF NOT EXISTS idx_micro_progresso_item
  ON public.micro_progresso (item_id);

-- ----------------------------------------------------------
-- 6. TENTATIVAS DE QUIZ
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.micro_quiz_tentativas (
  id                      uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  email_aluno             text    NOT NULL,
  questao_id              uuid    NOT NULL
                            REFERENCES public.micro_quiz_questoes(id) ON DELETE CASCADE,
  alternativas_escolhidas uuid[]  NOT NULL DEFAULT '{}',
  acertou                 boolean NOT NULL,
  tentativa_numero        int     NOT NULL,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_micro_quiz_tent_email
  ON public.micro_quiz_tentativas (email_aluno, questao_id);

-- ----------------------------------------------------------
-- 7. ANALYTICS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.micro_analytics (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email_aluno text NOT NULL,
  item_id     uuid NOT NULL
                REFERENCES public.micro_itens(id) ON DELETE CASCADE,
  evento      text NOT NULL
                CHECK (evento IN (
                  'acesso','em_andamento','conclusao','abandono',
                  'quiz_acerto','quiz_erro'
                )),
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_micro_analytics_item
  ON public.micro_analytics (item_id, evento);

CREATE INDEX IF NOT EXISTS idx_micro_analytics_email
  ON public.micro_analytics (email_aluno, created_at DESC);

-- ----------------------------------------------------------
-- 8. VIEW — RESUMO ANALYTICS (ADMIN)
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW public.micro_analytics_resumo AS
SELECT
  mi.id,
  mi.topico_id,
  mt.titulo AS topico_titulo,
  mi.titulo,
  mi.tipo,
  mi.planos_permitidos,
  COUNT(DISTINCT ma.email_aluno)
    FILTER (WHERE ma.evento = 'acesso')             AS total_acessos,
  COUNT(DISTINCT mp.email_aluno)
    FILTER (WHERE mp.status = 'concluido')          AS total_concluidos,
  COUNT(DISTINCT mp.email_aluno)
    FILTER (WHERE mp.status = 'em_andamento')       AS total_em_andamento,
  ROUND(
    COUNT(DISTINCT mp.email_aluno)
      FILTER (WHERE mp.status = 'concluido')::numeric
    / NULLIF(COUNT(DISTINCT ma.email_aluno)
      FILTER (WHERE ma.evento = 'acesso'), 0) * 100,
    1
  )                                                 AS taxa_conclusao_pct,
  -- quiz: acertos vs erros
  COUNT(*)
    FILTER (WHERE ma.evento = 'quiz_acerto')        AS total_quiz_acertos,
  COUNT(*)
    FILTER (WHERE ma.evento = 'quiz_erro')          AS total_quiz_erros
FROM public.micro_itens mi
JOIN public.micro_topicos mt ON mt.id = mi.topico_id
LEFT JOIN public.micro_progresso mp ON mp.item_id = mi.id
LEFT JOIN public.micro_analytics ma ON ma.item_id = mi.id
GROUP BY mi.id, mi.topico_id, mt.titulo, mi.titulo, mi.tipo, mi.planos_permitidos;

-- ----------------------------------------------------------
-- 9. RLS
-- ----------------------------------------------------------
ALTER TABLE public.micro_topicos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_itens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_quiz_questoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_quiz_alternativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_progresso        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_quiz_tentativas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_analytics        ENABLE ROW LEVEL SECURITY;

-- Tópicos: leitura pública para autenticados
CREATE POLICY "micro_topicos_select"
  ON public.micro_topicos FOR SELECT
  USING (true);

-- Itens: leitura pública (filtro de plano feito na query do frontend)
CREATE POLICY "micro_itens_select"
  ON public.micro_itens FOR SELECT
  USING (true);

-- Questões: leitura pública
CREATE POLICY "micro_quiz_questoes_select"
  ON public.micro_quiz_questoes FOR SELECT
  USING (true);

-- Alternativas: leitura pública
CREATE POLICY "micro_quiz_alternativas_select"
  ON public.micro_quiz_alternativas FOR SELECT
  USING (true);

-- Progresso: aluno gerencia apenas o seu
CREATE POLICY "micro_progresso_select"
  ON public.micro_progresso FOR SELECT
  USING (lower(email_aluno) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "micro_progresso_insert"
  ON public.micro_progresso FOR INSERT
  WITH CHECK (lower(email_aluno) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "micro_progresso_update"
  ON public.micro_progresso FOR UPDATE
  USING (lower(email_aluno) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Tentativas quiz: aluno gerencia apenas as suas
CREATE POLICY "micro_quiz_tent_select"
  ON public.micro_quiz_tentativas FOR SELECT
  USING (lower(email_aluno) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "micro_quiz_tent_insert"
  ON public.micro_quiz_tentativas FOR INSERT
  WITH CHECK (lower(email_aluno) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Analytics: aluno insere apenas os seus
CREATE POLICY "micro_analytics_select"
  ON public.micro_analytics FOR SELECT
  USING (lower(email_aluno) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "micro_analytics_insert"
  ON public.micro_analytics FOR INSERT
  WITH CHECK (lower(email_aluno) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ----------------------------------------------------------
-- 10. FUNÇÃO updated_at automático
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.micro_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER micro_topicos_updated_at
  BEFORE UPDATE ON public.micro_topicos
  FOR EACH ROW EXECUTE FUNCTION public.micro_set_updated_at();

CREATE TRIGGER micro_itens_updated_at
  BEFORE UPDATE ON public.micro_itens
  FOR EACH ROW EXECUTE FUNCTION public.micro_set_updated_at();

CREATE TRIGGER micro_progresso_updated_at
  BEFORE UPDATE ON public.micro_progresso
  FOR EACH ROW EXECUTE FUNCTION public.micro_set_updated_at();
