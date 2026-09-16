-- =====================================================
-- MIGRAÇÃO: Sistema de Anotações do Administrador
-- Data: 2026-02-02
-- Descrição: Sistema completo de anotações para admins com suporte a texto, imagens, links e categorização
-- =====================================================

-- 1. Criar tabela de anotações do administrador
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

  -- Conteúdo da anotação
  titulo TEXT NOT NULL,
  conteudo TEXT, -- Conteúdo em texto (pode ser markdown)

  -- Metadados
  cor VARCHAR(20) DEFAULT 'default', -- Cor do card (default, yellow, blue, green, red, purple, pink)
  categoria VARCHAR(100), -- Categoria customizada
  tags TEXT[], -- Array de tags para busca

  -- Mídia
  imagens JSONB DEFAULT '[]', -- Array de objetos com URL e metadata das imagens
  -- Exemplo: [{"url": "https://...", "nome": "imagem.jpg", "tamanho": 12345}]

  -- Links
  links JSONB DEFAULT '[]', -- Array de objetos com URL e título
  -- Exemplo: [{"url": "https://...", "titulo": "Link útil", "descricao": "Descrição"}]

  -- Controle
  fixado BOOLEAN DEFAULT false, -- Notas fixadas aparecem no topo
  arquivado BOOLEAN DEFAULT false, -- Notas arquivadas ficam ocultas por padrão

  -- Timestamps
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Índices para busca eficiente
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(titulo, '') || ' ' || coalesce(conteudo, '') || ' ' || coalesce(categoria, ''))
  ) STORED
);

-- 2. Criar bucket para armazenar imagens das anotações (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-notes', 'admin-notes', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar RLS para a tabela
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de segurança - apenas admins podem acessar suas anotações
CREATE POLICY "Admins podem ver suas próprias anotações"
ON admin_notes
FOR SELECT
TO authenticated
USING (admin_id IN (SELECT id FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins podem criar anotações"
ON admin_notes
FOR INSERT
TO authenticated
WITH CHECK (admin_id IN (SELECT id FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins podem atualizar suas anotações"
ON admin_notes
FOR UPDATE
TO authenticated
USING (admin_id IN (SELECT id FROM admin_users WHERE id = auth.uid()))
WITH CHECK (admin_id IN (SELECT id FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins podem deletar suas anotações"
ON admin_notes
FOR DELETE
TO authenticated
USING (admin_id IN (SELECT id FROM admin_users WHERE id = auth.uid()));

-- 5. Políticas de storage para imagens das anotações
CREATE POLICY "Admins podem fazer upload de imagens para suas anotações"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-notes' AND
  auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY "Admins podem ver suas imagens de anotações"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'admin-notes' AND
  auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY "Admins podem deletar suas imagens de anotações"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-notes' AND
  auth.uid() IN (SELECT id FROM admin_users)
);

-- 6. Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_categoria ON admin_notes(categoria);
CREATE INDEX IF NOT EXISTS idx_admin_notes_fixado ON admin_notes(fixado) WHERE fixado = true;
CREATE INDEX IF NOT EXISTS idx_admin_notes_arquivado ON admin_notes(arquivado);
CREATE INDEX IF NOT EXISTS idx_admin_notes_criado_em ON admin_notes(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notes_search ON admin_notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_admin_notes_tags ON admin_notes USING GIN(tags);

-- 7. Trigger para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_admin_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admin_notes_timestamp ON admin_notes;
CREATE TRIGGER update_admin_notes_timestamp
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_notes_timestamp();

-- 8. Função auxiliar para busca de anotações
CREATE OR REPLACE FUNCTION buscar_admin_notes(
  p_admin_id UUID,
  p_termo_busca TEXT DEFAULT NULL,
  p_categoria TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_incluir_arquivadas BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  admin_id UUID,
  titulo TEXT,
  conteudo TEXT,
  cor VARCHAR(20),
  categoria VARCHAR(100),
  tags TEXT[],
  imagens JSONB,
  links JSONB,
  fixado BOOLEAN,
  arquivado BOOLEAN,
  criado_em TIMESTAMP WITH TIME ZONE,
  atualizado_em TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.admin_id,
    n.titulo,
    n.conteudo,
    n.cor,
    n.categoria,
    n.tags,
    n.imagens,
    n.links,
    n.fixado,
    n.arquivado,
    n.criado_em,
    n.atualizado_em
  FROM admin_notes n
  WHERE n.admin_id = p_admin_id
    AND (p_incluir_arquivadas OR n.arquivado = false)
    AND (p_termo_busca IS NULL OR n.search_vector @@ plainto_tsquery('portuguese', p_termo_busca))
    AND (p_categoria IS NULL OR n.categoria = p_categoria)
    AND (p_tags IS NULL OR n.tags && p_tags)
  ORDER BY n.fixado DESC, n.atualizado_em DESC;
END;
$$ LANGUAGE plpgsql;
