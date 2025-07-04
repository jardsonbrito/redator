
-- Adicionar campos para controle de aulas ao vivo na tabela aulas_virtuais
ALTER TABLE public.aulas_virtuais 
ADD COLUMN IF NOT EXISTS eh_aula_ao_vivo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status_transmissao TEXT DEFAULT 'agendada' CHECK (status_transmissao IN ('agendada', 'em_transmissao', 'encerrada'));

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN public.aulas_virtuais.eh_aula_ao_vivo IS 'Indica se a aula é uma transmissão ao vivo com controle de frequência';
COMMENT ON COLUMN public.aulas_virtuais.status_transmissao IS 'Status da transmissão: agendada, em_transmissao, encerrada';

-- Atualizar o trigger para incluir os novos campos
CREATE OR REPLACE FUNCTION public.update_aulas_virtuais_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$;
