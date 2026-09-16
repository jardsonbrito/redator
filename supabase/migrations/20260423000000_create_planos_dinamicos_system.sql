-- ============================================================
-- FASE 1: Sistema Dinâmico de Planos
-- Data: 2026-04-23
-- Objetivo: Tornar planos, funcionalidades e permissões de
-- acesso administráveis pelo painel, sem dependência de código.
-- Estratégia: aditiva — nenhuma tabela existente é removida;
-- o front mantém fallback hardcoded até a Fase 4.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABELAS
-- ============================================================

-- Catálogo de planos (substitui o array hardcoded no código)
CREATE TABLE IF NOT EXISTS public.planos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL UNIQUE,   -- slug que casa com assinaturas.plano
  nome_exibicao TEXT NOT NULL,
  descricao     TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  ordem         INT NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de funcionalidades/cards (substitui as constantes hardcoded)
CREATE TABLE IF NOT EXISTS public.funcionalidades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave             TEXT NOT NULL UNIQUE,  -- 'temas', 'simulados', etc.
  nome_exibicao     TEXT NOT NULL,
  descricao         TEXT,
  sempre_disponivel BOOLEAN NOT NULL DEFAULT false, -- ignora plano (ajuda_rapida, minhas_redacoes)
  ordem_aluno       INT NOT NULL DEFAULT 0,          -- ordem dos cards na tela do aluno
  ativo             BOOLEAN NOT NULL DEFAULT true,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quais funcionalidades cada plano libera
CREATE TABLE IF NOT EXISTS public.plano_funcionalidades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id          UUID NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  funcionalidade_id UUID NOT NULL REFERENCES public.funcionalidades(id) ON DELETE CASCADE,
  habilitado        BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(plano_id, funcionalidade_id)
);

-- Acesso do visitante (gerenciado separadamente, não é plano)
CREATE TABLE IF NOT EXISTS public.visitante_funcionalidades (
  funcionalidade_id UUID PRIMARY KEY REFERENCES public.funcionalidades(id) ON DELETE CASCADE,
  habilitado        BOOLEAN NOT NULL DEFAULT false
);

-- ============================================================
-- 2. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_planos_nome   ON public.planos(nome);
CREATE INDEX IF NOT EXISTS idx_planos_ativo  ON public.planos(ativo, ordem);
CREATE INDEX IF NOT EXISTS idx_funcionalidades_chave       ON public.funcionalidades(chave);
CREATE INDEX IF NOT EXISTS idx_funcionalidades_ordem_aluno ON public.funcionalidades(ordem_aluno);
CREATE INDEX IF NOT EXISTS idx_plano_func_plano_id        ON public.plano_funcionalidades(plano_id);
CREATE INDEX IF NOT EXISTS idx_plano_func_funcionalidade_id ON public.plano_funcionalidades(funcionalidade_id);

-- ============================================================
-- 3. TRIGGERS updated_at
-- Usa nome diferente para não conflitar com update_updated_at_column
-- já existente (que atualiza NEW.updated_at, não NEW.atualizado_em)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_atualizado_em ON public.planos;
CREATE TRIGGER trg_planos_atualizado_em
  BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS trg_funcionalidades_atualizado_em ON public.funcionalidades;
CREATE TRIGGER trg_funcionalidades_atualizado_em
  BEFORE UPDATE ON public.funcionalidades
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.planos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionalidades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_funcionalidades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitante_funcionalidades ENABLE ROW LEVEL SECURITY;

-- Leitura pública (authenticated + anon) — o front precisa ler sem auth
DROP POLICY IF EXISTS "planos_leitura_publica"          ON public.planos;
DROP POLICY IF EXISTS "funcionalidades_leitura_publica" ON public.funcionalidades;
DROP POLICY IF EXISTS "plano_func_leitura_publica"      ON public.plano_funcionalidades;
DROP POLICY IF EXISTS "visitante_func_leitura_publica"  ON public.visitante_funcionalidades;

CREATE POLICY "planos_leitura_publica"          ON public.planos                 FOR SELECT USING (true);
CREATE POLICY "funcionalidades_leitura_publica" ON public.funcionalidades        FOR SELECT USING (true);
CREATE POLICY "plano_func_leitura_publica"      ON public.plano_funcionalidades  FOR SELECT USING (true);
CREATE POLICY "visitante_func_leitura_publica"  ON public.visitante_funcionalidades FOR SELECT USING (true);

-- Escrita exclusiva para admins
DROP POLICY IF EXISTS "planos_admin_all"          ON public.planos;
DROP POLICY IF EXISTS "funcionalidades_admin_all" ON public.funcionalidades;
DROP POLICY IF EXISTS "plano_func_admin_all"      ON public.plano_funcionalidades;
DROP POLICY IF EXISTS "visitante_func_admin_all"  ON public.visitante_funcionalidades;

