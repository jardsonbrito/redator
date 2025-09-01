-- Função para migrar visitante para aluno (caso o visitante decida se cadastrar futuramente)
CREATE OR REPLACE FUNCTION public.migrar_visitante_para_aluno(
    p_email_visitante TEXT,
    p_nova_turma TEXT
)
RETURNS JSON AS $$
DECLARE
    v_count_redacoes INTEGER;
    v_session_data RECORD;
    v_resultado JSON;
BEGIN
    -- Normalizar email
    p_email_visitante := LOWER(TRIM(p_email_visitante));
    
    -- Verificar se existe sessão de visitante
    SELECT * INTO v_session_data 
    FROM public.visitante_sessoes 
    WHERE email_visitante = p_email_visitante;
    
    IF v_session_data.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Sessão de visitante não encontrada para este email'
        );
    END IF;
    
    -- Contar redações do visitante
    SELECT COUNT(*) INTO v_count_redacoes
    FROM public.redacoes_enviadas
    WHERE LOWER(TRIM(email_aluno)) = p_email_visitante
    AND turma = 'visitante';
    
    -- Atualizar turma das redações de visitante para a nova turma do aluno
    UPDATE public.redacoes_enviadas
    SET turma = p_nova_turma,
        updated_at = NOW()
    WHERE LOWER(TRIM(email_aluno)) = p_email_visitante
    AND turma = 'visitante';
    
    -- Marcar sessão de visitante como migrada (inativar)
    UPDATE public.visitante_sessoes
    SET 
        ativo = false,
        updated_at = NOW(),
        ultimo_acesso = NOW()
    WHERE email_visitante = p_email_visitante;
    
    v_resultado := json_build_object(
        'success', true,
        'message', 'Migração concluída com sucesso',
        'redacoes_migradas', v_count_redacoes,
        'turma_destino', p_nova_turma
    );
    
    RETURN v_resultado;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Erro durante a migração de visitante para aluno'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar estatísticas de visitantes (para administração)
CREATE OR REPLACE FUNCTION public.get_estatisticas_visitantes()
RETURNS JSON AS $$
DECLARE
    v_total_visitantes INTEGER;
    v_visitantes_ativos INTEGER;
    v_total_redacoes INTEGER;
    v_visitantes_ultima_semana INTEGER;
    v_resultado JSON;
BEGIN
    -- Total de visitantes registrados
    SELECT COUNT(*) INTO v_total_visitantes
    FROM public.visitante_sessoes;
    
    -- Visitantes ativos (que acessaram nos últimos 30 dias)
    SELECT COUNT(*) INTO v_visitantes_ativos
    FROM public.visitante_sessoes
    WHERE ultimo_acesso >= NOW() - INTERVAL '30 days'
    AND ativo = true;
    
    -- Total de redações de visitantes
    SELECT COUNT(*) INTO v_total_redacoes
    FROM public.redacoes_enviadas
    WHERE turma = 'visitante';
    
    -- Visitantes que acessaram na última semana
    SELECT COUNT(*) INTO v_visitantes_ultima_semana
    FROM public.visitante_sessoes
    WHERE ultimo_acesso >= NOW() - INTERVAL '7 days';
    
    v_resultado := json_build_object(
        'total_visitantes', v_total_visitantes,
        'visitantes_ativos_30_dias', v_visitantes_ativos,
        'total_redacoes_visitantes', v_total_redacoes,
        'visitantes_ultima_semana', v_visitantes_ultima_semana,
        'gerado_em', NOW()
    );
    
    RETURN v_resultado;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Erro ao gerar estatísticas de visitantes'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;