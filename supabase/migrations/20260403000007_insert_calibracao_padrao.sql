-- ═══════════════════════════════════════════════════════════════
-- JARVIS - INSERIR CALIBRAÇÃO PADRÃO PARA INTRODUÇÃO
-- Migration: 20260403000007
-- Descrição: Insere calibração padrão para a subtab Introdução
--            e alguns modelos de referência exemplares
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Inserir calibração padrão para Introdução ───────────────
INSERT INTO jarvis_tutoria_calibracao (
  subtab_id,
  periodos_exatos,
  palavras_min,
  palavras_max,
  linhas_max_estimadas,
  regras_composicao,
  instrucoes_geracao,
  validacao_automatica,
  max_tentativas_geracao
)
SELECT
  id,  -- subtab_id da Introdução
  3,   -- 3 períodos exatos
  80,  -- mínimo 80 palavras
  120, -- máximo 120 palavras
  7,   -- ~7 linhas (30 linhas / 4 parágrafos)
  jsonb_build_object(
    'estrutura_obrigatoria', jsonb_build_array(
      'repertorio_interpretacao',
      'contextualizacao_brasil',
      'tese_causal'
    ),
    'coesivos_sugeridos', jsonb_build_array(
      'Segundo',
      'De acordo com',
      'Conforme',
      'Nesse contexto',
      'No Brasil',
      'Diante disso',
      'Dessa forma',
      'Portanto'
    ),
    'nivel_concisao', 'alto',
    'tom', 'formal_academico',
    'restricoes', jsonb_build_array(
      'Evitar orações muito longas ou subordinadas excessivas',
      'Preferir coordenação para maior clareza',
      'Tese deve mencionar explicitamente os 2 aspectos causais',
      'Contextualização deve mencionar Brasil de forma problematizada',
      'Repertório e interpretação devem estar integrados no mesmo período'
    )
  ),
  'Use sintaxe concisa e períodos bem articulados. Prefira períodos compostos por coordenação. A tese deve integrar os dois aspectos causais de forma clara, explícita e coesa. Evite generalizações vazias. Mantenha o tom formal acadêmico sem rebuscamento excessivo.',
  true,  -- validação automática ativada
  3      -- até 3 tentativas de regeneração
FROM jarvis_tutoria_subtabs
WHERE nome = 'introducao'
  AND modo_id = (SELECT id FROM jarvis_modos WHERE nome = 'tutoria')
ON CONFLICT (subtab_id) DO UPDATE SET
  periodos_exatos = EXCLUDED.periodos_exatos,
  palavras_min = EXCLUDED.palavras_min,
  palavras_max = EXCLUDED.palavras_max,
  linhas_max_estimadas = EXCLUDED.linhas_max_estimadas,
  regras_composicao = EXCLUDED.regras_composicao,
  instrucoes_geracao = EXCLUDED.instrucoes_geracao,
  validacao_automatica = EXCLUDED.validacao_automatica,
  max_tentativas_geracao = EXCLUDED.max_tentativas_geracao,
  atualizado_em = NOW();

-- ─── 2. Inserir modelos de referência exemplares ────────────────

-- Modelo 1: Leitura entre jovens
INSERT INTO jarvis_tutoria_modelos_referencia (
  subtab_id,
  titulo,
  tema,
  texto_modelo,
  ordem_prioridade,
  observacoes,
  tags
)
SELECT
  id,
  'Modelo 1 - Leitura entre jovens',
  'A importância da leitura para os jovens brasileiros',
  'Segundo Monteiro Lobato, um país se faz com homens e livros, evidenciando a relevância da leitura na formação crítica dos indivíduos. No Brasil, entretanto, o hábito de ler tem sido gradualmente substituído pelo consumo de conteúdos digitais fragmentados, o que compromete o desenvolvimento intelectual dos jovens. Diante disso, torna-se necessário fomentar a leitura por meio da ampliação do acesso a bibliotecas e da valorização da literatura nas escolas.',
  100, -- alta prioridade
  'Excelente concisão e integração dos elementos. Repertório (Lobato) + interpretação no 1º período. Contextualização problematizada no 2º. Tese clara com 2 aspectos no 3º.',
  ARRAY['enem', 'concisao', 'repertorio_forte']
