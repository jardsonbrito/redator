
-- Adicionar campo de créditos na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN creditos INTEGER DEFAULT 5;

-- Atualizar todos os alunos existentes com 5 créditos iniciais
UPDATE public.profiles 
SET creditos = 5 
WHERE creditos IS NULL;

-- Criar função para consumir créditos de forma segura
CREATE OR REPLACE FUNCTION public.consume_credit_safe(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  new_credits INTEGER;
BEGIN
  -- Get current credits with row lock
  SELECT creditos INTO current_credits 
  FROM public.profiles 
  WHERE id = target_user_id 
  FOR UPDATE;
  
  -- Check if user exists and has credits
  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF current_credits <= 0 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Update credits atomically
  new_credits := current_credits - 1;
  UPDATE public.profiles 
  SET creditos = new_credits, updated_at = now()
  WHERE id = target_user_id;
  
  RETURN new_credits;
END;
$$;

-- Criar função para adicionar/remover créditos pelo admin
CREATE OR REPLACE FUNCTION public.add_credits_safe(target_user_id uuid, credit_amount integer, admin_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  new_credits INTEGER;
BEGIN
  -- Verify admin permissions
  IF NOT public.is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Validate input
  IF credit_amount = 0 THEN
    RAISE EXCEPTION 'Credit amount cannot be zero';
  END IF;
  
  -- Get current credits with row lock
  SELECT creditos INTO current_credits 
  FROM public.profiles 
  WHERE id = target_user_id 
  FOR UPDATE;
  
  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate new credits (ensure non-negative)
  new_credits := GREATEST(0, current_credits + credit_amount);
  
  -- Update credits
  UPDATE public.profiles 
  SET creditos = new_credits, updated_at = now()
  WHERE id = target_user_id;
  
  -- Add audit record
  INSERT INTO public.credit_audit (user_id, admin_id, action, old_credits, new_credits)
  VALUES (target_user_id, admin_user_id, 
    CASE WHEN credit_amount > 0 THEN 'ADD_CREDITS' ELSE 'REMOVE_CREDITS' END,
    current_credits, new_credits);
  
  RETURN TRUE;
END;
$$;

-- Criar tabela de auditoria de créditos
CREATE TABLE IF NOT EXISTS public.credit_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  admin_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  old_credits INTEGER NOT NULL,
  new_credits INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para credit_audit
ALTER TABLE public.credit_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage credit audit"
ON public.credit_audit
FOR ALL
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- Função para obter créditos por email (para alunos não autenticados)
CREATE OR REPLACE FUNCTION public.get_credits_by_email(user_email text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(creditos, 0)
  FROM public.profiles 
  WHERE email = LOWER(TRIM(user_email))
  AND user_type = 'aluno'
  LIMIT 1;
$$;
