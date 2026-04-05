# Radar 2.0 — Lógica de Cálculo do Score Pedagógico

> Arquivo de referência para entender como o sistema classifica cada aluno.
> Configuração editável em: `src/config/radarConfig.ts`

---

## 1. Score Geral (0 a 10)

Cada aluno recebe um **score mensal de 0 a 10**, calculado a partir de 7 métricas ponderadas.

### Métricas e Pesos

| Métrica | Peso | Meta mensal padrão |
|---|---|---|
| Redações enviadas | 3,0 | 2 redações |
| Frequência em aulas | 2,0 | 100% (sem meta fixa) |
| Exercícios realizados | 1,5 | 3 exercícios |
| Lousas concluídas | 1,0 | 2 lousas |
| Microaprendizagem (itens) | 1,0 | 5 itens |
| Repertório adicionado | 0,75 | 3 itens |
| Guias temáticos concluídos | 0,75 | 1 guia |
| **Total** | **10,0** | — |

> Os pesos somam exatamente 10,0. O score final é a média ponderada das notas normalizadas.

---

## 2. Normalização de cada métrica (0 a 10)

Cada métrica é convertida para uma nota de 0 a 10 com base na meta do mês:

```
nota = min( (valor_real / meta) × 10 , 10 )
```

### Exemplos práticos (meta redações = 2):

| Redações enviadas | Cálculo | Nota |
|---|---|---|
| 0 | 0/2 × 10 | 0,0 |
| 1 | 1/2 × 10 | 5,0 |
| 2 | 2/2 × 10 | 10,0 |
| 3+ | min(15, 10) | 10,0 (cap) |

### Frequência (tratamento especial):

```
nota = taxa_frequencia / 10
```

| Frequência | Nota |
|---|---|
| 100% | 10,0 |
| 80% | 8,0 |
| 50% | 5,0 |
| 0% | 0,0 |
| sem aulas no período | excluída do cálculo |

---

## 3. Cálculo do Score Final

```
score = Σ(nota_métrica × peso_métrica) / Σ(pesos das métricas válidas)
```

Métricas **sem dados** (frequência nula por ausência de aulas) são excluídas
do numerador e do denominador — o peso é redistribuído automaticamente entre
as demais.

### Exemplo completo:

Aluno com: 1 redação, 60% frequência, 2 exercícios, 1 lousa, 3 micro, 2 repertório, 0 guias.

| Métrica | Valor | Nota | Peso | Ponderado |
|---|---|---|---|---|
| Redações | 1 | 5,0 | 3,0 | 15,0 |
| Frequência | 60% | 6,0 | 2,0 | 12,0 |
| Exercícios | 2 | 6,7 | 1,5 | 10,0 |
| Lousas | 1 | 5,0 | 1,0 | 5,0 |
| Micro | 3 | 6,0 | 1,0 | 6,0 |
| Repertório | 2 | 6,7 | 0,75 | 5,0 |
| Guias | 0 | 0,0 | 0,75 | 0,0 |
| **Total** | — | — | **10,0** | **53,0** |

**Score = 53,0 / 10,0 = 5,3 → Abaixo da média**

---

## 4. Metas Efetivas (ajuste por oferta real da turma)

Se a turma inteira atingiu menos de 50% de uma meta, o sistema ajusta automaticamente:

```
se max_real_da_turma < meta_config × 0,5:
    meta_efetiva = max_real_da_turma
senão:
    meta_efetiva = meta_config
```

**Exemplo:** Meta de exercícios = 3. Mas o admin só importou 1 exercício no mês.
Nenhum aluno pode ter mais que 1. O sistema ajusta a meta para 1.
Todos os alunos que fizeram o único exercício disponível recebem nota 10,0 em exercícios.

---

## 5. Faixas Pedagógicas

| Faixa | Score | Cor |
|---|---|---|
| Excelente | 8,5 – 10,0 | 🟢 Verde |
| Adequado | 7,0 – 8,4 | 🔵 Azul |
| Abaixo da média | 5,0 – 6,9 | 🟡 Âmbar |
| Baixo desempenho | 3,0 – 4,9 | 🟠 Laranja |
| Crítico | 0,0 – 2,9 | 🔴 Vermelho |

---

## 6. Tendência (comparação com mês anterior)

O sistema compara o score do mês atual com o mês anterior:

```
delta = score_atual - score_anterior
```

| Delta | Classificação | Ícone |
|---|---|---|
| ≥ +0,5 | Evolução | ▲ |
| -0,5 a +0,49 | Estável | → |
| -0,5 a -1,49 | Queda | ▼ |
| ≤ -1,5 | Queda acentuada | ▼▼ |

