-- Criar bucket para redações manuscritas se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('redacoes-manuscritas', 'redacoes-manuscritas', true)
ON CONFLICT (id) DO NOTHING;