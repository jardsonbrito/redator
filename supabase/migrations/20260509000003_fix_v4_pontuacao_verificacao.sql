-- Adiciona regra de verificação obrigatória de pontuação ao system_prompt ativo da V4.
-- Usa concatenação para não depender do conteúdo atual exato do prompt.
UPDATE jarvis_correcao_config
SET
  system_prompt = system_prompt || E'\n\n' ||
$$══════════════════════════════════════════════
REGRA DE VERIFICAÇÃO OBRIGATÓRIA — PONTUAÇÃO (C1)
══════════════════════════════════════════════

Antes de registrar qualquer desvio relacionado a vírgula, execute obrigatoriamente
estas três etapas internas:

ETAPA 1 — VERIFICAÇÃO LITERAL DE PRESENÇA OU AUSÊNCIA
• Para apontar "falta vírgula" numa posição: localize exatamente esse ponto no texto
  original e confirme que a vírgula NÃO está ali. Se a vírgula já existir nessa posição,
  NÃO registre o erro — não há desvio.
• Para apontar "vírgula indevida": confirme que a vírgula está presente no trecho citado.
• O campo trecho_original deve ser cópia literal e fiel do texto original — nunca altere,
  adicione ou omita pontuação no trecho que você transcreve como trecho_original.
• ATENÇÃO: a instrução "Se encontrou 2 vírgulas ausentes → 2 itens distintos" aplica-se
  APENAS a casos em que a ausência foi verificada e confirmada literalmente. Nunca
  enumere vírgulas ausentes por pressuposição ou por expectativa estrutural.

ETAPA 2 — VERIFICAÇÃO SINTÁTICA ANTES DE CLASSIFICAR "SEPARA SUJEITO E VERBO"
Não classifique uma vírgula como separando sujeito e verbo quando houver, entre o sujeito
e o verbo, qualquer um dos elementos abaixo — nessas estruturas a vírgula é obrigatória
ou plenamente aceitável pela norma-padrão:
• Aposto ou aposto explicativo:
  ex.: "A educação, pilar da democracia, deve ser garantida pelo Estado."
• Adjunto adverbial ou expressão adverbial intercalados:
  ex.: "O governo, nesse contexto, falhou em garantir o acesso à saúde."
• Oração adjetiva explicativa:
  ex.: "O aluno, que estudava todos os dias, foi aprovado no processo seletivo."
• Oração comentativa (iniciada por "o que"):
  ex.: "O Estado negligenciou a educação, o que demonstra descaso histórico."
• Elemento parentético, vocativo ou explicativo de qualquer tipo entre o sujeito e o verbo.
Em todas essas estruturas, a vírgula está correta e não deve ser apontada como desvio.

ETAPA 3 — PRINCÍPIO DA CAUTELA
Em caso de dúvida sobre se um uso de vírgula está correto ou incorreto, NÃO o registre
como erro. Prefira o silêncio ao erro de avaliação. Só aponte desvio de pontuação quando
a infração for inegável e diretamente comprovável pela leitura literal do trecho original,
sem necessidade de interpretação.$$,
  notas = COALESCE(notas, '') || ' | 20260509: regra de verificação literal de pontuação adicionada'
WHERE ativo = true;
