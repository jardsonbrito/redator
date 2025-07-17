-- Adicionar coluna avatar_url na tabela profiles para armazenar foto de perfil
ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

-- Adicionar coluna theme_preference na tabela profiles para armazenar preferência de tema
ALTER TABLE public.profiles ADD COLUMN theme_preference TEXT DEFAULT 'light';

-- Criar bucket para avatars se não existir
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket avatars
DO $$
BEGIN
  -- Política para permitir visualização pública dos avatars
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'avatars' AND name = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'avatars');
  END IF;

  -- Política para permitir usuários fazerem upload de seu próprio avatar
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'avatars' AND name = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar" 
    ON storage.objects 
    FOR INSERT 
    WITH CHECK (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Política para permitir usuários atualizarem seu próprio avatar
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'avatars' AND name = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar" 
    ON storage.objects 
    FOR UPDATE 
    USING (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Política para permitir usuários deletarem seu próprio avatar
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'avatars' AND name = 'Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar" 
    ON storage.objects 
    FOR DELETE 
    USING (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;