CREATE POLICY "planos_admin_all" ON public.planos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "funcionalidades_admin_all" ON public.funcionalidades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "plano_func_admin_all" ON public.plano_funcionalidades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "visitante_func_admin_all" ON public.visitante_funcionalidades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- ============================================================
-- 5. SEED: planos
-- Ordem reflete progressão de planos; Bolsista como tier especial
-- ============================================================

INSERT INTO public.planos (nome, nome_exibicao, descricao, ativo, ordem)
VALUES
  ('Largada',   'Largada',   'Plano inicial de acesso à plataforma',       true, 1),
  ('Lapidação', 'Lapidação', 'Plano intermediário com acesso expandido',   true, 2),
  ('Bolsista',  'Bolsista',  'Plano para alunos bolsistas',                true, 3),
  ('Liderança', 'Liderança', 'Plano completo com acesso a todos os cards', true, 4)
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- 6. SEED: funcionalidades
-- chave = slug que casa com o mapping do MenuGrid e com os hooks
-- sempre_disponivel = true → card aparece independente de plano
-- ordem_aluno = ordem atual dos cards na tela do aluno
-- ============================================================

INSERT INTO public.funcionalidades
  (chave, nome_exibicao, descricao, sempre_disponivel, ordem_aluno, ativo)
VALUES
  ('temas',                'Temas',               'Enviar redações nos temas propostos',                     false, 1,  true),
  ('exercicios',           'Exercícios',           'Exercícios de gramática e argumentação',                  false, 2,  true),
  ('simulados',            'Simulados',            'Provas simuladas do ENEM',                                false, 3,  true),
  ('lousa',                'Lousa',                'Material interativo da lousa',                            false, 4,  true),
  ('biblioteca',           'Biblioteca',           'Acervo de textos e materiais de apoio',                   false, 5,  true),
  ('redacoes_exemplares',  'Redações Exemplares',  'Redações nota 1000 comentadas',                           false, 6,  true),
  ('aulas_ao_vivo',        'Aulas ao Vivo',        'Transmissões ao vivo com professor',                      false, 7,  true),
  ('videoteca',            'Videoteca',            'Biblioteca de videoaulas',                                false, 8,  true),
  ('aulas_gravadas',       'Aulas Gravadas',       'Aulas gravadas disponíveis a qualquer hora',              false, 9,  true),
  ('diario_online',        'Diário Online',        'Diário de estudos e anotações pessoais',                  false, 10, true),
  ('gamificacao',          'Gamificação',          'Sistema de pontos e ranking',                             false, 11, true),
  ('top_5',                'Top 5',                'Ranking dos melhores alunos da turma',                    false, 12, true),
  ('minhas_conquistas',    'Minhas Conquistas',    'Histórico de medalhas e conquistas',                      false, 13, true),
  ('repertorio_orientado', 'Repertório Orientado', 'Repertório cultural com curadoria do professor',          false, 14, true),
  ('jarvis',               'Jarvis',               'Assistente de IA para redação',                           false, 15, true),
  ('microaprendizagem',    'Microaprendizagem',    'Conteúdo em pílulas curtas de aprendizado',               false, 16, true),
  ('enviar_tema_livre',    'Enviar Tema Livre',    'Enviar redação sobre tema escolhido pelo aluno',          false, 17, true),
  ('ajuda_rapida',         'Ajuda Rápida',         'Atendimento direto com corretor — sempre disponível',     true,  18, true),
  ('minhas_redacoes',      'Minhas Redações',      'Histórico de todas as redações enviadas — sempre disponível', true, 19, true)
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- 7. SEED: plano_funcionalidades
-- Reflete exatamente o DEFAULT_PLAN_FEATURES atual do código.
-- Bolsista = Liderança (correção solicitada).
-- ============================================================

DO $$
DECLARE
  v_largada_id    UUID;
  v_lapidacao_id  UUID;
  v_bolsista_id   UUID;
  v_lideranca_id  UUID;
  v_feat          RECORD;
  v_habilitado    BOOLEAN;
