# Plano de Estudo Personalizado (PEP) — Documentação de Funcionamento

**Versão:** atual (branch main)
**Data:** abril 2026

---

## 1. O que é

O PEP é um módulo que gera automaticamente um plano de estudo individualizado para cada aluno com base no seu histórico de desempenho na plataforma. O sistema lê múltiplas fontes de dados, identifica as competências mais frágeis de forma personalizada e cria uma fila de até 3 missões sequenciais (1 ativa + 2 bloqueadas).

---

## 2. Onde aparece

| Local | Componente | O que exibe |
|---|---|---|
| Dashboard do aluno | `PlanoEstudoCard` | Card resumido com missão atual, próxima bloqueada e total concluídas |
| Página dedicada | `/plano-estudo` | Trilha completa: missão ativa detalhada + bloqueadas + histórico |
| Painel admin | `/admin/plano-estudo` | Visão individual por aluno + visão macro da turma |

---

## 3. Competências ENEM (base do sistema)

O sistema opera inteiramente sobre as 5 competências do ENEM:

| Código | Nome da missão | O que avalia |
|---|---|---|
| **C1** | Norma-padrão da língua portuguesa | Domínio da escrita formal: gramática, ortografia, pontuação e vocabulário |
| **C2** | Compreensão do tema e repertório sociocultural | Adequação ao tema, uso de repertório pertinente e estrutura dissertativa |
| **C3** | Organização e desenvolvimento argumentativo | Organização das ideias, defesa do ponto de vista de forma lógica e progressão |
| **C4** | Coesão e mecanismos linguísticos | Conectivos, coesão referencial e sequencial entre frases, períodos e parágrafos |
| **C5** | Proposta de intervenção | Proposta social detalhada, com agente, ação, finalidade e respeito aos direitos humanos |

---

## 4. Fontes de diagnóstico

O bootstrap lê 5 fontes em paralelo, limitadas aos **últimos 6 meses**:

### Fontes primárias (nota estruturada por competência)

| Fonte | Tabela | Limite | O que lê |
|---|---|---|---|
| Redações tema livre | `redacoes_enviadas` | 30 mais recentes | `nota_c1` a `nota_c5` + `elogios_pontos_atencao_corretor_1` |
| Redações de simulado | `redacoes_simulado` | 20 mais recentes | `nota_c1` a `nota_c5` + `elogios_pontos_atencao_corretor_1` |
| Redações de exercício | `redacoes_exercicio` | 20 mais recentes | `nota_c1` a `nota_c5` |

Filtro aplicado: apenas redações com `nota_total` preenchida (corrigidas).

### Fontes secundárias (sinal inferido pelo título)

| Fonte | Tabela | Limite | Condição de dificuldade |
|---|---|---|---|
| Lousas corrigidas | `lousa_resposta` | 30 mais recentes | Nota < 7 (escala 0–10) |
| Erros em quizzes | `micro_quiz_tentativas` | 50 mais recentes | `acertou = false` |

A competência é inferida pelo título da lousa ou do tópico do quiz usando correspondência por palavras-chave (ver seção 6).

### Comentários dos corretores (sinal qualitativo)

O campo `elogios_pontos_atencao_corretor_1` (presente em `redacoes_enviadas` e `redacoes_simulado`) contém o feedback textual detalhado do corretor, estruturado em seções por competência.

Formatos reconhecidos pelo parser:
- `COMPETÊNCIA I` / `Competência I – Domínio...` (algarismos romanos I a V)
- `Competência 1 – ...` (algarismos arábicos 1 a 5)

---

## 5. Como o diagnóstico é calculado

### 5.1 Detecção relativa (fontes primárias)

Para cada redação corrigida:
1. As 5 notas (C1–C5) são ordenadas da menor para a maior
2. As **2 piores** são selecionadas
3. Só são contadas se a nota for **menor que 160** (acima disso, considera-se desempenho satisfatório)
4. Cada detecção adiciona **+1** à contagem da competência e soma a nota ao acumulador

> Esse método é **intraindividual**: cada aluno é comparado consigo mesmo, não com a média da turma. Um aluno forte em C1 não terá C1 priorizada mesmo que sua nota seja 160.

### 5.2 Pesos por fonte