> Se não há dados do mês anterior, a tendência fica em branco (sem punir o aluno).

---

## 7. Status Composto

O sistema exibe **faixa + tendência** combinados em uma única leitura:

| Exemplos |
|---|
| "Excelente, em evolução" |
| "Adequado, estável" |
| "Abaixo da média, em queda" |
| "Crítico, em queda acentuada" |

---

## 8. Bolsistas — Regras Especiais

| Situação | Critério | Nível | Cor |
|---|---|---|---|
| Em dia | Score ≥ 7,0 | OK | 🟡 Dourado |
| Atenção | 5,0 ≤ Score < 7,0 | Atenção | 🟡 Âmbar |
| Em Risco | Score < 5,0 | Risco | 🔴 Vermelho |
| Alerta Pedagógico | Queda consecutiva por 2 meses (independente do score) | Alerta | 🟣 Roxo |

O **Alerta Pedagógico** é o mais grave: mesmo um bolsista com score 7,5 pode receber alerta se está caindo há 2 meses seguidos.

---

## 9. Confiança do Score (quando exibir ou não)

O sistema não exibe score quando não há dados suficientes:

| Situação | Confiança | Exibição |
|---|---|---|
| ≥ 3 métricas com atividade | Total | Score completo |
| 1-2 métricas com atividade OU frequência registrada (mesmo 0%) | Parcial | Score com aviso implícito |
| Zero atividades E sem aulas no período | Insuficiente | "Sem dados" |

> **Frequência 0%** (aluno faltou a todas as aulas) ainda é um **dado registrado**,
> diferente de **frequência nula** (não havia aulas no período).
> No primeiro caso, o score é calculado. No segundo, a frequência é excluída do cálculo.

---

## 10. Casos Especiais Tratados

### Início de mês (primeiros 10 dias)
O Radar usa automaticamente o **mês anterior** como padrão, pois o mês em curso
tem poucos dados. O usuário pode trocar para o mês atual manualmente.

### Redações: engajamento, não performance
O Radar conta **todas as redações enviadas** (corrigidas ou não), pois mede
engajamento. O Boletim Individual usa apenas redações corrigidas para calcular
médias e notas C1–C5.

### Aluno recém-aprovado (< 7 dias na turma no mês)
Se `data_aprovacao` cai no mês avaliado e o aluno tem menos de 7 dias na turma,
ele é marcado como "Sem dados" para evitar penalização injusta.

### Baixa oferta do sistema
Se a turma inteira atingiu menos de 50% de uma meta (ex: admin importou só 1 exercício),
a meta é ajustada para o máximo real da turma. Isso evita que toda a turma receba
score baixo por limitação do sistema, e não do aluno.

---

## 11. Prioridade de Ordenação na Lista

Os alunos são ordenados automaticamente para mostrar os mais críticos primeiro:

1. 🟣 Bolsistas com Alerta Pedagógico
2. 🔴 Bolsistas em Risco
3. 🔴 Críticos + Queda acentuada
4. 🔴 Críticos
5. 🟠 Queda acentuada + Baixo desempenho
6. ↕ Queda acentuada (outras faixas)
7. 🟡 Bolsistas com Atenção
8. 🟠 Baixo desempenho
9. 🔽 Em queda (outras faixas)
10. ⬆ Adequados e Excelentes (por score decrescente)
11. ⚪ Sem dados (final da lista)

---

## 12. Configuração (sem editar código)

Todos os parâmetros estão centralizados em `src/config/radarConfig.ts`:

```typescript
metas: {
  redacoes:   2,   // meta mensal de redações
  exercicios: 3,   // meta de exercícios
  lousas:     2,   // meta de lousas
  microItens: 5,   // meta de itens de microaprendizagem
  repertorio: 3,   // meta de itens de repertório
  guias:      1,   // meta de guias concluídos
},
pesos: {
  redacoes:   3.0,
  frequencia: 2.0,
  exercicios: 1.5,
  lousas:     1.0,
  microItens: 1.0,
  repertorio: 0.75,
  guias:      0.75,
},
bolsista: {
  scoreAtencao:     7.0,  // abaixo → atenção
  scoreRisco:       5.0,  // abaixo → risco
  mesesQuedaAlerta: 2,    // quedas consecutivas → alerta pedagógico
},
robustez: {
  diasMinimoNaTurma: 7,   // dias mínimos no mês para ser avaliado
},
```