FROM jarvis_tutoria_subtabs
WHERE nome = 'introducao'
  AND modo_id = (SELECT id FROM jarvis_modos WHERE nome = 'tutoria')
ON CONFLICT DO NOTHING;

-- Modelo 2: Desafios da educação
INSERT INTO jarvis_tutoria_modelos_referencia (
  subtab_id,
  titulo,
  tema,
  texto_modelo,
  ordem_prioridade,
  observacoes,
  tags
)
SELECT
  id,
  'Modelo 2 - Desafios da educação',
  'Os desafios da educação pública no Brasil',
  'De acordo com Paulo Freire, a educação não transforma o mundo, mas transforma as pessoas que vão transformar o mundo, destacando seu papel emancipador na sociedade. No Brasil, contudo, a educação pública enfrenta desafios estruturais, como a falta de investimentos adequados e a desvalorização dos profissionais da educação, comprometendo a qualidade do ensino. Portanto, é fundamental ampliar o financiamento educacional e valorizar a carreira docente para garantir uma formação de excelência.',
  90,
  'Boa estruturação com tese causal explícita. Nota-se a menção clara aos 2 aspectos (investimentos e valorização docente).',
  ARRAY['enem', 'educacao', 'tese_causal_clara']
FROM jarvis_tutoria_subtabs
WHERE nome = 'introducao'
  AND modo_id = (SELECT id FROM jarvis_modos WHERE nome = 'tutoria')
ON CONFLICT DO NOTHING;

-- Modelo 3: Sustentabilidade
INSERT INTO jarvis_tutoria_modelos_referencia (
  subtab_id,
  titulo,
  tema,
  texto_modelo,
  ordem_prioridade,
  observacoes,
  tags
)
SELECT
  id,
  'Modelo 3 - Sustentabilidade ambiental',
  'A importância da sustentabilidade no século XXI',
  'Conforme a Agenda 2030 da ONU, o desenvolvimento sustentável é essencial para garantir o futuro das próximas gerações, integrando crescimento econômico, justiça social e proteção ambiental. No Brasil, porém, práticas insustentáveis como o desmatamento e a exploração predatória de recursos naturais ainda prevalecem, ameaçando ecossistemas vitais. Dessa forma, é necessário fortalecer a fiscalização ambiental e promover a conscientização da população sobre práticas sustentáveis.',
  80,
  'Exemplo de repertório institucional (ONU). Contextualização brasileira com problematização. Tese apresenta 2 medidas claras.',
  ARRAY['enem', 'sustentabilidade', 'repertorio_institucional']
FROM jarvis_tutoria_subtabs
WHERE nome = 'introducao'
  AND modo_id = (SELECT id FROM jarvis_modos WHERE nome = 'tutoria')
ON CONFLICT DO NOTHING;

-- ─── 3. Verificação ─────────────────────────────────────────────
DO $$
DECLARE
  v_calibracao_count INTEGER;
  v_modelos_count INTEGER;
BEGIN
  -- Verificar calibração
  SELECT COUNT(*) INTO v_calibracao_count
  FROM jarvis_tutoria_calibracao
  WHERE subtab_id IN (
    SELECT id FROM jarvis_tutoria_subtabs WHERE nome = 'introducao'
  );

  IF v_calibracao_count = 0 THEN
    RAISE WARNING 'ATENÇÃO: Calibração padrão não foi inserida';
  ELSE
    RAISE NOTICE '✅ Calibração padrão inserida: % registro(s)', v_calibracao_count;
  END IF;

  -- Verificar modelos
  SELECT COUNT(*) INTO v_modelos_count
  FROM jarvis_tutoria_modelos_referencia
  WHERE subtab_id IN (
    SELECT id FROM jarvis_tutoria_subtabs WHERE nome = 'introducao'
  );

  RAISE NOTICE '✅ Modelos de referência inseridos: % modelo(s)', v_modelos_count;
  RAISE NOTICE '✅ Sistema de calibração pedagógica instalado com sucesso!';
END $$;

-- ─── Fim da migration ───────────────────────────────────────────