BEGIN
  SELECT id INTO v_largada_id    FROM public.planos WHERE nome = 'Largada';
  SELECT id INTO v_lapidacao_id  FROM public.planos WHERE nome = 'Lapidação';
  SELECT id INTO v_bolsista_id   FROM public.planos WHERE nome = 'Bolsista';
  SELECT id INTO v_lideranca_id  FROM public.planos WHERE nome = 'Liderança';

  -- LARGADA
  -- Habilitados: temas, videoteca, aulas_gravadas, diario_online,
  --              gamificacao, top_5, minhas_conquistas, jarvis, microaprendizagem
  FOR v_feat IN
    SELECT id, chave FROM public.funcionalidades WHERE sempre_disponivel = false
  LOOP
    v_habilitado := CASE v_feat.chave
      WHEN 'temas'               THEN true
      WHEN 'videoteca'           THEN true
      WHEN 'aulas_gravadas'      THEN true
      WHEN 'diario_online'       THEN true
      WHEN 'gamificacao'         THEN true
      WHEN 'top_5'               THEN true
      WHEN 'minhas_conquistas'   THEN true
      WHEN 'jarvis'              THEN true
      WHEN 'microaprendizagem'   THEN true
      ELSE false
    END;

    INSERT INTO public.plano_funcionalidades (plano_id, funcionalidade_id, habilitado)
    VALUES (v_largada_id, v_feat.id, v_habilitado)
    ON CONFLICT (plano_id, funcionalidade_id) DO NOTHING;
  END LOOP;

  -- LAPIDAÇÃO
  -- Tudo habilitado EXCETO aulas_ao_vivo
  FOR v_feat IN
    SELECT id, chave FROM public.funcionalidades WHERE sempre_disponivel = false
  LOOP
    v_habilitado := CASE v_feat.chave
      WHEN 'aulas_ao_vivo' THEN false
      ELSE true
    END;

    INSERT INTO public.plano_funcionalidades (plano_id, funcionalidade_id, habilitado)
    VALUES (v_lapidacao_id, v_feat.id, v_habilitado)
    ON CONFLICT (plano_id, funcionalidade_id) DO NOTHING;
  END LOOP;

  -- LIDERANÇA: tudo habilitado
  INSERT INTO public.plano_funcionalidades (plano_id, funcionalidade_id, habilitado)
  SELECT v_lideranca_id, f.id, true
  FROM public.funcionalidades f
  WHERE f.sempre_disponivel = false
  ON CONFLICT (plano_id, funcionalidade_id) DO NOTHING;

  -- BOLSISTA: idêntico ao Liderança (correção da Fase 1)
  INSERT INTO public.plano_funcionalidades (plano_id, funcionalidade_id, habilitado)
  SELECT v_bolsista_id, f.id, true
  FROM public.funcionalidades f
  WHERE f.sempre_disponivel = false
  ON CONFLICT (plano_id, funcionalidade_id) DO NOTHING;

END;
$$;

-- ============================================================
-- 8. SEED: visitante_funcionalidades
-- Reflete exatamente o VISITANTE_FEATURES atual do código.
-- Habilitados: temas, enviar_tema_livre, jarvis
-- ============================================================

INSERT INTO public.visitante_funcionalidades (funcionalidade_id, habilitado)
SELECT f.id,
  CASE f.chave
    WHEN 'temas'             THEN true
    WHEN 'enviar_tema_livre' THEN true
    WHEN 'jarvis'            THEN true
    ELSE false
  END
FROM public.funcionalidades f
ON CONFLICT (funcionalidade_id) DO NOTHING;

-- ============================================================
-- 9. CORRIGIR CONSTRAINT DE assinaturas.plano
-- Remove CHECK hardcoded (que excluía 'Bolsista') e
-- adiciona FK dinâmica para planos.nome.
-- ON UPDATE CASCADE: renomear plano no painel propaga automaticamente.
-- ============================================================

ALTER TABLE public.assinaturas
  DROP CONSTRAINT IF EXISTS assinaturas_plano_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_assinaturas_plano'
      AND table_schema = 'public'
      AND table_name = 'assinaturas'
  ) THEN
    ALTER TABLE public.assinaturas
      ADD CONSTRAINT fk_assinaturas_plano
        FOREIGN KEY (plano)
        REFERENCES public.planos(nome)
        ON UPDATE CASCADE;
  END IF;
END;
$$;

-- ============================================================
-- 10. RPCs
-- Todas com SECURITY DEFINER para contornar RLS onde necessário.
-- ============================================================

