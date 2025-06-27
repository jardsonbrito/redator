
-- Habilitar RLS nas tabelas principais
ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública para usuários não autenticados
CREATE POLICY "Permitir leitura pública de temas" 
ON public.temas FOR SELECT 
USING (true);

CREATE POLICY "Permitir leitura pública de redações" 
ON public.redacoes FOR SELECT 
USING (true);

CREATE POLICY "Permitir leitura pública de vídeos" 
ON public.videos FOR SELECT 
USING (true);

-- Políticas para administradores (inserção, atualização, exclusão)
CREATE POLICY "Admins podem inserir temas" 
ON public.temas FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND email = 'jardsonbrito@gmail.com'
));

CREATE POLICY "Admins podem atualizar temas" 
ON public.temas FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND email = 'jardsonbrito@gmail.com'
));

CREATE POLICY "Admins podem inserir redações" 
ON public.redacoes FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND email = 'jardsonbrito@gmail.com'
));

CREATE POLICY "Admins podem atualizar redações" 
ON public.redacoes FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND email = 'jardsonbrito@gmail.com'
));

CREATE POLICY "Admins podem inserir vídeos" 
ON public.videos FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND email = 'jardsonbrito@gmail.com'
));

CREATE POLICY "Admins podem atualizar vídeos" 
ON public.videos FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND email = 'jardsonbrito@gmail.com'
));

-- Política para profiles - permitir leitura dos próprios dados
CREATE POLICY "Usuários podem ver seus próprios perfis" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Permitir inserção automática de perfis via trigger
CREATE POLICY "Permitir inserção de perfis" 
ON public.profiles FOR INSERT 
WITH CHECK (true);
