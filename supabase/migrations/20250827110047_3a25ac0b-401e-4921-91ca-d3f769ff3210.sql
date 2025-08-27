-- Create live class attendance table
CREATE TABLE IF NOT EXISTS public.live_class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('presente', 'ausente')),
  marked_via TEXT DEFAULT 'registrar_entrada',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- Add foreign key to aulas_virtuais (live class sessions)
ALTER TABLE public.live_class_attendance
  ADD CONSTRAINT fk_lca_session
  FOREIGN KEY (session_id) REFERENCES public.aulas_virtuais(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lca_session ON public.live_class_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_lca_user ON public.live_class_attendance(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $$;

DROP TRIGGER IF EXISTS trg_lca_updated_at ON public.live_class_attendance;
CREATE TRIGGER trg_lca_updated_at
  BEFORE UPDATE ON public.live_class_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

-- Enable RLS
ALTER TABLE public.live_class_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "read_own_attendance"
  ON public.live_class_attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "upsert_own_attendance"
  ON public.live_class_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_attendance"
  ON public.live_class_attendance FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin access policy
CREATE POLICY "admin_full_access"
  ON public.live_class_attendance FOR ALL
  USING (public.is_main_admin())
  WITH CHECK (public.is_main_admin());

-- RPC function to register attendance
CREATE OR REPLACE FUNCTION public.registrar_entrada_live_class(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  -- Get session times
  SELECT 
    (data_aula::text || ' ' || horario_inicio::text)::timestamptz,
    (data_aula::text || ' ' || horario_fim::text)::timestamptz
  INTO v_start, v_end
  FROM public.aulas_virtuais
  WHERE id = p_session_id AND ativo = true;

  IF v_start IS NULL THEN
    RAISE EXCEPTION 'Sessão não encontrada ou inativa';
  END IF;

  -- Optional time window validation (10 min before start to 15 min after end)
  IF v_now < v_start - INTERVAL '10 minutes' OR v_now > v_end + INTERVAL '15 minutes' THEN
    RAISE EXCEPTION 'Fora do horário permitido para registro de presença';
  END IF;

  -- Insert or update attendance
  INSERT INTO public.live_class_attendance (session_id, user_id, status, marked_via)
  VALUES (p_session_id, auth.uid(), 'presente', 'registrar_entrada')
  ON CONFLICT (session_id, user_id)
  DO UPDATE SET 
    status = 'presente', 
    marked_via = 'registrar_entrada', 
    updated_at = now();
END $$;