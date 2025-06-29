
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view aula modules" ON public.aula_modules;
DROP POLICY IF EXISTS "Anyone can view aulas" ON public.aulas;
DROP POLICY IF EXISTS "Admins can manage aula modules" ON public.aula_modules;
DROP POLICY IF EXISTS "Admins can manage aulas" ON public.aulas;

-- Recreate policies with correct permissions
-- Allow public read access to modules and aulas
CREATE POLICY "Public can view aula modules" ON public.aula_modules 
  FOR SELECT USING (ativo = true);

CREATE POLICY "Public can view aulas" ON public.aulas 
  FOR SELECT USING (ativo = true);

-- Admin policies for managing aula modules
CREATE POLICY "Admins can view all aula modules" ON public.aula_modules 
  FOR SELECT USING (public.is_main_admin());

CREATE POLICY "Admins can insert aula modules" ON public.aula_modules 
  FOR INSERT WITH CHECK (public.is_main_admin());

CREATE POLICY "Admins can update aula modules" ON public.aula_modules 
  FOR UPDATE USING (public.is_main_admin());

CREATE POLICY "Admins can delete aula modules" ON public.aula_modules 
  FOR DELETE USING (public.is_main_admin());

-- Admin policies for managing aulas
CREATE POLICY "Admins can view all aulas" ON public.aulas 
  FOR SELECT USING (public.is_main_admin());

CREATE POLICY "Admins can insert aulas" ON public.aulas 
  FOR INSERT WITH CHECK (public.is_main_admin());

CREATE POLICY "Admins can update aulas" ON public.aulas 
  FOR UPDATE USING (public.is_main_admin());

CREATE POLICY "Admins can delete aulas" ON public.aulas 
  FOR DELETE USING (public.is_main_admin());

-- Ensure the foreign key constraint exists
ALTER TABLE public.aulas 
  DROP CONSTRAINT IF EXISTS aulas_module_id_fkey;

ALTER TABLE public.aulas 
  ADD CONSTRAINT aulas_module_id_fkey 
  FOREIGN KEY (module_id) REFERENCES public.aula_modules(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aulas_module_id ON public.aulas(module_id);
CREATE INDEX IF NOT EXISTS idx_aulas_ativo ON public.aulas(ativo);
CREATE INDEX IF NOT EXISTS idx_aula_modules_tipo ON public.aula_modules(tipo);
CREATE INDEX IF NOT EXISTS idx_aula_modules_ordem ON public.aula_modules(ordem);

-- Update the modules with better descriptions if needed
UPDATE public.aula_modules SET descricao = 'Demonstrar domínio da modalidade escrita formal da língua portuguesa' WHERE nome = 'Competência 1';
UPDATE public.aula_modules SET descricao = 'Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento' WHERE nome = 'Competência 2';
UPDATE public.aula_modules SET descricao = 'Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos' WHERE nome = 'Competência 3';
UPDATE public.aula_modules SET descricao = 'Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação' WHERE nome = 'Competência 4';
UPDATE public.aula_modules SET descricao = 'Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos' WHERE nome = 'Competência 5';
UPDATE public.aula_modules SET descricao = 'Participe das aulas ao vivo com o professor' WHERE nome = 'Aula ao vivo';
