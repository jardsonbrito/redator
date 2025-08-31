-- Corrigir payloads de exemplo com dados estruturados adequados para os jogos

-- Atualizar jogos de conectivos com frases reais
UPDATE game_levels 
SET payload = jsonb_build_object(
  'sentences', jsonb_build_array(
    jsonb_build_object(
      'text', 'A insegurança alimentar nas periferias é um problema grave, ___ as políticas públicas ainda são insuficientes.',
      'answers', array['contudo', 'porém', 'entretanto'],
      'distractors', array['portanto', 'assim', 'logo'],
      'explanation', 'Conectores de oposição mostram contraste entre ideias'
    ),
    jsonb_build_object(
      'text', 'As famílias periféricas enfrentam dificuldades econômicas, ___ buscam alternativas para garantir a alimentação.',
      'answers', array['portanto', 'logo', 'assim'],
      'distractors', array['porém', 'contudo', 'todavia'],
      'explanation', 'Conectores de conclusão indicam consequência lógica'
    ),
    jsonb_build_object(
      'text', 'O acesso limitado a alimentos nutritivos ___ a falta de renda são as principais causas da insegurança alimentar.',
      'answers', array['e', 'bem como', 'além de'],
      'distractors', array['mas', 'porém', 'contudo'],
      'explanation', 'Conectores aditivos unem elementos similares'
    )
  )
)
WHERE EXISTS (
  SELECT 1 FROM games g 
  WHERE g.id = game_levels.game_id 
  AND g.template = 'conectivos'
  AND g.status = 'published'
);

-- Atualizar jogos de desvios com frases com erros reais
UPDATE game_levels 
SET payload = jsonb_build_object(
  'items', jsonb_build_array(
    jsonb_build_object(
      'incorrect', 'As família periférica sofre com a falta de alimento nutritivo.',
      'correct', 'As famílias periféricas sofrem com a falta de alimentos nutritivos.',
      'explanation', 'Erro de concordância nominal e uso inadequado do singular'
    ),
    jsonb_build_object(
      'incorrect', 'A insegurança alimentar é um problema que afeta milhões de brasileiro.',
      'correct', 'A insegurança alimentar é um problema que afeta milhões de brasileiros.',
      'explanation', 'Erro de concordância: o substantivo deve estar no plural'
    ),
    jsonb_build_object(
      'incorrect', 'Os governo precisa implementar política pública mais eficaz.',
      'correct', 'Os governos precisam implementar políticas públicas mais eficazes.',
      'explanation', 'Múltiplos erros de concordância nominal e verbal'
    )
  )
)
WHERE EXISTS (
  SELECT 1 FROM games g 
  WHERE g.id = game_levels.game_id 
  AND g.template = 'desvios'
  AND g.status = 'published'
);

-- Atualizar jogos de intervenção com slots e peças reais
UPDATE game_levels 
SET payload = jsonb_build_object(
  'slots', array[
    'Agente responsável',
    'Ação principal', 
    'Meio/modo',
    'Finalidade',
    'Detalhamento'
  ],
  'pieces', array[
    'o governo federal',
    'implementar programas de transferência de renda',
    'por meio de parcerias com organizações sociais',
    'a fim de garantir segurança alimentar',
    'priorizando famílias em situação de vulnerabilidade',
    'as secretarias municipais',
    'ampliar o acesso a alimentos básicos',
    'através de feiras populares e hortas comunitárias',
    'para reduzir a fome nas periferias',
    'com foco na educação nutricional'
  ],
  'valid_sets', jsonb_build_array(
    jsonb_build_object(
      'Agente responsável', 'o governo federal',
      'Ação principal', 'implementar programas de transferência de renda',
      'Meio/modo', 'por meio de parcerias com organizações sociais',
      'Finalidade', 'a fim de garantir segurança alimentar',
      'Detalhamento', 'priorizando famílias em situação de vulnerabilidade'
    )
  )
)
WHERE EXISTS (
  SELECT 1 FROM games g 
  WHERE g.id = game_levels.game_id 
  AND g.template = 'intervencao'
  AND g.status = 'published'
);