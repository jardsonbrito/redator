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
CREATE INDEX idx_inbox_messages_created_by ON inbox_messages(created_by);
CREATE INDEX idx_inbox_messages_created_at ON inbox_messages(created_at);
CREATE INDEX idx_inbox_recipients_message_id ON inbox_recipients(message_id);
CREATE INDEX idx_inbox_recipients_student_email ON inbox_recipients(student_email);
CREATE INDEX idx_inbox_recipients_status ON inbox_recipients(status);

-- RLS (Row Level Security)
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_recipients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para inbox_messages
CREATE POLICY "Admin can view all inbox messages" ON inbox_messages
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can insert inbox messages" ON inbox_messages
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update inbox messages" ON inbox_messages
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can delete inbox messages" ON inbox_messages
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Políticas RLS para inbox_recipients
CREATE POLICY "Admin can view all inbox recipients" ON inbox_recipients
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can insert inbox recipients" ON inbox_recipients
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update inbox recipients" ON inbox_recipients
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can delete inbox recipients" ON inbox_recipients
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Política para estudantes visualizarem apenas suas próprias mensagens
CREATE POLICY "Students can view their own inbox messages" ON inbox_recipients
    FOR SELECT USING (student_email = auth.jwt() ->> 'email');

CREATE POLICY "Students can update their own inbox message status" ON inbox_recipients
    FOR UPDATE USING (student_email = auth.jwt() ->> 'email');