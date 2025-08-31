-- Criar jogo de conectivos com as questões fornecidas
DO $$
DECLARE
  game_uuid UUID;
  level_uuid UUID;
BEGIN
  -- Inserir o jogo principal
  INSERT INTO public.games (
    id,
    title,
    template,
    difficulty,
    competencies,
    tags,
    status,
    allow_visitor,
    turmas_autorizadas,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Caça-Conectivos - Acesso à Leitura',
    'conectivos',
    3,
    ARRAY[4],
    ARRAY['conectivos', 'competencia-4'],
    'published',
    false,
    ARRAY['E'],
    '00000000-0000-0000-0000-000000000000',
    now(),
    now()
  )
  RETURNING id INTO game_uuid;

  -- Inserir as 5 fases do jogo
  
  -- Fase 1: Muito fácil
  INSERT INTO public.game_levels (
    id,
    game_id,
    title,
    level_index,
    status,
    payload,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    game_uuid,
    'Fase 1 - Muito Fácil',
    0,
    'published',
    jsonb_build_object(
      'sentences', jsonb_build_array(
        jsonb_build_object(
          'id', 1,
          'nivel', 'Muito fácil',
          'text', 'Os clubes de leitura na escola devem ser mantidos, ___ aproximam os estudantes dos livros.',
          'correct_answer', 'pois',
          'wrong_answer', 'porém',
          'answers', jsonb_build_array('pois'),
          'distractors', jsonb_build_array('porém', 'entretanto', 'contudo')
        )
      )
    ),
    now(),
    now()
  );

  -- Fase 2: Fácil
  INSERT INTO public.game_levels (
    id,
    game_id,
    title,
    level_index,
    status,
    payload,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    game_uuid,
    'Fase 2 - Fácil',
    1,
    'published',
    jsonb_build_object(
      'sentences', jsonb_build_array(
        jsonb_build_object(
          'id', 2,
          'nivel', 'Fácil',
          'text', 'Os preços de capa foram reduzidos em algumas editoras; ___, para famílias de baixa renda, o livro ainda é caro.',
          'correct_answer', 'entretanto',
          'wrong_answer', 'portanto',
          'answers', jsonb_build_array('entretanto'),
          'distractors', jsonb_build_array('portanto', 'pois', 'logo')
        )
      )
    ),
    now(),
    now()
  );

  -- Fase 3: Médio
  INSERT INTO public.game_levels (
    id,
    game_id,
    title,
    level_index,
    status,
    payload,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    game_uuid,
    'Fase 3 - Médio',
    2,
    'published',
    jsonb_build_object(
      'sentences', jsonb_build_array(
        jsonb_build_object(
          'id', 3,
          'nivel', 'Médio',
          'text', '___ existam bibliotecas em muitas cidades, os acervos costumam ser desatualizados e pouco atrativos.',
          'correct_answer', 'embora',
          'wrong_answer', 'logo',
          'answers', jsonb_build_array('embora'),
          'distractors', jsonb_build_array('logo', 'portanto', 'assim')
        )
      )
    ),
    now(),
    now()
  );

  -- Fase 4: Difícil
  INSERT INTO public.game_levels (
    id,
    game_id,
    title,
    level_index,
    status,
    payload,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    game_uuid,
    'Fase 4 - Difícil',
    3,
    'published',
    jsonb_build_object(
      'sentences', jsonb_build_array(
        jsonb_build_object(
          'id', 4,
          'nivel', 'Difícil',
          'text', 'O mercado editorial concentra lançamentos nos grandes centros, ___ municípios do interior carecem de livrarias.',
          'correct_answer', 'ao passo que',
          'wrong_answer', 'porque',
          'answers', jsonb_build_array('ao passo que'),
          'distractors', jsonb_build_array('porque', 'pois', 'logo')
        )
      )
    ),
    now(),
    now()
  );

  -- Fase 5: Muito difícil
  INSERT INTO public.game_levels (
    id,
    game_id,
    title,
    level_index,
    status,
    payload,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    game_uuid,
    'Fase 5 - Muito Difícil',
    4,
    'published',
    jsonb_build_object(
      'sentences', jsonb_build_array(
        jsonb_build_object(
          'id', 5,
          'nivel', 'Muito difícil',
          'text', '___ se ampliem as plataformas de e-books gratuitos, a exclusão digital impede o acesso pleno.',
          'correct_answer', 'ainda que',
          'wrong_answer', 'assim',
          'answers', jsonb_build_array('ainda que'),
          'distractors', jsonb_build_array('assim', 'portanto', 'logo')
        )
      )
    ),
    now(),
    now()
  );

END $$;