import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface DebugData {
  timestamp: string;
  action: string;
  data: any;
  error?: any;
}

export const SubscriptionDebugger = () => {
  const [debugLogs, setDebugLogs] = useState<DebugData[]>([]);
  const [studentEmail, setStudentEmail] = useState('');
  const [isDebugging, setIsDebugging] = useState(false);

  const log = (action: string, data: any, error?: any) => {
    const debugEntry: DebugData = {
      timestamp: new Date().toISOString(),
      action,
      data,
      error
    };

    setDebugLogs(prev => [debugEntry, ...prev].slice(0, 20)); // Manter apenas os últimos 20 logs

    // Log também no console para capturar em produção
    console.log(`🔍 [SUBSCRIPTION DEBUG] ${action}:`, { data, error });
  };

  const testAlessandraSubscription = async () => {
    setIsDebugging(true);
    setDebugLogs([]);

    try {
      log('INÍCIO DO TESTE', { email: 'alessandra.edvirges@example.com' });

      // 1. Buscar perfil da Alessandra
      log('STEP 1', 'Buscando perfil da Alessandra...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'alessandra.edvirges@example.com')
        .single();

      log('STEP 1 - RESULTADO PROFILE', { profile, profileError });

      if (profileError || !profile) {
        log('ERRO - PROFILE NÃO ENCONTRADO', { profileError });
        return;
      }

      // 2. Buscar assinatura da Alessandra
      log('STEP 2', 'Buscando assinatura...');
      const { data: subscription, error: subscriptionError } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('aluno_id', profile.id)
        .order('data_validade', { ascending: false })
        .limit(1);

      log('STEP 2 - RESULTADO SUBSCRIPTION', { subscription, subscriptionError });

      // 3. Verificar tabela assinaturas diretamente
      log('STEP 3', 'Verificando todas as assinaturas...');
      const { data: allSubscriptions, error: allSubsError } = await supabase
        .from('assinaturas')
        .select('*')
        .limit(10);

      log('STEP 3 - TODAS AS ASSINATURAS', { allSubscriptions, allSubsError });

      // 4. Verificar estrutura da tabela
      log('STEP 4', 'Verificando estrutura da tabela...');
      const { data: tableInfo, error: tableError } = await supabase
        .from('assinaturas')
        .select('id, aluno_id, plano, data_inscricao, data_validade')
        .limit(1);

      log('STEP 4 - ESTRUTURA DA TABELA', { tableInfo, tableError });

      // 5. Testar hook useSubscription
      log('STEP 5', 'Testando hook useSubscription...');
      // Simular o que o hook faz
      if (profile) {
        const { data: hookTest, error: hookError } = await supabase
          .from('assinaturas')
          .select('plano, data_inscricao, data_validade')
          .eq('aluno_id', profile.id)
          .order('data_validade', { ascending: false })
          .limit(1)
          .single();

        log('STEP 5 - HOOK SIMULATION', { hookTest, hookError });
      }

    } catch (error) {
      log('ERRO GERAL', { error });
    } finally {
      setIsDebugging(false);
    }
  };

  const testGeneralSubscriptions = async () => {
    setIsDebugging(true);

    try {
      log('TESTE GERAL', 'Verificando ambiente e configurações...');

      // 1. Verificar URL do Supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      log('CONFIGURAÇÕES SUPABASE', {
        url: supabaseUrl ? 'DEFINIDO' : 'NÃO DEFINIDO',
        key: supabaseKey ? 'DEFINIDO' : 'NÃO DEFINIDO',
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE
      });

      // 2. Testar conexão básica
      log('TESTE CONEXÃO', 'Testando conexão com Supabase...');
      const { data: testConnection, error: connectionError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact' })
        .limit(1);

      log('RESULTADO CONEXÃO', { testConnection, connectionError });

      // 3. Verificar se tabela assinaturas existe
      log('TESTE TABELA', 'Verificando se tabela assinaturas existe...');
      const { data: tableExists, error: tableExistsError } = await supabase
        .from('assinaturas')
        .select('count', { count: 'exact' })
        .limit(1);

      log('RESULTADO TABELA', { tableExists, tableExistsError });

    } catch (error) {
      log('ERRO NO TESTE GERAL', { error });
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Debug de Assinaturas (Produção)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Este componente serve para diagnosticar problemas de assinatura em produção.
              Todos os logs também aparecem no console do navegador.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={testAlessandraSubscription}
              disabled={isDebugging}
              variant="outline"
            >
              {isDebugging ? 'Testando...' : 'Testar Alessandra Edvirges'}
            </Button>

            <Button
              onClick={testGeneralSubscriptions}
              disabled={isDebugging}
              variant="outline"
            >
              {isDebugging ? 'Testando...' : 'Teste Geral do Sistema'}
            </Button>

            <Button
              onClick={() => setDebugLogs([])}
              variant="outline"
            >
              Limpar Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {debugLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logs de Debug ({debugLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {debugLogs.map((log, index) => (
                <div key={index} className="border rounded p-3 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={log.error ? 'destructive' : 'default'}>
                      {log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <Textarea
                    value={JSON.stringify({ data: log.data, error: log.error }, null, 2)}
                    readOnly
                    className="font-mono text-xs h-32"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};