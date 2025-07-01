-- Corrigir políticas RLS para aulas e exercicios
DROP POLICY IF EXISTS "Anyone can view aulas" ON public.aulas;
DROP POLICY IF EXISTS "Anyone can insert aulas" ON public.aulas;
DROP POLICY IF EXISTS "Main admin can manage all aulas" ON public.aulas;

DROP POLICY IF EXISTS "Anyone can view exercicios" ON public.exercicios;
DROP POLICY IF EXISTS "Anyone can insert exercicios" ON public.exercicios;
DROP POLICY IF EXISTS "Main admin can manage all exercicios" ON public.exercicios;

-- Políticas corrigidas para aulas
CREATE POLICY "Public can view aulas" ON public.aulas FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert aulas" ON public.aulas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can manage aulas" ON public.aulas FOR ALL TO authenticated USING (public.is_main_admin()) WITH CHECK (public.is_main_admin());

-- Políticas corrigidas para exercicios
CREATE POLICY "Public can view exercicios" ON public.exercicios FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert exercicios" ON public.exercicios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can manage exercicios" ON public.exercicios FOR ALL TO authenticated USING (public.is_main_admin()) WITH CHECK (public.is_main_admin());