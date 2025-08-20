-- Adicionar campos para renderização de redações digitadas
-- Tabela redacoes_enviadas
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN IF NOT EXISTS render_status text DEFAULT 'pending' CHECK (render_status IN ('pending', 'rendering', 'ready', 'error')),
ADD COLUMN IF NOT EXISTS render_image_url text,
ADD COLUMN IF NOT EXISTS thumb_url text;

-- Tabela redacoes_simulado  
ALTER TABLE public.redacoes_simulado
ADD COLUMN IF NOT EXISTS render_status text DEFAULT 'pending' CHECK (render_status IN ('pending', 'rendering', 'ready', 'error')),
ADD COLUMN IF NOT EXISTS render_image_url text,
ADD COLUMN IF NOT EXISTS thumb_url text;

-- Tabela redacoes_exercicio
ALTER TABLE public.redacoes_exercicio
ADD COLUMN IF NOT EXISTS render_status text DEFAULT 'pending' CHECK (render_status IN ('pending', 'rendering', 'ready', 'error')),
ADD COLUMN IF NOT EXISTS render_image_url text,
ADD COLUMN IF NOT EXISTS thumb_url text;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_render_status ON public.redacoes_enviadas(render_status);
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_render_status ON public.redacoes_simulado(render_status);
CREATE INDEX IF NOT EXISTS idx_redacoes_exercicio_render_status ON public.redacoes_exercicio(render_status);