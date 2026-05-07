-- ═══════════════════════════════════════════════════════════════
-- JARVIS → REDAÇÃO COMENTADA: Bridge Administrativo
-- Migration: 20260507000000
-- Descrição: Cria a integração entre correções do Jarvis e o módulo
--            de Redações Comentadas, com acesso restrito ao admin.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Rastreabilidade bidirecional ─────────────────────────────────────────

-- jarvis_correcoes guarda o ID da redação comentada gerada (se houver)
ALTER TABLE public.jarvis_correcoes
  ADD COLUMN IF NOT EXISTS redacao_comentada_id UUID
    REFERENCES public.redacoes_comentadas(id) ON DELETE SET NULL;

-- redacoes_comentadas guarda a correção de origem (se veio do Jarvis)
ALTER TABLE public.redacoes_comentadas
  ADD COLUMN IF NOT EXISTS jarvis_correcao_id UUID
    REFERENCES public.jarvis_correcoes(id) ON DELETE SET NULL;

-- Índices para lookup rápido
CREATE INDEX IF NOT EXISTS idx_jarvis_correcoes_redacao_comentada_id
  ON public.jarvis_correcoes(redacao_comentada_id)
  WHERE redacao_comentada_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_redacoes_comentadas_jarvis_correcao_id
  ON public.redacoes_comentadas(jarvis_correcao_id)
  WHERE jarvis_correcao_id IS NOT NULL;

-- ─── 2. Política RLS: admin acessa todas as correções do Jarvis ───────────────

-- Drop para garantir idempotência
DROP POLICY IF EXISTS "admin_gerencia_jarvis_correcoes" ON public.jarvis_correcoes;

-- Admin pode ler e atualizar todas as correções (necessário para exibir
-- histórico geral e para gravar o link com a redação comentada gerada)
CREATE POLICY "admin_gerencia_jarvis_correcoes"
  ON public.jarvis_correcoes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id    = auth.uid()
         OR admin_users.email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id    = auth.uid()
         OR admin_users.email = auth.email()
    )
  );

-- ─── 3. RPC: histórico geral de correções para o admin ───────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_jarvis_correcoes_geral(
  p_limit  INTEGER DEFAULT 500,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result   JSONB;
BEGIN
  -- Verifica se o chamador é admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id    = auth.uid()
       OR admin_users.email = auth.email()
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r.*) ORDER BY r.criado_em DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      jc.id,
      jc.professor_id,
      jc.turma_id,
      jc.autor_nome,
      jc.tema,
      jc.imagem_url,
      jc.status,
      jc.nota_total,
      jc.nota_c1,
      jc.nota_c2,
      jc.nota_c3,
      jc.nota_c4,
      jc.nota_c5,
      jc.criado_em,
      jc.corrigida_em,
      jc.is_versao_principal,
      jc.numero_versao,
      jc.grupo_id,
      jc.tipo_correcao,
      jc.correcao_ia,
      jc.transcricao_confirmada,
      jc.transcricao_ocr_original,
      jc.redacao_comentada_id,
      -- Info do professor
      p.nome  AS professor_nome,
      p.email AS professor_email
    FROM public.jarvis_correcoes jc
    LEFT JOIN public.professores p ON p.id = jc.professor_id
    WHERE jc.is_versao_principal = true
    ORDER BY jc.criado_em DESC
    LIMIT  p_limit
    OFFSET p_offset
  ) r;

  RETURN v_result;
END;
$$;

-- Permissão de execução para usuários autenticados
-- (a verificação de admin está dentro da função)
GRANT EXECUTE ON FUNCTION public.admin_get_jarvis_correcoes_geral TO authenticated;

-- Comentários
COMMENT ON COLUMN public.jarvis_correcoes.redacao_comentada_id IS
  'ID da Redação Comentada gerada a partir desta correção pelo admin (nulo se ainda não convertida)';

COMMENT ON COLUMN public.redacoes_comentadas.jarvis_correcao_id IS
  'ID da correção do Jarvis que originou esta Redação Comentada (nulo se criada manualmente)';
