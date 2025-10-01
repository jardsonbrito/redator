import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Database, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function InboxMigrationRunner() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const runMigration = async () => {
    setStatus('running');
    setMessage('Executando migração do sistema de inbox...');

    try {
      // SQL da migração
      const migrationSQL = `
        -- Tabela para as mensagens do Inbox
        CREATE TABLE IF NOT EXISTS inbox_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            message TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('bloqueante', 'amigavel')),
            valid_until TIMESTAMP,
            extra_link TEXT,
            extra_image TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by UUID REFERENCES admin_users(id)
        );

        -- Tabela para os destinatários das mensagens
        CREATE TABLE IF NOT EXISTS inbox_recipients (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            message_id UUID REFERENCES inbox_messages(id) ON DELETE CASCADE,
            student_email TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'lida', 'respondida')),
            response_text TEXT,
            responded_at TIMESTAMP
        );

        -- Índices para otimização
        CREATE INDEX IF NOT EXISTS idx_inbox_messages_created_by ON inbox_messages(created_by);
        CREATE INDEX IF NOT EXISTS idx_inbox_messages_created_at ON inbox_messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_inbox_recipients_message_id ON inbox_recipients(message_id);
        CREATE INDEX IF NOT EXISTS idx_inbox_recipients_student_email ON inbox_recipients(student_email);
        CREATE INDEX IF NOT EXISTS idx_inbox_recipients_status ON inbox_recipients(status);

        -- RLS (Row Level Security)
        ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE inbox_recipients ENABLE ROW LEVEL SECURITY;

        -- Políticas RLS para inbox_messages
        DROP POLICY IF EXISTS "Admin can view all inbox messages" ON inbox_messages;
        CREATE POLICY "Admin can view all inbox messages" ON inbox_messages
            FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

        DROP POLICY IF EXISTS "Admin can insert inbox messages" ON inbox_messages;
        CREATE POLICY "Admin can insert inbox messages" ON inbox_messages
            FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

        DROP POLICY IF EXISTS "Admin can update inbox messages" ON inbox_messages;
        CREATE POLICY "Admin can update inbox messages" ON inbox_messages
            FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

        DROP POLICY IF EXISTS "Admin can delete inbox messages" ON inbox_messages;
        CREATE POLICY "Admin can delete inbox messages" ON inbox_messages
            FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

        -- Políticas RLS para inbox_recipients
        DROP POLICY IF EXISTS "Admin can view all inbox recipients" ON inbox_recipients;
        CREATE POLICY "Admin can view all inbox recipients" ON inbox_recipients
            FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

        DROP POLICY IF EXISTS "Admin can insert inbox recipients" ON inbox_recipients;
        CREATE POLICY "Admin can insert inbox recipients" ON inbox_recipients
            FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

        DROP POLICY IF EXISTS "Admin can update inbox recipients" ON inbox_recipients;
        CREATE POLICY "Admin can update inbox recipients" ON inbox_recipients
            FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

        DROP POLICY IF EXISTS "Admin can delete inbox recipients" ON inbox_recipients;
        CREATE POLICY "Admin can delete inbox recipients" ON inbox_recipients
            FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

        -- Política para estudantes visualizarem apenas suas próprias mensagens
        DROP POLICY IF EXISTS "Students can view their own inbox messages" ON inbox_recipients;
        CREATE POLICY "Students can view their own inbox messages" ON inbox_recipients
            FOR SELECT USING (student_email = auth.jwt() ->> 'email');

        DROP POLICY IF EXISTS "Students can update their own inbox message status" ON inbox_recipients;
        CREATE POLICY "Students can update their own inbox message status" ON inbox_recipients
            FOR UPDATE USING (student_email = auth.jwt() ->> 'email');
      `;

      // Verificar se as tabelas já existem
      try {
        const { data: existingMessages } = await supabase
          .from('inbox_messages')
          .select('count')
          .limit(1);

        const { data: existingRecipients } = await supabase
          .from('inbox_recipients')
          .select('count')
          .limit(1);

        if (existingMessages !== null && existingRecipients !== null) {
          setStatus('success');
          setMessage('As tabelas do sistema de inbox já existem e estão funcionando!');
          return;
        }
      } catch (error) {
        // As tabelas não existem, prosseguir com a criação manual
        console.log('Tabelas não existem, seria necessário executar a migração via Supabase CLI');
      }

      setStatus('error');
      setMessage('Para criar as tabelas, execute a migração via CLI: supabase db reset ou supabase migration up');
      return;

      // Verificar se as tabelas foram criadas
      const { data: messagesData, error: messagesError } = await supabase
        .from('inbox_messages')
        .select('count')
        .limit(1);

      const { data: recipientsData, error: recipientsError } = await supabase
        .from('inbox_recipients')
        .select('count')
        .limit(1);

      if (messagesError || recipientsError) {
        setStatus('error');
        setMessage('Erro ao verificar tabelas criadas');
        return;
      }

      setStatus('success');
      setMessage('Migração executada com sucesso! As tabelas do sistema de inbox foram criadas.');

    } catch (error) {
      console.error('Erro na migração:', error);
      setStatus('error');
      setMessage(`Erro na migração: ${error}`);
    }
  };

  const createTestData = async () => {
    setStatus('running');
    setMessage('Criando dados de teste...');

    try {
      // Buscar admin para criar mensagens
      const { data: adminUser } = await supabase.auth.getUser();

      if (!adminUser?.user) {
        setStatus('error');
        setMessage('Usuário admin não encontrado');
        return;
      }

      // Buscar admin_users
      const { data: admins } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);

      if (!admins || admins.length === 0) {
        setStatus('error');
        setMessage('Nenhum admin encontrado na tabela admin_users');
        return;
      }

      const adminId = admins[0].id;

      // Criar mensagem amigável de teste
      const { data: mensagemAmigavel, error: amigavelError } = await supabase
        .from('inbox_messages')
        .insert({
          message: '🎉 Bem-vindo ao sistema de inbox! Esta é uma mensagem amigável de teste. Você pode marcar como lida ou visualizar no modal.',
          type: 'amigavel',
          valid_until: null,
          extra_link: 'https://redatororiginal.com',
          created_by: adminId
        })
        .select()
        .single();

      if (amigavelError) {
        setStatus('error');
        setMessage(`Erro ao criar mensagem amigável: ${amigavelError.message}`);
        return;
      }

      // Criar mensagem bloqueante de teste
      const { data: mensagemBloqueante, error: bloqueanteError } = await supabase
        .from('inbox_messages')
        .insert({
          message: '⚠️ ATENÇÃO: Esta é uma mensagem bloqueante de teste! Você precisa responder para continuar navegando. Esta funcionalidade garante que mensagens importantes sejam vistas.',
          type: 'bloqueante',
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          extra_link: 'https://redatororiginal.com/suporte',
          created_by: adminId
        })
        .select()
        .single();

      if (bloqueanteError) {
        setStatus('error');
        setMessage(`Erro ao criar mensagem bloqueante: ${bloqueanteError.message}`);
        return;
      }

      // Buscar alguns alunos para enviar as mensagens
      const { data: alunos } = await supabase
        .from('profiles')
        .select('email, nome, turma')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .limit(3);

      if (!alunos || alunos.length === 0) {
        // Criar alunos de teste se não existirem
        const { error: createAlunosError } = await supabase
          .from('profiles')
          .insert([
            {
              email: 'aluno1@teste.com',
              nome: 'João Silva',
              user_type: 'aluno',
              ativo: true,
              turma: 'Turma A - 2024',
              turma_codigo: 'TRA2024'
            },
            {
              email: 'aluno2@teste.com',
              nome: 'Maria Santos',
              user_type: 'aluno',
              ativo: true,
              turma: 'Turma A - 2024',
              turma_codigo: 'TRA2024'
            },
            {
              email: 'aluno3@teste.com',
              nome: 'Pedro Oliveira',
              user_type: 'aluno',
              ativo: true,
              turma: 'Turma B - 2024',
              turma_codigo: 'TRB2024'
            }
          ]);

        if (createAlunosError) {
          setStatus('error');
          setMessage(`Erro ao criar alunos de teste: ${createAlunosError.message}`);
          return;
        }

        // Buscar novamente os alunos criados
        const { data: novosAlunos } = await supabase
          .from('profiles')
          .select('email, nome, turma')
          .eq('user_type', 'aluno')
          .eq('ativo', true)
          .limit(3);

        if (!novosAlunos || novosAlunos.length === 0) {
          setStatus('error');
          setMessage('Erro ao buscar alunos criados.');
          return;
        }

        setMessage('Alunos de teste criados! Prosseguindo com as mensagens...');
      }

      // Criar destinatários para mensagem amigável
      const destinatariosAmigavel = alunos.slice(0, 2).map(aluno => ({
        message_id: mensagemAmigavel.id,
        student_email: aluno.email,
        status: 'pendente'
      }));

      const { error: recipientsAmigavelError } = await supabase
        .from('inbox_recipients')
        .insert(destinatariosAmigavel);

      if (recipientsAmigavelError) {
        setStatus('error');
        setMessage(`Erro ao criar destinatários da mensagem amigável: ${recipientsAmigavelError.message}`);
        return;
      }

      // Criar destinatário para mensagem bloqueante
      const { error: recipientBloqueanteError } = await supabase
        .from('inbox_recipients')
        .insert({
          message_id: mensagemBloqueante.id,
          student_email: alunos[0].email,
          status: 'pendente'
        });

      if (recipientBloqueanteError) {
        setStatus('error');
        setMessage(`Erro ao criar destinatário da mensagem bloqueante: ${recipientBloqueanteError.message}`);
        return;
      }

      setStatus('success');
      setMessage(`Dados de teste criados com sucesso! ${destinatariosAmigavel.length + 1} mensagens enviadas para alunos.`);

    } catch (error) {
      setStatus('error');
      setMessage(`Erro ao criar dados de teste: ${error}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Sistema de Inbox - Configuração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Execute a migração para criar as tabelas necessárias do sistema de inbox.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={runMigration}
              disabled={status === 'running'}
              className="flex items-center gap-2"
            >
              {status === 'running' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Executar Migração
            </Button>

            <Button
              onClick={createTestData}
              disabled={status === 'running'}
              variant="outline"
              className="flex items-center gap-2"
            >
              {status === 'running' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Criar Dados de Teste
            </Button>
          </div>
        </div>

        {message && (
          <Alert className={status === 'success' ? 'border-green-200' : status === 'error' ? 'border-red-200' : 'border-blue-200'}>
            {status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
            {status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            <AlertDescription className="ml-2">
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Funcionalidades do sistema:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Mensagens amigáveis: aparecem como notificações não intrusivas</li>
            <li>Mensagens bloqueantes: impedem navegação até serem respondidas</li>
            <li>Ícone de notificação no header com contador</li>
            <li>Modal completo para visualizar todas as mensagens</li>
            <li>Interface administrativa para envio de mensagens</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}