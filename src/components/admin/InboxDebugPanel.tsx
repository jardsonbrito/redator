import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function InboxDebugPanel() {
  const [showDebug, setShowDebug] = useState(false);

  // Testar turmas únicas dos alunos
  const { data: turmasTest, error: turmasError, isLoading: turmasLoading } = useQuery({
    queryKey: ['debug-turmas'],
    queryFn: async () => {
      console.log('🔍 Testando busca de turmas únicas...');

      const { data, error } = await supabase
        .from('profiles')
        .select('turma, turma_codigo')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .not('turma', 'is', null)
        .not('turma_codigo', 'is', null);

      console.log('Resultado da query de turmas:', { data, error });

      if (error) {
        console.error('Erro na query de turmas:', error);
        throw error;
      }

      // Extrair turmas únicas
      const turmasUnicas = new Map();
      (data || []).forEach(item => {
        if (item.turma && item.turma_codigo) {
          turmasUnicas.set(item.turma_codigo, {
            codigo: item.turma_codigo,
            nome: item.turma
          });
        }
      });

      return { data: Array.from(turmasUnicas.values()), count: turmasUnicas.size };
    },
    enabled: showDebug,
  });

  // Testar conexão com alunos
  const { data: alunosTest, error: alunosError, isLoading: alunosLoading } = useQuery({
    queryKey: ['debug-alunos'],
    queryFn: async () => {
      console.log('🔍 Testando busca de alunos...');

      const { data, error, count } = await supabase
        .from('profiles')
        .select('email, nome, turma, turma_codigo, user_type, ativo', { count: 'exact' })
        .eq('user_type', 'aluno')
        .limit(5);

      console.log('Resultado da query de alunos:', { data, error, count });

      if (error) {
        console.error('Erro na query de alunos:', error);
        throw error;
      }

      return { data, count };
    },
    enabled: showDebug,
  });

  // Testar tabelas do inbox
  const { data: inboxTest, error: inboxError, isLoading: inboxLoading } = useQuery({
    queryKey: ['debug-inbox'],
    queryFn: async () => {
      console.log('🔍 Testando tabelas do inbox...');

      const { data: messages, error: messagesError } = await supabase
        .from('inbox_messages')
        .select('*')
        .limit(3);

      const { data: recipients, error: recipientsError } = await supabase
        .from('inbox_recipients')
        .select('*')
        .limit(3);

      console.log('Mensagens:', { messages, messagesError });
      console.log('Destinatários:', { recipients, recipientsError });

      return {
        messages: { data: messages, error: messagesError },
        recipients: { data: recipients, error: recipientsError }
      };
    },
    enabled: showDebug,
  });

  if (!showDebug) {
    return (
      <div className="p-4">
        <Button onClick={() => setShowDebug(true)} variant="outline">
          🔧 Debug: Testar Conexões do Inbox
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-yellow-800">Debug do Sistema Inbox</h3>
        <Button onClick={() => setShowDebug(false)} variant="outline" size="sm">
          Fechar Debug
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Debug Turmas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Turmas (de profiles)</CardTitle>
          </CardHeader>
          <CardContent>
            {turmasLoading ? (
              <Badge variant="secondary">Carregando...</Badge>
            ) : turmasError ? (
              <div>
                <Badge variant="destructive">Erro</Badge>
                <p className="text-xs mt-2 text-red-600">
                  {turmasError.message}
                </p>
              </div>
            ) : (
              <div>
                <Badge variant="default">✓ OK</Badge>
                <p className="text-xs mt-2">
                  {turmasTest?.count || 0} turmas encontradas
                </p>
                {turmasTest?.data?.map((turma: any) => (
                  <div key={turma.codigo} className="text-xs mt-1 p-2 bg-gray-100 rounded">
                    <strong>{turma.nome}</strong>
                    <br />
                    Código: {turma.codigo}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Alunos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tabela: profiles (alunos)</CardTitle>
          </CardHeader>
          <CardContent>
            {alunosLoading ? (
              <Badge variant="secondary">Carregando...</Badge>
            ) : alunosError ? (
              <div>
                <Badge variant="destructive">Erro</Badge>
                <p className="text-xs mt-2 text-red-600">
                  {alunosError.message}
                </p>
              </div>
            ) : (
              <div>
                <Badge variant="default">✓ OK</Badge>
                <p className="text-xs mt-2">
                  {alunosTest?.count || 0} alunos encontrados
                </p>
                {alunosTest?.data?.slice(0, 3).map((aluno: any) => (
                  <div key={aluno.email} className="text-xs mt-1 p-2 bg-gray-100 rounded">
                    <strong>{aluno.nome}</strong>
                    <br />
                    Email: {aluno.email}
                    <br />
                    Turma: {aluno.turma || 'N/A'}
                    <br />
                    Código: {aluno.turma_codigo || 'N/A'}
                    <br />
                    Ativo: {aluno.ativo ? '✓' : '✗'}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Inbox */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tabelas: inbox_*</CardTitle>
          </CardHeader>
          <CardContent>
            {inboxLoading ? (
              <Badge variant="secondary">Carregando...</Badge>
            ) : inboxError ? (
              <div>
                <Badge variant="destructive">Erro</Badge>
                <p className="text-xs mt-2 text-red-600">
                  {inboxError.message}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Badge variant={inboxTest?.messages.error ? "destructive" : "default"}>
                    inbox_messages: {inboxTest?.messages.error ? 'Erro' : '✓'}
                  </Badge>
                  {inboxTest?.messages.error && (
                    <p className="text-xs text-red-600">{inboxTest.messages.error.message}</p>
                  )}
                </div>
                <div>
                  <Badge variant={inboxTest?.recipients.error ? "destructive" : "default"}>
                    inbox_recipients: {inboxTest?.recipients.error ? 'Erro' : '✓'}
                  </Badge>
                  {inboxTest?.recipients.error && (
                    <p className="text-xs text-red-600">{inboxTest.recipients.error.message}</p>
                  )}
                </div>
                {inboxTest?.messages.data && (
                  <p className="text-xs">
                    {inboxTest.messages.data.length} mensagens
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-yellow-700">
        <strong>Instruções:</strong>
        <ul className="list-disc list-inside mt-1">
          <li>Verifique o console do navegador para logs detalhados</li>
          <li>Se "turmas" der erro, não há alunos com turmas definidas</li>
          <li>Se "alunos" estiver vazio, não há dados de teste</li>
          <li>Se "inbox_*" der erro, execute a migração SQL</li>
        </ul>
      </div>
    </div>
  );
}