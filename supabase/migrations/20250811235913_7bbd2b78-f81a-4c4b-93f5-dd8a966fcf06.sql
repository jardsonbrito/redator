-- Corrigir senha do jardsonbrito@gmail.com
UPDATE public.admin_users 
SET password_hash = '123456'
WHERE email = 'jardsonbrito@gmail.com' AND password_hash = 'temp_hash_123';