| Fonte | Peso por ocorrência |
|---|---|
| Redação corrigida (C1–C5) | +1,0 por competência detectada |
| Lousa com nota < 7 | +0,5 (nota convertida para escala 0–200) |
| Comentário do corretor (trecho negativo) | +0,4 (nota sintética: 80/200) |
| Erro em quiz | +0,3 (nota sintética: 40/200) |

### 5.3 Ordenação dos erros

Após acumular todos os sinais:

1. **Maior recorrência** (count total) vem primeiro
2. Em empate: **menor nota média** vem primeiro (mais urgente)
3. Apenas os **top 3** são aproveitados para gerar missões

---

## 6. Inferência de competência por título (lousas e quizzes)

O sistema usa correspondência por regex sobre o título da lousa ou tópico do quiz:

| Competência | Palavras-chave reconhecidas |
|---|---|
| C1 | ponto, vírgula, pontuação, concordância, regência, sintaxe, paralelismo, ortografia, acentuação, gramática, norma-padrão, norma culta, vocabulário, léxico, registro formal, reescrita |
| C2 | repertório, tema, sociocultural, contextualização, frase temática, dissertativa, introdução, tese da, delimitação, recorte |
| C3 | argumentação, organização, progressão, desenvolvimento, parágrafo, estrutura do texto, ponto de vista, defesa, lógico, tópico frasal, causa-efeito, contra-argumento |
| C4 | coesão, conectivos, articulação, referência, pronome, anáfora, elipse, substituição, sequencial, ligação, fluidez |
| C5 | proposta, intervenção, conclusão, agente, finalidade, efeito, direitos humanos, viabilidade |

Referência direta (`"Competência 3"`, `"Competencia 2"`) tem prioridade sobre qualquer palavra-chave.

---

## 7. Extração de feedback dos corretores

O parser de comentários funciona assim:

1. **Divide** o texto pelo padrão `Competência X` (romano ou arábico)
2. Para cada seção, verifica se há indicação **clara de problema** — os gatilhos são:
   - `Correção sugerida`, `Comentário pedagógico`
   - `incorreto`, `inadequado`, `impreciso`
   - `→ não`, `→ parcialmente`
   - `insuficiente`, `frágil`, `ausência de`, `não apresenta`
3. Extrai as **2 linhas mais informativas** (entre 25 e 220 caracteres), priorizando as que mencionam o erro explicitamente
4. **Descarta** o trecho se:
   - Começa com linguagem positiva ("A proposta é completa", "O repertório foi articulado"...)
   - Não contém linguagem negativa no próprio trecho
   - Menciona outra competência ("reduz nota em C4" numa seção de C5 → descartado)
5. Para cada competência, guarda o trecho **mais longo** encontrado em todas as redações

O trecho extraído é usado no campo `motivo` da missão.

---

## 8. Geração das missões

### Estrutura de cada missão (pep_tasks)

| Campo | Conteúdo |
|---|---|
| `titulo` | Nome da competência-mãe (ex.: "Organização e desenvolvimento argumentativo") |
| `motivo` | Feedback do corretor OU template pedagógico (ver abaixo) |
| `acao` | "Acesse o recurso vinculado..." ou "Revise em Aulas Gravadas ou Microaprendizagem" |
| `criterio_conclusao` | Instrução de como concluir a missão |
| `status` | 1ª missão: `ativa` / 2ª e 3ª: `bloqueada` |
| `ordem` | 1, 2 ou 3 |
| `recurso_id` | Vinculado se existir recurso no catálogo com a tag do erro |

### Geração do campo `motivo`

**Prioridade 1 — feedback real do corretor (quando disponível):**
```
Seus corretores identificaram: "Comentário pedagógico: Há uso impreciso de vocabulário —
'aumenta a estética digital' não é semanticamente coerente."
Esta dificuldade apareceu em 3 das suas redações analisadas.
```

**Prioridade 2 — template pedagógico (quando não há comentário):**
```
A Competência 3 — organização e argumentação avalia a capacidade de organizar as ideias
e construir argumentos de forma lógica, coerente e bem estruturada. Ela foi a mais frágil
em 2 das suas 7 redações analisadas (média de 120 pontos).
```

---

## 9. Gatilho do bootstrap

O hook `useBootstrapPEP` observa automaticamente:

