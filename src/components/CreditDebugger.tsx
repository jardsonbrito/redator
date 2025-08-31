import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const CreditDebugger = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testCreditsForAbilio = async () => {
    setLoading(true);
    const email = 'abilio.gomes@aluno.ce.gov.br';
    
    try {
      console.log('🔍 DEBUGGER - Testando créditos para Abílio');
      
      // Teste 1: Query direta na tabela profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('creditos, nome, email, user_type, ativo, status_aprovacao')
        .eq('email', email)
        .eq('user_type', 'aluno');

      // Teste 2: Usando a função RPC
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_credits_by_email', { user_email: email });

      // Teste 3: Verificar sessão atual
      const { data: session } = await supabase.auth.getSession();

      // Teste 4: Verificar se há algum usuário logado
      const { data: user } = await supabase.auth.getUser();

      const debug = {
        timestamp: new Date().toISOString(),
        profileQuery: { data: profileData, error: profileError },
        rpcQuery: { data: rpcData, error: rpcError },
        currentSession: session,
        currentUser: user,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      setDebugInfo(debug);
      console.log('📊 DEBUGGER - Resultado completo:', debug);

    } catch (error) {
      console.error('💥 DEBUGGER - Erro:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testCreditsForAbilio();
  }, []);

  return (
    <Card className="max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle>🔧 Debug de Créditos - Abílio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testCreditsForAbilio} disabled={loading}>
          {loading ? 'Testando...' : 'Testar Novamente'}
        </Button>
        
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Resultado do Debug:</h3>
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        {debugInfo.profileQuery && (
          <div className="bg-blue-50 p-4 rounded">
            <h4 className="font-bold">Query Profiles:</h4>
            <p>Dados: {JSON.stringify(debugInfo.profileQuery.data)}</p>
            <p>Erro: {debugInfo.profileQuery.error || 'Nenhum'}</p>
          </div>
        )}
        
        {debugInfo.rpcQuery && (
          <div className="bg-green-50 p-4 rounded">
            <h4 className="font-bold">RPC Function:</h4>
            <p>Créditos: {debugInfo.rpcQuery.data}</p>
            <p>Erro: {debugInfo.rpcQuery.error || 'Nenhum'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};