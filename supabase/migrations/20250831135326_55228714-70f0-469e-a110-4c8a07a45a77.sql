-- Corrigir a estrutura dos dados do jogo "Insegurança Alimentar - Correção Linguística"
-- Deletar os níveis atuais e recriar com a estrutura correta

DELETE FROM game_levels WHERE game_id IN (
  SELECT id FROM games WHERE title = 'Insegurança Alimentar - Correção Linguística'
);

-- Recriar os níveis com a estrutura de dados correta para o template "desvios"
WITH game_data AS (
  SELECT id FROM games WHERE title = 'Insegurança Alimentar - Correção Linguística' LIMIT 1
),
level_data AS (
  SELECT 
    game_data.id as game_id,
    level_info.level_index,
    level_info.title,
    level_info.payload
  FROM game_data,
  (VALUES 
    (1, 'Muito Fácil - Ortografia', '{
      "items": [
        {
          "incorrect": "A insegurança alimentar afeta milhôes de brasileiros nas periferias urbanas.",
          "correct": "A insegurança alimentar afeta milhões de brasileiros nas periferias urbanas.",
          "explanation": "A palavra milhões deve ter til no oe para formar o ditongo nasal."
        },
        {
          "incorrect": "A fome é uma realidade visivel em várias regiões periféricas.",
          "correct": "A fome é uma realidade visível em várias regiões periféricas.",
          "explanation": "Palavras paroxítonas terminadas em L são acentuadas."
        }
      ]
    }'::jsonb),
    (2, 'Fácil - Acentuação', '{
      "items": [
        {
          "incorrect": "As famílias de baixa renda sofrem sem acesso à alimentação adequada e energica.",
          "correct": "As famílias de baixa renda sofrem sem acesso à alimentação adequada e energética.",
          "explanation": "Proparoxítonas são sempre acentuadas."
        },
        {
          "incorrect": "O acesso restrito a alimentos básicos compromete a saúde pública e gera deficil no aprendizado.",
          "correct": "O acesso restrito a alimentos básicos compromete a saúde pública e gera déficit no aprendizado.",
          "explanation": "Proparoxítonas são sempre acentuadas."
        }
      ]
    }'::jsonb),
    (3, 'Médio - Concordância', '{
      "items": [
        {
          "incorrect": "As dificuldades no acesso a alimentos saudável prejudica o desenvolvimento infantil.",
          "correct": "As dificuldades no acesso a alimentos saudáveis prejudicam o desenvolvimento infantil.",
          "explanation": "O adjetivo deve concordar em número com o substantivo (alimentos), e o verbo com o sujeito (dificuldades)."
        },
        {
          "incorrect": "A má alimentação e a falta de nutrientes compromete a aprendizagem dos estudantes.",
          "correct": "A má alimentação e a falta de nutrientes comprometem a aprendizagem dos estudantes.",
          "explanation": "Sujeito composto com conectivo E exige verbo no plural."
        }
      ]
    }'::jsonb),
    (4, 'Difícil - Regência', '{
      "items": [
        {
          "incorrect": "O governo deve priorizar políticas públicas que visem no combate à insegurança alimentar.",
          "correct": "O governo deve priorizar políticas públicas que visem ao combate à insegurança alimentar.",
          "explanation": "O verbo visar (ter como objetivo) é transitivo indireto e rege a preposição A."
        },
        {
          "incorrect": "As autoridades precisam sensibilizar a população quanto no impacto da fome.",
          "correct": "As autoridades precisam sensibilizar a população quanto ao impacto da fome.",
          "explanation": "A locução quanto a rege a preposição A."
        }
      ]
    }'::jsonb),
    (5, 'Muito Difícil - Estrutura Sintática', '{
      "items": [
        {
          "incorrect": "É necessário políticas eficazes para que reduza a fome nas periferias.",
          "correct": "É necessário implementar políticas eficazes para que se reduza a fome nas periferias.",
          "explanation": "A expressão é necessário exige um verbo no infinitivo quando seguida de substantivo plural."
        },
        {
          "incorrect": "Os programas sociais quando bem planejados garante que menos famílias passem fome.",
          "correct": "Os programas sociais, quando bem planejados, garantem que menos famílias passem fome.",
          "explanation": "O adjunto adverbial deve estar entre vírgulas e o verbo deve concordar com o sujeito."
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