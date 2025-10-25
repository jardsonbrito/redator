-- Migration: Corrigir função gerenciar_sessao_visitante para aceitar parâmetro whatsapp
-- Data: 2025-10-25
-- Objetivo: Adicionar suporte ao campo whatsapp na tabela visitante_sessoes

-- Adicionar coluna whatsapp se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitante_sessoes' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE public.visitante_sessoes ADD COLUMN whatsapp TEXT;
    RAISE NOTICE 'Coluna whatsapp adicionada à tabela visitante_sessoes';
  ELSE
    RAISE NOTICE 'Coluna whatsapp já existe na tabela visitante_sessoes';
  END IF;
END $$;

-- Recriar função para aceitar whatsapp
CREATE OR REPLACE FUNCTION public.gerenciar_sessao_visitante(
    p_email_visitante TEXT,
    p_nome_visitante TEXT,
    p_whatsapp TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_sessao_existente RECORD;
    v_novo_session_id UUID;
    v_resultado JSON;
BEGIN
    -- Normalizar email
    p_email_visitante := LOWER(TRIM(p_email_visitante));

    -- Verificar se já existe uma sessão para este email
    SELECT * INTO v_sessao_existente
    FROM public.visitante_sessoes
    WHERE email_visitante = p_email_visitante;

    IF v_sessao_existente.id IS NOT NULL THEN
        -- Atualizar sessão existente
        UPDATE public.visitante_sessoes
        SET
            nome_visitante = p_nome_visitante,
            whatsapp = COALESCE(p_whatsapp, whatsapp),
            ultimo_acesso = NOW(),
            ativo = true
        WHERE email_visitante = p_email_visitante
        RETURNING session_id INTO v_novo_session_id;

        v_resultado := json_build_object(
            'success', true,
            'action', 'updated',
            'session_id', v_novo_session_id,
            'message', 'Sessão atualizada com sucesso'
        );
    ELSE
        -- Criar nova sessão
        INSERT INTO public.visitante_sessoes (
            email_visitante,
            nome_visitante,
            whatsapp
        ) VALUES (
            p_email_visitante,
            p_nome_visitante,
            p_whatsapp
        ) RETURNING session_id INTO v_novo_session_id;

        v_resultado := json_build_object(
            'success', true,
            'action', 'created',
            'session_id', v_novo_session_id,
            'message', 'Nova sessão criada com sucesso'
        );
    END IF;

    RETURN v_resultado;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Erro ao gerenciar sessão do visitante'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION public.gerenciar_sessao_visitante IS
'Gerencia sessões de visitantes (criar ou atualizar). Aceita email, nome e opcionalmente whatsapp.';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Função gerenciar_sessao_visitante atualizada com suporte a whatsapp!';
END $$;
