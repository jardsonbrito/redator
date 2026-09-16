-- Seed: Redação comentada de exemplo para demonstração do módulo
DO $$
DECLARE
  rc_id UUID;
  texto_exemplo TEXT := 'A exclusão digital configura-se como um dos principais entraves ao desenvolvimento humano no Brasil contemporâneo. Em uma sociedade cada vez mais mediada pela tecnologia, o acesso à internet tornou-se indispensável para o exercício pleno da cidadania, o que evidencia a urgência de políticas públicas efetivas voltadas à democratização desse recurso.

Sob a perspectiva histórica, o Brasil sempre enfrentou desigualdades estruturais que dificultam o acesso equitativo a bens e serviços. Conforme aponta o filósofo Amartya Sen, o desenvolvimento humano só é alcançado quando os indivíduos dispõem de liberdades substantivas, entre elas o acesso à informação e ao conhecimento. Nesse sentido, a ausência de conectividade representa uma violação direta dessas liberdades, comprometendo a autonomia de milhões de brasileiros, especialmente das populações rurais e periféricas.

Além disso, a pandemia de COVID-19 escancarou as fraturas desse problema. Com a migração abrupta das atividades educacionais e profissionais para o ambiente virtual, aqueles sem acesso à internet foram brutalmente excluídos. Crianças não puderam estudar; trabalhadores perderam empregos; idosos ficaram isolados de serviços essenciais. O cenário evidenciou que a conectividade não é luxo, mas direito fundamental.

