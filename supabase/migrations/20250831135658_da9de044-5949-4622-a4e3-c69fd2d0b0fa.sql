-- Corrigir o jogo "Detecte-me se for capaz!" para ter múltiplas frases por nível e competência 1
UPDATE games 
SET competencies = ARRAY[1],
    title = 'Detecte-me se for capaz!'
WHERE title = 'Insegurança Alimentar - Correção Linguística';

-- Deletar níveis atuais e recriar com múltiplas frases
DELETE FROM game_levels WHERE game_id IN (
  SELECT id FROM games WHERE title = 'Detecte-me se for capaz!'
);

-- Recriar os níveis com múltiplas frases por nível
WITH game_data AS (
  SELECT id FROM games WHERE title = 'Detecte-me se for capaz!' LIMIT 1
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
          "correct": "A insegurança alimentar afeta milhões de brasileiros nas periferias urbanas."
        },
        {
          "incorrect": "A fome é uma realidade visivel em várias regiões periféricas.",
          "correct": "A fome é uma realidade visível em várias regiões periféricas."
        },
        {
          "incorrect": "Muitas familias não têm acesso a alimentos básicos.",
          "correct": "Muitas famílias não têm acesso a alimentos básicos."
        }
      ]
    }'::jsonb),
    (2, 'Fácil - Acentuação', '{
      "items": [
        {
          "incorrect": "As famílias de baixa renda sofrem sem acesso à alimentação adequada e energica.",
          "correct": "As famílias de baixa renda sofrem sem acesso à alimentação adequada e energética."
        },
        {
          "incorrect": "O acesso restrito a alimentos básicos compromete a saúde pública e gera deficil no aprendizado.",
          "correct": "O acesso restrito a alimentos básicos compromete a saúde pública e gera déficit no aprendizado."
        },
        {
          "incorrect": "A desnutrição infantil provoca sequelas permanentes no desenvolvimento fisico.",
          "correct": "A desnutrição infantil provoca sequelas permanentes no desenvolvimento físico."
        }
      ]
    }'::jsonb),
    (3, 'Médio - Concordância', '{
      "items": [
        {
          "incorrect": "As dificuldades no acesso a alimentos saudável prejudica o desenvolvimento infantil.",
          "correct": "As dificuldades no acesso a alimentos saudáveis prejudicam o desenvolvimento infantil."
        },
        {
          "incorrect": "A má alimentação e a falta de nutrientes compromete a aprendizagem dos estudantes.",
          "correct": "A má alimentação e a falta de nutrientes comprometem a aprendizagem dos estudantes."
        },
        {
          "incorrect": "Os programas sociais destinado às famílias carentes precisa ser ampliado.",
          "correct": "Os programas sociais destinados às famílias carentes precisam ser ampliados."
        }
      ]
    }'::jsonb),
    (4, 'Difícil - Regência', '{
      "items": [
        {
          "incorrect": "O governo deve priorizar políticas públicas que visem no combate à insegurança alimentar.",
          "correct": "O governo deve priorizar políticas públicas que visem ao combate à insegurança alimentar."
        },
        {
          "incorrect": "As autoridades precisam sensibilizar a população quanto no impacto da fome.",
          "correct": "As autoridades precisam sensibilizar a população quanto ao impacto da fome."
        },
        {
          "incorrect": "É necessário investir na distribuição de alimentos que chegue às periferias.",
          "correct": "É necessário investir na distribuição de alimentos que chegue às periferias."
        }
      ]
    }'::jsonb),
    (5, 'Muito Difícil - Estrutura Sintática', '{
      "items": [
        {
          "incorrect": "É necessário políticas eficazes para que reduza a fome nas periferias.",
          "correct": "É necessário implementar políticas eficazes para que se reduza a fome nas periferias."
        },
        {
          "incorrect": "Os programas sociais quando bem planejados garante que menos famílias passem fome.",
          "correct": "Os programas sociais, quando bem planejados, garantem que menos famílias passem fome."
        },
        {
          "incorrect": "Onde há investimento em educação alimentar, acontece a redução da desnutrição.",
          "correct": "Onde há investimento em educação alimentar, acontece a redução da desnutrição."
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