-- Retorna features de um plano por nome (usado por usePlanFeatures)
CREATE OR REPLACE FUNCTION public.get_features_for_plan(plan_name TEXT)
RETURNS TABLE (chave TEXT, habilitado BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT f.chave, pf.habilitado
  FROM public.plano_funcionalidades pf
  JOIN public.funcionalidades f ON f.id = pf.funcionalidade_id
  JOIN public.planos p          ON p.id = pf.plano_id
  WHERE p.nome = plan_name
    AND p.ativo = true
    AND f.ativo = true;
END;
$$;

-- Retorna features do visitante (usado por usePlanFeatures)
CREATE OR REPLACE FUNCTION public.get_visitante_features()
RETURNS TABLE (chave TEXT, habilitado BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT f.chave, vf.habilitado
  FROM public.visitante_funcionalidades vf
  JOIN public.funcionalidades f ON f.id = vf.funcionalidade_id
  WHERE f.ativo = true;
END;
$$;

-- Retorna funcionalidades ordenadas (usado pelo MenuGrid e pelo admin)
CREATE OR REPLACE FUNCTION public.get_funcionalidades_ordered()
RETURNS TABLE (
  id                UUID,
  chave             TEXT,
  nome_exibicao     TEXT,
  descricao         TEXT,
  sempre_disponivel BOOLEAN,
  ordem_aluno       INT,
  ativo             BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.chave, f.nome_exibicao, f.descricao,
         f.sempre_disponivel, f.ordem_aluno, f.ativo
  FROM public.funcionalidades f
  WHERE f.ativo = true
  ORDER BY f.ordem_aluno ASC;
END;
$$;

-- Retorna todos os planos ativos com suas features (usado pelo admin)
CREATE OR REPLACE FUNCTION public.get_all_plans_with_features()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',            p.id,
      'nome',          p.nome,
      'nome_exibicao', p.nome_exibicao,
      'descricao',     p.descricao,
      'ativo',         p.ativo,
      'ordem',         p.ordem,
      'features',      (
        SELECT jsonb_object_agg(f.chave, pf.habilitado)
        FROM public.plano_funcionalidades pf
        JOIN public.funcionalidades f ON f.id = pf.funcionalidade_id
        WHERE pf.plano_id = p.id AND f.ativo = true
      )
    )
    ORDER BY p.ordem ASC
  )
  INTO result
  FROM public.planos p
  WHERE p.ativo = true;

  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- Salva/atualiza features de um plano (usado pelo admin)
-- p_features: {"chave": true/false, ...}
CREATE OR REPLACE FUNCTION public.upsert_plan_features(
  p_plan_id  UUID,
  p_features JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_chave           TEXT;
  v_habilitado      BOOLEAN;
  v_funcionalidade_id UUID;
BEGIN
  FOR v_chave, v_habilitado IN
    SELECT key, value::BOOLEAN FROM jsonb_each(p_features)
  LOOP
    SELECT id INTO v_funcionalidade_id
    FROM public.funcionalidades WHERE chave = v_chave;

    IF v_funcionalidade_id IS NOT NULL THEN
      INSERT INTO public.plano_funcionalidades (plano_id, funcionalidade_id, habilitado)
      VALUES (p_plan_id, v_funcionalidade_id, v_habilitado)
      ON CONFLICT (plano_id, funcionalidade_id)
        DO UPDATE SET habilitado = EXCLUDED.habilitado;
    END IF;
  END LOOP;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Salva/atualiza features do visitante (usado pelo admin)
CREATE OR REPLACE FUNCTION public.upsert_visitante_features(
  p_features JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_chave             TEXT;
  v_habilitado        BOOLEAN;
  v_funcionalidade_id UUID;
BEGIN
  FOR v_chave, v_habilitado IN
    SELECT key, value::BOOLEAN FROM jsonb_each(p_features)
  LOOP
    SELECT id INTO v_funcionalidade_id
    FROM public.funcionalidades WHERE chave = v_chave;

    IF v_funcionalidade_id IS NOT NULL THEN
      INSERT INTO public.visitante_funcionalidades (funcionalidade_id, habilitado)
      VALUES (v_funcionalidade_id, v_habilitado)
      ON CONFLICT (funcionalidade_id)
        DO UPDATE SET habilitado = EXCLUDED.habilitado;
    END IF;
  END LOOP;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Reordena funcionalidades via drag-and-drop (usado pelo admin)
-- p_ordered_ids: array de UUIDs na nova ordem
CREATE OR REPLACE FUNCTION public.reorder_funcionalidades(
  p_ordered_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..array_length(p_ordered_ids, 1)
  LOOP
    UPDATE public.funcionalidades
    SET ordem_aluno = i
    WHERE id = p_ordered_ids[i];
  END LOOP;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Reordena planos via drag-and-drop (usado pelo admin)
CREATE OR REPLACE FUNCTION public.reorder_planos(
  p_ordered_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..array_length(p_ordered_ids, 1)
  LOOP
    UPDATE public.planos
    SET ordem = i
    WHERE id = p_ordered_ids[i];
  END LOOP;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- ============================================================
-- 11. GRANTS
-- ============================================================

-- Leitura: accessible a qualquer usuário (inclusive não autenticado/visitante)
GRANT EXECUTE ON FUNCTION public.get_features_for_plan(TEXT)   TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_visitante_features()       TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_funcionalidades_ordered()  TO authenticated, anon, service_role;

-- Admin (authenticated é suficiente; RLS nas tabelas protege escrita)
GRANT EXECUTE ON FUNCTION public.get_all_plans_with_features()          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_plan_features(UUID, JSONB)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_visitante_features(JSONB)       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_funcionalidades(UUID[])        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_planos(UUID[])                 TO authenticated, service_role;

COMMIT;
