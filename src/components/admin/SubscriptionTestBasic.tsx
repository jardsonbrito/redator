import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown } from 'lucide-react';

export const SubscriptionTestBasic = () => {
  console.log('🧪 SubscriptionTestBasic renderizado');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Teste Básico - Sistema de Assinaturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">✅ Componente Carregado com Sucesso!</h3>
            <p className="text-sm text-green-700">
              Se você está vendo esta mensagem, o componente está sendo renderizado corretamente.
              O problema pode estar no componente complexo ou na integração com o Supabase.
            </p>
            <div className="mt-3 text-xs text-green-600">
              <p>• React: Funcionando ✓</p>
              <p>• Shadcn UI: Funcionando ✓</p>
              <p>• Lucide Icons: Funcionando ✓</p>
              <p>• Tabs System: Funcionando ✓</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximos Passos para Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <strong className="text-blue-800">1. Verificar Console</strong>
              <p className="text-blue-700 mt-1">Abra F12 → Console e procure por erros ou logs começando com 🧪</p>
            </div>

            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <strong className="text-blue-800">2. Testar Conexão Supabase</strong>
              <p className="text-blue-700 mt-1">O problema pode ser na conexão com o banco de dados</p>
            </div>

            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <strong className="text-blue-800">3. Verificar Permissões</strong>
              <p className="text-blue-700 mt-1">RLS (Row Level Security) pode estar bloqueando o acesso</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};