1. O email do aluno logado está disponível
2. A query `useTasksAluno` retornou vazio (sem missões)
3. O bootstrap ainda não rodou nesta sessão (controlado por `useRef<Set<string>>`)

Quando as 3 condições são verdadeiras, dispara `bootstrapPlanoFromHistorico` uma única vez. Ao concluir, invalida as queries e o plano aparece na tela.

**Estado de espera:** enquanto o bootstrap roda, a tela exibe "Analisando seu histórico e montando seu plano…".

---

## 10. Unlock sequencial

Quando o aluno clica em "Marcar como concluída":
1. A missão ativa recebe status `concluida` e `concluida_em = agora`
2. A próxima missão `bloqueada` (por ordem) recebe status `ativa` e `ativada_em = agora`
3. As queries são invalidadas e a tela atualiza automaticamente

---

## 11. Taxonomia de erros (banco de dados)

Tabela `pep_taxonomia_erros` — 17 entradas ativas:

| Eixo | Código | Nome no banco |
|---|---|---|
| C1 | C1_CONCORDANCIA | Concordância verbal e nominal |
| C1 | C1_REGENCIA | Regência verbal e nominal |
| C1 | C1_PONTUACAO | Pontuação |
| C1 | C1_ORTOGRAFIA | Ortografia e acentuação |
| C1 | C1_PARAGRAFACAO | Paragrafação e estrutura |
| C2 | C2_TEMA | Adequação ao tema |
| C2 | C2_REPERTORIO | Uso de repertório sociocultural |
| C2 | C2_PERTINENCIA | Pertinência do repertório |
| C3 | C3_TESE | Construção de tese |
| C3 | C3_PROGRESSAO | Progressão argumentativa ← **código primário de C3** |
| C3 | C3_CONTRA_ARG | Contra-argumento |
| C4 | C4_COESAO_REF | Coesão referencial |
| C4 | C4_CONECTIVOS | Uso de conectivos |
| C4 | C4_COESAO_SEQ | Coesão sequencial ← **código primário de C4** |
| C5 | C5_PROPOSTA | Proposta de intervenção ← **código primário de C5** |
| C5 | C5_DETALHAMENTO | Detalhamento da proposta |
| C5 | C5_RESPEITO_DH | Respeito aos direitos humanos |

O bootstrap usa sempre o **código primário** de cada competência para criar a missão. Todos os sub-erros exibem o mesmo nome de missão (nome da competência-mãe).

---

## 12. Painel administrativo

Acesso: `Admin > Plano de Estudo Personalizado` → `/admin/plano-estudo`

### Visão Individual
- Busca por **nome do aluno** (autocomplete com ILIKE no campo `nome` da tabela `profiles`)
- Mostra cabeçalho do aluno (nome, turma, email)
- Lista a trilha completa de missões com status
- Painel de recorrência de erros (dados de `pep_consolidacao_erros`)
- Ações disponíveis por missão: **Ativar**, **Bloquear**, **Cancelar**
- Regra: o sistema garante que nunca há mais de 1 missão ativa por aluno

### Visão Macro
- Top 10 erros mais recorrentes na base toda
- Alunos parados há 5 dias ou mais
- Recursos mais utilizados

---

## 13. Limitações conhecidas

| Limitação | Detalhe |
|---|---|
| Bootstrap roda apenas uma vez | Se o aluno não tiver histórico no momento do primeiro acesso, o plano não é gerado automaticamente depois. Uma nova visita à página tentará novamente. |
| Comentários de exercício não analisados | `redacoes_exercicio` tem o campo `elogios_pontos_atencao_corretor_1` mas está vazio (0 registros preenchidos). Quando os corretores passarem a preencher, o sistema absorverá automaticamente. |
| Inferência por título pode errar | Lousas com títulos genéricos ("Atividade 3") não são mapeadas para nenhuma competência e são ignoradas. |
| Janela de 6 meses | Histórico anterior a 6 meses não é considerado. Para alunos antigos com pouco histórico recente, o plano pode não ser gerado. |
| Catálogo de recursos vazio | A tabela `pep_recursos` ainda não tem entradas. O campo `recurso_id` das missões fica `null` e a ação aponta genericamente para Aulas Gravadas. |
