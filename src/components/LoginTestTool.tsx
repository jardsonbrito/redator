
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEmail } from "@/utils/emailNormalizer";

export const LoginTestTool = () => {
  const [testEmail, setTestEmail] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runConsistencyTest = async () => {
    if (!testEmail.trim()) return;

    setIsRunning(true);
    const results = [];
    const emailNormalizado = normalizeEmail(testEmail);

    console.log('🧪 INICIANDO TESTE DE CONSISTÊNCIA');
    console.log('📧 Email de teste:', testEmail);
    console.log('📧 Email normalizado:', emailNormalizado);

    // Executar 10 tentativas seguidas
    for (let i = 1; i <= 10; i++) {
      const startTime = Date.now();
      
      try {
        const { data: aluno, error } = await supabase
          .from("profiles")
          .select("id, nome, email, turma")
          .eq("user_type", "aluno")
          .ilike("email", emailNormalizado)
          .limit(1)
          .maybeSingle();

        const endTime = Date.now();
        const duration = endTime - startTime;

        results.push({
          tentativa: i,
          sucesso: !!aluno && !error,
          encontrado: !!aluno,
          erro: error?.message || null,
          duracao: duration,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Tentativa ${i}: ${aluno ? 'ENCONTRADO' : 'NÃO ENCONTRADO'} (${duration}ms)`);

      } catch (error: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        results.push({
          tentativa: i,
          sucesso: false,
          encontrado: false,
          erro: error.message,
          duracao: duration,
          timestamp: new Date().toISOString()
        });

        console.log(`❌ Tentativa ${i}: ERRO - ${error.message} (${duration}ms)`);
      }

      // Pequeno delay entre tentativas
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setTestResults(results);
    setIsRunning(false);

    // Análise dos resultados
    const sucessos = results.filter(r => r.sucesso).length;
    const mediaTempo = results.reduce((acc, r) => acc + r.duracao, 0) / results.length;

    console.log('📊 RESULTADO DO TESTE:');
    console.log(`✅ Sucessos: ${sucessos}/10 (${(sucessos/10*100).toFixed(1)}%)`);
    console.log(`⏱️ Tempo médio: ${mediaTempo.toFixed(0)}ms`);
    console.log('🔍 Inconsistência detectada:', sucessos < 10 ? 'SIM' : 'NÃO');
  };

  return (
    <Card className="mt-6 border-yellow-200">
      <CardHeader>
        <CardTitle className="text-yellow-700">🧪 Teste de Consistência do Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Digite um e-mail para testar"
            className="flex-1"
          />
          <Button 
            onClick={runConsistencyTest}
            disabled={isRunning || !testEmail.trim()}
            variant="outline"
          >
            {isRunning ? 'Testando...' : 'Testar 10x'}
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="text-sm space-y-2">
            <div className="font-semibold">
              Resultados: {testResults.filter(r => r.sucesso).length}/10 sucessos
            </div>
            <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
              {testResults.map((result, idx) => (
                <div key={idx} className={result.sucesso ? 'text-green-600' : 'text-red-600'}>
                  Tentativa {result.tentativa}: {result.sucesso ? '✅' : '❌'} 
                  {result.encontrado ? ' ENCONTRADO' : ' NÃO ENCONTRADO'} 
                  ({result.duracao}ms)
                  {result.erro && ` - ${result.erro}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
