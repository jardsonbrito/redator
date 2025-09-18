import { supabase } from '@/integrations/supabase/client';

// SQL para criar a tabela assinaturas se não existir
const CREATE_ASSINATURAS_TABLE = `
-- Criar tabela assinaturas se não existir
CREATE TABLE IF NOT EXISTS public.assinaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plano TEXT NOT NULL CHECK (plano IN ('Liderança', 'Lapidação', 'Largada')),
    data_inscricao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_assinaturas_aluno_id ON public.assinaturas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_data_validade ON public.assinaturas(data_validade);

-- Habilitar RLS
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Criar policies básicas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias assinaturas" ON public.assinaturas;
CREATE POLICY "Usuários podem ver suas próprias assinaturas" ON public.assinaturas
    FOR SELECT USING (
        aluno_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type IN ('admin', 'professor', 'corretor')
        )
    );

DROP POLICY IF EXISTS "Admins podem gerenciar assinaturas" ON public.assinaturas;
CREATE POLICY "Admins podem gerenciar assinaturas" ON public.assinaturas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'admin'
        )
    );
`;

// SQL para criar a tabela subscription_history se não existir
const CREATE_SUBSCRIPTION_HISTORY_TABLE = `
-- Criar tabela subscription_history se não existir
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    alteracao TEXT NOT NULL,
    data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    admin_responsavel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_subscription_history_aluno_id ON public.subscription_history(aluno_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_data_alteracao ON public.subscription_history(data_alteracao);

-- Habilitar RLS
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Criar policies
DROP POLICY IF EXISTS "Usuários podem ver seu histórico" ON public.subscription_history;
CREATE POLICY "Usuários podem ver seu histórico" ON public.subscription_history
    FOR SELECT USING (
        aluno_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type IN ('admin', 'professor', 'corretor')
        )
    );

DROP POLICY IF EXISTS "Admins podem gerenciar histórico" ON public.subscription_history;
CREATE POLICY "Admins podem gerenciar histórico" ON public.subscription_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'admin'
        )
    );
`;

export const initializeDatabase = async (): Promise<boolean> => {
  try {
    console.log('🔄 Inicializando estrutura do banco de dados...');

    // Executar criação da tabela assinaturas
    const { error: assinaturasError } = await supabase.rpc('exec_sql', {
      sql: CREATE_ASSINATURAS_TABLE
    });

    if (assinaturasError) {
      console.error('❌ Erro ao criar tabela assinaturas:', assinaturasError);
      // Continuar mesmo com erro, pode ser que a tabela já exista
    } else {
      console.log('✅ Tabela assinaturas criada/verificada com sucesso');
    }

    // Executar criação da tabela subscription_history
    const { error: historyError } = await supabase.rpc('exec_sql', {
      sql: CREATE_SUBSCRIPTION_HISTORY_TABLE
    });

    if (historyError) {
      console.error('❌ Erro ao criar tabela subscription_history:', historyError);
    } else {
      console.log('✅ Tabela subscription_history criada/verificada com sucesso');
    }

    return true;
  } catch (error) {
    console.error('❌ Erro geral na inicialização do banco:', error);
    return false;
  }
};

// Função para verificar se as tabelas existem
export const checkTablesExist = async (): Promise<{
  assinaturas: boolean;
  subscription_history: boolean;
}> => {
  const results = {
    assinaturas: false,
    subscription_history: false
  };

  try {
    // Verificar tabela assinaturas
    const { error: assinaturasError } = await supabase
      .from('assinaturas')
      .select('count', { count: 'exact' })
      .limit(1);

    results.assinaturas = !assinaturasError;

    // Verificar tabela subscription_history
    const { error: historyError } = await supabase
      .from('subscription_history')
      .select('count', { count: 'exact' })
      .limit(1);

    results.subscription_history = !historyError;

  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
  }

  return results;
};