Portanto, para enfrentar a exclusão digital, o Estado deve agir em duas frentes complementares. Primeiro, ampliar a infraestrutura de telecomunicações em regiões remotas, por meio de parcerias público-privadas reguladas pela Anatel. Segundo, promover programas de inclusão digital nas escolas públicas, capacitando professores e distribuindo dispositivos conectados aos alunos de baixa renda. Somente assim o Brasil poderá garantir a todos o direito de participar plenamente da sociedade da informação.';
BEGIN
  -- Só insere se ainda não existir (idempotente)
  IF NOT EXISTS (
    SELECT 1 FROM public.redacoes_comentadas
    WHERE titulo = 'Análise ENEM – Democratização do Acesso à Internet no Brasil'
  ) THEN
    INSERT INTO public.redacoes_comentadas (
      titulo, modo_correcao_id, turmas_autorizadas, ativo, publicado_em, criado_em, atualizado_em
    ) VALUES (
      'Análise ENEM – Democratização do Acesso à Internet no Brasil',
      'enem',
      ARRAY['A','B','C','D','E','F','G','H','ENEM 2026'],
      true, NOW(), NOW(), NOW()
    ) RETURNING id INTO rc_id;

    INSERT INTO public.redacao_comentada_blocos
      (redacao_comentada_id, tipo, ordem, visivel, conteudo, criado_em)
    VALUES
    -- Bloco 1: Texto Original
    (rc_id, 'texto_original', 1, true,
      jsonb_build_object('texto', texto_exemplo), NOW()),

    -- Bloco 2: Competências e Pontuação ENEM
    (rc_id, 'competencias_pontuacao', 2, true,
      '{"total":880,"competencias":{"c1":{"nota":200,"comentario":"Excelente domínio da norma culta. Nenhum desvio gramatical ou ortográfico identificado."},"c2":{"nota":160,"comentario":"O texto aborda a temática de forma pertinente, porém o posicionamento do autor poderia ser mais explícito logo na introdução."},"c3":{"nota":200,"comentario":"Argumentação consistente. O uso de Amartya Sen e o exemplo da pandemia demonstram repertório sociocultural bem articulado à tese."},"c4":{"nota":160,"comentario":"Progressão textual satisfatória. O conectivo Além disso é repetitivo — varie com recursos mais sofisticados."},"c5":{"nota":160,"comentario":"Proposta com dois agentes e ações concretas, mas poderia detalhar melhor o efeito esperado na vida dos cidadãos."}}}'::jsonb,
      NOW()),

    -- Bloco 3: Comentários por Trecho (com anotações sobre o texto original)
    (rc_id, 'comentarios_trecho', 3, true,
      '{"anotacoes":[{"id":"t1","start":0,"end":91,"trecho":"A exclusão digital configura-se como um dos principais entraves ao desenvolvimento humano","comentario":"Ótima abertura temática. O uso de configura-se demonstra domínio da norma culta e já posiciona o texto no debate proposto.","tipo":"elogio","competencia":"c2"},{"id":"t2","start":471,"end":573,"trecho":"o desenvolvimento humano só é alcançado quando os indivíduos dispõem de liberdades substantivas","comentario":"Excelente uso do repertório filosófico de Amartya Sen. A referência está bem integrada ao argumento e comprova domínio de C3.","tipo":"elogio","competencia":"c3"},{"id":"t3","start":688,"end":749,"trecho":"Além disso, a pandemia de COVID-19 escancarou as fraturas desse problema","comentario":"O conectivo Além disso funciona, mas é repetitivo. Considere variar com Acrescenta-se a isso ou Soma-se a esse cenário.","tipo":"dica","competencia":"c4"},{"id":"t4","start":1085,"end":1133,"trecho":"o Estado deve agir em duas frentes complementares","comentario":"Boa articulação da proposta de intervenção. O uso de duas frentes sinaliza organização e planejamento textual.","tipo":"elogio","competencia":"c5"}]}'::jsonb,
      NOW()),

    -- Bloco 4: Comentários por Parágrafo
    (rc_id, 'comentarios_paragrafo', 4, true,
      '{"paragrafos":[{"id":"p1","numero":1,"titulo":"Introdução","comentario":"A introdução contextualiza o problema e apresenta tese clara. O posicionamento poderia ser antecipado logo na primeira frase."},{"id":"p2","numero":2,"titulo":"Desenvolvimento 1 – Perspectiva filosófica","comentario":"Parágrafo bem desenvolvido com repertório qualificado (Amartya Sen). O argumento conecta-se coerentemente à tese."},{"id":"p3","numero":3,"titulo":"Desenvolvimento 2 – Pandemia","comentario":"Excelente uso de evento contemporâneo. Os exemplos ampliam o escopo do problema. Parágrafo dinâmico e bem estruturado."},{"id":"p4","numero":4,"titulo":"Conclusão – Proposta de Intervenção","comentario":"Cita dois agentes e duas ações. Falta detalhar o efeito esperado na vida dos cidadãos, requisito para nota máxima em C5."}]}'::jsonb,
      NOW()),

    -- Bloco 5: Pontos Fortes
    (rc_id, 'pontos_fortes', 5, true,
      '{"itens":[{"id":"pf1","texto":"Domínio excepcional da norma culta — nenhum desvio gramatical identificado"},{"id":"pf2","texto":"Repertório sociocultural relevante e bem articulado (Amartya Sen, pandemia)"},{"id":"pf3","texto":"Argumentação coesa e progressão textual clara"},{"id":"pf4","texto":"Proposta de intervenção com dois agentes e ações específicas"}]}'::jsonb,
      NOW()),

    -- Bloco 6: Pontos a Melhorar
    (rc_id, 'pontos_melhoria', 6, true,
      '{"itens":[{"id":"pm1","texto":"Variar os conectivos — Além disso aparece com frequência excessiva"},{"id":"pm2","texto":"Detalhar o efeito esperado na proposta de intervenção para fortalecer C5"},{"id":"pm3","texto":"Antecipar o posicionamento do autor logo na primeira frase da introdução"},{"id":"pm4","texto":"Enriquecer a transição entre os parágrafos de desenvolvimento"}]}'::jsonb,
      NOW()),

    -- Bloco 7: Orientação de Estudo
    (rc_id, 'orientacao_estudo', 7, true,
      '{"itens":[{"id":"oe1","texto":"Estude variação de conectivos: causa/consequência, adição, concessão e explicação"},{"id":"oe2","texto":"Pratique construção de propostas com os 5 elementos: agente, ação, meio, finalidade e efeito"},{"id":"oe3","texto":"Leia os comentários oficiais do MEC sobre redações nota 1000 para entender critérios de C5"},{"id":"oe4","texto":"Treine teses mais assertivas na introdução — evite construções vagas"}]}'::jsonb,
      NOW());
  END IF;
END $$;
