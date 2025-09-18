import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle, AlertTriangle } from 'lucide-react';

export const DirectSubscriptionTest = () => {
  const [testStage, setTestStage] = useState(0);

  console.log('🧪 DirectSubscriptionTest renderizado - stage:', testStage);

  const tests = [
    { id: 0, name: "Componente Carregado", status: "success" },
    { id: 1, name: "React State", status: "success" },
    { id: 2, name: "Shadcn Components", status: "success" },
    { id: 3, name: "Event Handlers", status: testStage > 0 ? "success" : "pending" }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Crown style={{ width: '20px', height: '20px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
            Teste Direto - Sistema de Assinaturas
          </h2>
        </div>

        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{
            color: '#166534',
            fontSize: '16px',
            fontWeight: 'bold',
            margin: '0 0 8px 0'
          }}>
            ✅ Componente Funcionando!
          </h3>
          <p style={{ color: '#15803d', fontSize: '14px', margin: 0 }}>
            Este componente está sendo renderizado sem usar o sistema de Tabs.
            Se você vê esta mensagem, o problema está especificamente na integração com as Tabs.
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
            Status dos Testes:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tests.map((test) => (
              <div key={test.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {test.status === 'success' ? (
                  <CheckCircle style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                ) : (
                  <AlertTriangle style={{ width: '16px', height: '16px', color: '#eab308' }} />
                )}
                <span style={{ fontSize: '14px' }}>
                  {test.name}: {test.status === 'success' ? 'OK' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              console.log('🎯 Botão clicado!');
              setTestStage(testStage + 1);
            }}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Testar Interação (Clique: {testStage})
          </button>

          <button
            onClick={() => {
              console.log('🔄 Reset do teste');
              setTestStage(0);
            }}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>

        {testStage > 0 && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '6px',
            padding: '12px',
            marginTop: '16px'
          }}>
            <p style={{ color: '#92400e', fontSize: '14px', margin: 0 }}>
              🎉 Interação funcionando! Cliques: {testStage}
            </p>
          </div>
        )}
      </div>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
          Diagnóstico do Problema
        </h3>
        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
          <p><strong>Se você vê este componente:</strong></p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>✅ React está funcionando</li>
            <li>✅ Componentes básicos funcionam</li>
            <li>✅ CSS está carregado</li>
            <li>❓ Problema pode estar no sistema de Tabs</li>
          </ul>

          <p style={{ marginTop: '16px' }}><strong>Próximos passos:</strong></p>
          <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Verificar console do navegador (F12)</li>
            <li>Testar outras abas (Conta, Envios, Créditos)</li>
            <li>Verificar se há JavaScript bloqueado</li>
          </ol>
        </div>
      </div>
    </div>
  );
};