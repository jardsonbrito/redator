-- Verificar e criar índices para otimizar consultas das aulas virtuais
CREATE INDEX IF NOT EXISTS idx_aulas_virtuais_ativo_data ON public.aulas_virtuais(ativo, data_aula) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_aulas_virtuais_visitante ON public.aulas_virtuais(permite_visitante, data_aula) WHERE permite_visitante = true;
CREATE INDEX IF NOT EXISTS idx_presenca_aulas_lookup ON public.presenca_aulas(aula_id, email_aluno, tipo_registro);

-- Garantir que os gatilhos de atualização estejam funcionando corretamente
CREATE OR REPLACE FUNCTION public.update_aulas_virtuais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar gatilho se não existir
DROP TRIGGER IF EXISTS update_aulas_virtuais_updated_at_trigger ON public.aulas_virtuais;
CREATE TRIGGER update_aulas_virtuais_updated_at_trigger
  BEFORE UPDATE ON public.aulas_virtuais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_aulas_virtuais_updated_at();