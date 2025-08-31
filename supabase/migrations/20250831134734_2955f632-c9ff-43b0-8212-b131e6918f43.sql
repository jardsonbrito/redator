-- Criar jogo "Insegurança Alimentar - Correção Linguística"
INSERT INTO games (
  id,
  title,
  template,
  difficulty,
  competencies,
  turmas_autorizadas,
  allow_visitor,
  status,
  created_by,
  tags
) VALUES (
  gen_random_uuid(),
  'Insegurança Alimentar - Correção Linguística',
  'desvios',
  3,
  ARRAY[1, 2, 3, 4, 5],
  ARRAY['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C'],
  true,
  'published',
  (SELECT id FROM admin_users WHERE email = 'jardsonbrito@gmail.com' LIMIT 1),
  ARRAY['ortografia', 'acentuacao', 'concordancia', 'regencia', 'sintaxe']
);

-- Obter o ID do jogo criado para usar nos níveis
WITH new_game AS (
  SELECT id FROM games WHERE title = 'Insegurança Alimentar - Correção Linguística' LIMIT 1
),
-- Criar os 5 níveis do jogo
level_data AS (
  SELECT 
    new_game.id as game_id,
    level_info.level_index,
    level_info.title,
    level_info.payload
  FROM new_game,
  (VALUES 
    (1, 'Muito Fácil - Ortografia', '{
      "sentences": [
        {
          "text": "A insegurança alimentar afeta milhôes de brasileiros nas periferias urbanas.",
          "correct": "A insegurança alimentar afeta milhões de brasileiros nas periferias urbanas.",
          "error_word": "milhôes",
          "correct_word": "milhões",
          "distractors": ["milhõis", "milhãos", "milhõens", "milhõenss"]
        },
        {
          "text": "A fome é uma realidade visivel em várias regiões periféricas.",
          "correct": "A fome é uma realidade visível em várias regiões periféricas.",
          "error_word": "visivel",
          "correct_word": "visível",
          "distractors": ["visivél", "vizivel", "vizível", "visiviu"]
        }
      ]
    }'::jsonb),
    (2, 'Fácil - Acentuação', '{
      "sentences": [
        {
          "text": "As famílias de baixa renda sofrem sem acesso à alimentação adequada e energica.",
          "correct": "As famílias de baixa renda sofrem sem acesso à alimentação adequada e energética.",
          "error_word": "energica",
          "correct_word": "energética",
          "distractors": ["energetica", "enérgetica", "energétika", "energêtica"]
        },
        {
          "text": "O acesso restrito a alimentos básicos compromete a saúde pública e gera deficil no aprendizado.",
          "correct": "O acesso restrito a alimentos básicos compromete a saúde pública e gera déficit no aprendizado.",
          "error_word": "deficil",
          "correct_word": "déficit",
          "distractors": ["deficil", "defícit", "deficít", "defizit"]
        }
      ]
    }'::jsonb),
    (3, 'Médio - Concordância', '{
      "sentences": [
        {
          "text": "As dificuldades no acesso a alimentos saudável prejudica o desenvolvimento infantil.",
          "correct": "As dificuldades no acesso a alimentos saudáveis prejudicam o desenvolvimento infantil.",
          "error_word": "alimentos saudável prejudica",
          "correct_word": "alimentos saudáveis prejudicam",
          "distractors": ["alimentos saudável prejudica", "alimento saudável prejudicam", "alimento saudáveis prejudica", "alimentos saudável prejudicam"]
        },
        {
          "text": "A má alimentação e a falta de nutrientes compromete a aprendizagem dos estudantes.",
          "correct": "A má alimentação e a falta de nutrientes comprometem a aprendizagem dos estudantes.",
          "error_word": "compromete",
          "correct_word": "comprometem",
          "distractors": ["compromete", "comprometer", "comprometia", "comprometia-se"]
        }
      ]
    }'::jsonb),
    (4, 'Difícil - Regência', '{
      "sentences": [
        {
          "text": "O governo deve priorizar políticas públicas que visem no combate à insegurança alimentar.",
          "correct": "O governo deve priorizar políticas públicas que visem ao combate à insegurança alimentar.",
          "error_word": "visem no combate",
          "correct_word": "visem ao combate",
          "distractors": ["visem no combate", "visem pelo combate", "visem contra o combate", "visem sobre o combate"]
        },
        {
          "text": "As autoridades precisam sensibilizar a população quanto no impacto da fome.",
          "correct": "As autoridades precisam sensibilizar a população quanto ao impacto da fome.",
          "error_word": "quanto no impacto",
          "correct_word": "quanto ao impacto",
          "distractors": ["quanto no impacto", "quanto de impacto", "quanto sobre o impacto", "quanto pelo impacto"]
        }
      ]
    }'::jsonb),
    (5, 'Muito Difícil - Estrutura Sintática', '{
      "sentences": [
        {
          "text": "É necessário políticas eficazes para que reduza a fome nas periferias.",
          "correct": "É necessário implementar políticas eficazes para que se reduza a fome nas periferias.",
          "error_word": "É necessário políticas eficazes para que reduza a fome nas periferias.",
          "correct_word": "É necessário implementar políticas eficazes para que se reduza a fome nas periferias.",
          "distractors": ["É necessário políticas eficazes para que reduza a fome nas periferias.", "É necessários políticas eficazes para que reduz a fome", "É necessário políticas eficazes para que reduzem a fome", "É necessário políticas eficazes para que reduza-se a fome"]
        },
        {
          "text": "Os programas sociais quando bem planejados garante que menos famílias passem fome.",
          "correct": "Os programas sociais, quando bem planejados, garantem que menos famílias passem fome.",
          "error_word": "Os programas sociais quando bem planejados garante que menos famílias passem fome.",
          "correct_word": "Os programas sociais, quando bem planejados, garantem que menos famílias passem fome.",
          "distractors": ["Os programas sociais quando bem planejados garante que menos famílias passem fome.", "Os programas sociais quando bem planejados garantia que menos famílias passem fome", "Os programas sociais quando bem planejados garantiu que menos famílias passem fome", "Os programas sociais quando bem planejados garantirá que menos famílias passem fome"]
        }
      ]
    }'::jsonb)
  ) AS level_info(level_index, title, payload)
)
INSERT INTO game_levels (
  game_id,
  level_index,
  title,
  payload,
  status
)
SELECT 
  game_id,
  level_index,
  title,
  payload,
  'published'
FROM level_data;