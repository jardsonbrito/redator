import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const SimpleSubscriptionTest = () => {
  const { data: testData, isLoading, error } = useQuery({
    queryKey: ['subscription-test'],
    queryFn: async () => {
      console.log('🧪 Iniciando teste do sistema de assinaturas...');

      // Teste 1: Verificar conexão básica
      const { data: authTest, error: authError } = await supabase.auth.getUser();
      console.log('🔐 Auth test:', { user: !!authTest?.user, error: authError });

      // Teste 2: Buscar alunos
      const { data: alunos, error: alunosError } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('user_type', 'aluno')
        .limit(5);

      console.log('👥 Alunos test:', { count: alunos?.length, error: alunosError });

      // Teste 3: Verificar tabela assinaturas
      const { data: assinaturas, error: assinaturasError } = await supabase
        .from('assinaturas')
        .select('*')
        .limit(1);

      console.log('📋 Assinaturas test:', { count: assinaturas?.length, error: assinaturasError });

      // Teste 4: Verificar tabela histórico
      const { data: historico, error: historicoError } = await supabase
        .from('subscription_history')
        .select('*')
        .limit(1);

      console.log('📜 Histórico test:', { count: historico?.length, error: historicoError });

      return {
        auth: { user: !!authTest?.user, error: authError },
        alunos: { data: alunos, error: alunosError },
        assinaturas: { data: assinaturas, error: assinaturasError },
        historico: { data: historico, error: historicoError }
      };
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Teste do Sistema de Assinaturas
        </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Executando testes...</span>
            </div>
          ) : error ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Erro nos testes: {error.message}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm">
                <h4 className="font-semibold mb-2">Resultados dos Testes:</h4>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {testData?.auth?.user ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Autenticação: {testData?.auth?.user ? 'OK' : 'Falhou'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!testData?.alunos?.error ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span>
                      Tabela Profiles: {!testData?.alunos?.error ?
                        `OK (${testData?.alunos?.data?.length || 0} alunos encontrados)` :
                        `Erro: ${testData?.alunos?.error?.message}`
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!testData?.assinaturas?.error ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span>
                      Tabela Assinaturas: {!testData?.assinaturas?.error ?
                        `OK (${testData?.assinaturas?.data?.length || 0} registros)` :
                        `Erro: ${testData?.assinaturas?.error?.message}`
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!testData?.historico?.error ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span>
                      Tabela Histórico: {!testData?.historico?.error ?
                        `OK (${testData?.historico?.data?.length || 0} registros)` :
                        `Erro: ${testData?.historico?.error?.message}`
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  ✅ Se todos os testes passaram, o sistema de assinaturas está funcionando corretamente.
                  <br />
                  📋 Verifique o console do navegador (F12) para logs detalhados.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};