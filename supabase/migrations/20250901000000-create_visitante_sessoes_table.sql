-- Criar tabela para rastrear sessões de visitantes
CREATE TABLE IF NOT EXISTS public.visitante_sessoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_visitante TEXT NOT NULL,
    nome_visitante TEXT NOT NULL,
    session_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    primeiro_acesso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultimo_acesso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice único para email do visitante (um registro por visitante)
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitante_sessoes_email 
ON public.visitante_sessoes(email_visitante);

-- Criar índice para session_id (para busca rápida)
CREATE INDEX IF NOT EXISTS idx_visitante_sessoes_session_id 
ON public.visitante_sessoes(session_id);

-- Habilitar RLS na tabela
ALTER TABLE public.visitante_sessoes ENABLE ROW LEVEL SECURITY;

-- Política para permitir que visitantes vejam/modifiquem apenas seus próprios dados
CREATE POLICY "Visitantes podem gerenciar suas próprias sessões" 
ON public.visitante_sessoes 
FOR ALL 
USING (true) -- Permitir tudo por enquanto (sem auth complexa para visitantes)
WITH CHECK (true);

-- Função para atualizar ultimo_acesso automaticamente
CREATE OR REPLACE FUNCTION update_visitante_ultimo_acesso()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultimo_acesso = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar ultimo_acesso em updates
CREATE TRIGGER trigger_update_visitante_ultimo_acesso
    BEFORE UPDATE ON public.visitante_sessoes
    FOR EACH ROW
    EXECUTE FUNCTION update_visitante_ultimo_acesso();

-- Função para gerenciar sessão de visitante (criar ou atualizar)
CREATE OR REPLACE FUNCTION public.gerenciar_sessao_visitante(
    p_email_visitante TEXT,
    p_nome_visitante TEXT
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
            nome_visitante
        ) VALUES (
            p_email_visitante,
            p_nome_visitante
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