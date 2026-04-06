# Radar 2.0 — Nova Lógica de Cálculo Pedagógico

> **Versão 2.0** — Comparação intraindividual por funcionalidade
> Configuração editável em: `src/config/radarConfig.ts`

---

## 🎯 Princípio Fundamental

**Comparação intraindividual**: Cada aluno é avaliado **apenas em relação a ele mesmo** no mês anterior.

❌ **NÃO há**:
- Comparação com média da turma
- Percentil entre alunos
- Ranking
- Meta fixa para redações regulares

✅ **Há**:
- Comparação mês a mês por métrica
- Evolução individual
- Leitura por funcionalidade
- Score geral como métrica **secundária**

---

## 📊 1. Estrutura de Pesos (Total = 10.0)

| Métrica | Peso | Justificativa |
|---|---|---|
| **Redações** | 4.0 | Prioridade máxima — core do sistema |
| **Presença** | 3.0 | Segunda prioridade — engajamento |
| **Exercícios (Radar)** | 1.2 | Prática regular |
| **Lousa** | 0.8 | Atividade complementar |
| **Microaprendizagem** | 0.5 | Conteúdo adicional |
| **Guia Temático** | 0.3 | Material de apoio |
| **Repertório** | 0.2 | Criação livre |

> Redações + Presença = 70% do score geral

---

## 📈 2. Lógica de Cálculo por Métrica

### 🔴 **Princípio Geral**

Cada métrica gera um **score de 0 a 100** baseado em:

```
score = (realizado / ofertado) × 100
```

E é comparado com o **mês anterior** para gerar a **evolução**.

---

### ✍️ **2.1. Redações (peso 4.0)**

**Composição**:
- **Simulado** (40% do score de redações): fixo, 1 por mês
- **Regulares** (60% do score de redações): quantidade livre

#### Score do Simulado (binário)

```typescript
scoreSimulado = simulados >= 1 ? 100 : 0
```

#### Score de Redações Regulares (comparação intraindividual)

```typescript
if regularesAtual === 0 && regularesAnterior === 0:
  scoreRegulares = null  // sem dados

else if regularesAnterior === 0:
  scoreRegulares = regularesAtual > 0 ? 100 : 0

else:
  percentual = (regularesAtual / regularesAnterior) × 100
  scoreRegulares = min(percentual, 100)
```

#### Score Final de Redações

```typescript
if scoreRegulares === null:
  scoreFinal = scoreSimulado  // apenas simulado
else:
  scoreFinal = (scoreSimulado × 0.4) + (scoreRegulares × 0.6)
```

**Exemplos**:

| Mês Anterior | Mês Atual | Score Simulado | Score Regulares | Score Final |
|---|---|---|---|---|
| 0 regulares, 0 simulados | 1 simulado, 0 regulares | 100 | null | **100** |
| 2 regulares, 1 simulado | 2 regulares, 1 simulado | 100 | 100 | **100** |
| 3 regulares, 1 simulado | 6 regulares, 0 simulados | 0 | 100 (cap) | **60** |
| 4 regulares, 1 simulado | 2 regulares, 1 simulado | 100 | 50 | **70** |

---

### 📅 **2.2. Presença (peso 3.0)**

```typescript
if aulasOfertadas === 0:
  score = null  // sem aulas no período

else:
  taxa = (presencas / aulasOfertadas) × 100
  score = taxa
```

**Exemplos**:

| Presenças | Aulas Ofertadas | Score |
|---|---|---|
| 4 | 4 | **100** |
| 3 | 4 | **75** |
| 0 | 4 | **0** |
| 0 | 0 | **null** (sem dados) |

---

### 📝 **2.3. Exercícios Radar (peso 1.2)**

```typescript
if oferta === 0:
  score = null

else:
  score = (realizados / oferta) × 100
```

**Meta fixa**: 3 exercícios por mês

**Exemplos**:

| Realizados | Oferta | Score |
|---|---|---|
| 3 | 3 | **100** |
| 2 | 3 | **67** |
| 0 | 3 | **0** |
| 0 | 0 | **null** |

---

### 🖍️ **2.4. Lousa (peso 0.8)**

```typescript
if oferta === 0:
  score = null

else:
  score = (concluidas / oferta) × 100
```

**Oferta dinâmica**: Baseada em lousas criadas para a turma no mês

---

### 🧠 **2.5. Microaprendizagem (peso 0.5)**

```typescript
if oferta === 0:
  score = null

else:
  score = (concluidos / oferta) × 100
```

**Oferta dinâmica**: Baseada em tópicos micro publicados até o fim do mês

---

### 📚 **2.6. Guia Temático (peso 0.3)**

```typescript
if oferta === 0:
  score = null

else:
  score = (concluidos / oferta) × 100
```

**Oferta dinâmica**: Baseada em guias publicados até o fim do mês

---

### 💡 **2.7. Repertório (peso 0.2)**

Repertório **não tem oferta** — é criação livre do aluno.

```typescript
if valorAtual === 0 && valorAnterior === 0:
  score = null  // sem dados

else if valorAnterior === 0:
  score = valorAtual > 0 ? 100 : 0

else:
  percentual = (valorAtual / valorAnterior) × 100
  score = min(percentual, 100)
```

**Comparação intraindividual**: Aluno é comparado com ele mesmo.

---

## 🔄 3. Evolução (Comparação com Mês Anterior)

Para cada métrica, o sistema calcula a **evolução**:

```typescript
delta = scoreAtual - scoreAnterior
```

### Classificação de Evolução

| Delta | Tipo | Label | Ícone | Cor |
|---|---|---|---|---|
| ≥ 5 | evolucao_forte | Evolução significativa | ▲▲ | Verde |
| > 0.1 | evolucao | Evoluiu | ▲ | Verde |
| -5 a 0 | estavel | Manteve | → | Cinza |
| -10 a -5 | queda | Caiu | ▼ | Laranja |
| < -10 | queda_forte | Queda significativa | ▼▼ | Vermelho |

**Se não há dados do mês anterior**: `sem_dados` (—)

---

## 📐 4. Faixas de Classificação por Métrica (0-100)

| Faixa | Percentual | Cor |
|---|---|---|
| **Excelente** | 100% | 🟢 Verde |
| **Adequado** | 70-99% | 🔵 Azul |
| **Abaixo da média** | 50-69% | 🟡 Âmbar |
| **Baixo desempenho** | 25-49% | 🟠 Laranja |
| **Crítico** | 0-24% | 🔴 Vermelho |

---

## 🎯 5. Score Geral (Secundário — 0 a 10)

O score geral é calculado como **média ponderada** dos scores individuais (0-100), convertido para escala 0-10.

```typescript
scoreGeral = Σ(scoreMetrica × peso) / Σ(pesos válidos)
scoreGeral = scoreGeral / 10  // conversão para 0-10
```

### Requisitos

- **Mínimo 3 métricas válidas** para calcular o score geral
- Métricas com `score = null` são excluídas do cálculo

### Faixas do Score Geral (0-10)

| Faixa | Score | Cor |
|---|---|---|
| **Excelente** | 8.5 – 10.0 | 🟢 Verde |
| **Adequado** | 7.0 – 8.4 | 🔵 Azul |
| **Abaixo da média** | 5.0 – 6.9 | 🟡 Âmbar |
| **Baixo desempenho** | 3.0 – 4.9 | 🟠 Laranja |
| **Crítico** | 0.0 – 2.9 | 🔴 Vermelho |

---

## 🎓 6. Status Bolsista

### Classificação

| Situação | Critério | Nível | Cor |
|---|---|---|---|
| Em dia | Score geral ≥ 7.0 | OK | 🟢 Verde |
| Atenção | 5.0 ≤ Score < 7.0 | Atenção | 🟡 Âmbar |
| Em Risco | Score < 5.0 | Risco | 🔴 Vermelho |
| Alerta Pedagógico | Queda consecutiva por **3 meses** | Alerta | 🟣 Roxo |

### Alertas Específicos

O sistema verifica:
- Queda no envio de redações
- Queda na presença
- Baixa participação em exercícios (< 50%)
- Tendência negativa há 3 meses

---

## ⚠️ 7. Tratamento de Distorções

### 7.1. Baixa oferta do sistema

```typescript
if oferta === 0:
  score = null
  exibir "Sem oferta no período"
```

**Não penaliza o aluno** por falta de oferta.

---

### 7.2. Ausência de dados

```typescript
if valorAtual === 0 && oferta === 0:
  score = null
  exibir "Sem dados suficientes"
```

---

### 7.3. Aluno recém-aprovado

```typescript
if diasNaTurma < 7:
  scoreGeral = null
  todas métricas = null
  exibir "Aluno recém-aprovado"
```

Alunos com menos de **7 dias na turma** não são avaliados no mês.

---

## 📊 8. Estrutura de Dados Retornada

```typescript
interface AlunoMonitoramento {
  // Identificação
  id: string
  nome: string
  email: string
  isBolsista: boolean
  aptoParaAvaliar: boolean

  // Scores por métrica (0-100)
  redacoes: ScoreRedacoes
  presenca: ScorePresenca
  exercicios: ScoreMetrica
  lousa: ScoreMetrica
  micro: ScoreMetrica
  guia: ScoreMetrica
  repertorio: ScoreMetrica

  // Score geral (0-10) — SECUNDÁRIO
  scoreGeral: number | null
  faixaGeral: FaixaConfig | null
  evolucaoGeral: Evolucao

  // Status e alertas
  statusBolsista: StatusBolsista
  alertas: Alerta[]
}

interface ScoreMetrica {
  score: number | null          // 0-100
  valorAtual: number            // valor bruto
  valorAnterior: number | null  // valor do mês anterior
  ofertaAtual: number | null    // total ofertado
  ofertaAnterior: number | null
  faixa: FaixaConfig | null     // classificação
  evolucao: Evolucao            // comparação com mês anterior
}
```

---

## 📈 9. Histórico (4 meses)

O hook `useAlunoScoreHistorico` retorna:

```typescript
interface ScoreMes {
  mes: number
  ano: number
  label: string  // "jan/26"

  // Scores por métrica (0-100)
  redacoes: number | null
  presenca: number | null
  exercicios: number | null
  lousa: number | null
  micro: number | null
  guia: number | null
  repertorio: number | null

  // Score geral (0-10)
  scoreGeral: number | null

  // Valores brutos para cada métrica
  valoresRedacoes: { simulados: number; regulares: number }
  valoresPresenca: { presencas: number; aulasOfertadas: number }
  // ... demais valores
}
```

---

## 🎨 10. Visualização no Dashboard

### Card Principal do Aluno

```
┌────────────────────────────────────────────────────┐
│ 👤 João Silva              🎓 Bolsista (OK)        │
├────────────────────────────────────────────────────┤
│ Score Geral: 7.8 → 8.2  ▲ Evoluiu                 │
│ Faixa: Adequado                                    │
├────────────────────────────────────────────────────┤
│ Análise por Funcionalidade:                        │
│                                                     │
│ ✍️ Redações        [████████░░] 85%  ▲ Evoluiu    │
│ 📅 Presença        [██████████] 100% → Manteve    │
│ 📝 Exercícios      [██████░░░░] 67%  ▼ Caiu       │
│ 🖍️ Lousa           [█████░░░░░] 50%  → Manteve    │
│ 🧠 Micro           [████░░░░░░] 40%  ▲ Evoluiu    │
│ 📚 Guia Temático   [██████████] 100% ▲▲ Evolução! │
│ 💡 Repertório      [██░░░░░░░░] 25%  ▼ Caiu       │
├────────────────────────────────────────────────────┤
│ ⚠️ Alertas:                                        │
│ • Queda em Exercícios nos últimos 2 meses         │
│ • Repertório abaixo da média                       │
└────────────────────────────────────────────────────┘
```

### Tabela de Evolução (4 meses)

```
┌──────────────┬────────┬────────┬────────┬────────┬──────────┐
│ Métrica      │ Jan/26 │ Fev/26 │ Mar/26 │ Abr/26 │ Evolução │
├──────────────┼────────┼────────┼────────┼────────┼──────────┤
│ Redações     │  70%   │  75%   │  80%   │  85%   │   ▲▲     │
│ Presença     │  95%   │  100%  │  100%  │  100%  │   →      │
│ Exercícios   │  100%  │  100%  │  83%   │  67%   │   ▼      │
│ Lousa        │  50%   │  50%   │  50%   │  50%   │   →      │
│ Micro        │  20%   │  30%   │  35%   │  40%   │   ▲      │
│ Guia         │  0%    │  0%    │  100%  │  100%  │   →      │
│ Repertório   │  50%   │  33%   │  30%   │  25%   │   ▼      │
├──────────────┼────────┼────────┼────────┼────────┼──────────┤
│ Score Geral  │  7.2   │  7.5   │  7.8   │  8.2   │   ▲      │
└──────────────┴────────┴────────┴────────┴────────┴──────────┘
```

---

## 🔧 11. Configuração Centralizada

Todos os parâmetros em `src/config/radarConfig.ts`:

```typescript
export const RADAR_CONFIG = {
  // Pesos somam 10.0
  pesos: {
    redacoes:   4.0,
    frequencia: 3.0,
    exercicios: 1.2,
    lousas:     0.8,
    microItens: 0.5,
    repertorio: 0.2,
    guias:      0.3,
  },

  // Proporções de redações
  redacoes: {
    pesoSimulado:  0.4,  // 40%
    pesoRegulares: 0.6,  // 60%
  },

  // Faixas por percentual (0-100)
  faixas: [
    { label: 'Excelente',        min: 100, max: 100, ... },
    { label: 'Adequado',         min: 70,  max: 99,  ... },
    { label: 'Abaixo da média',  min: 50,  max: 69,  ... },
    { label: 'Baixo desempenho', min: 25,  max: 49,  ... },
    { label: 'Crítico',          min: 0,   max: 24,  ... },
  ],

  // Evolução (delta)
  evolucao: [
    { label: 'Evolução significativa', minDelta:  5,        ... },
    { label: 'Evoluiu',                minDelta:  0.1,      ... },
    { label: 'Manteve',                minDelta: -5,        ... },
    { label: 'Caiu',                   minDelta: -10,       ... },
    { label: 'Queda significativa',    minDelta: -Infinity, ... },
  ],

  bolsista: {
    scoreAtencao:     7.0,
    scoreRisco:       5.0,
    mesesQuedaAlerta: 3,
  },

  robustez: {
    diasMinimoNaTurma: 7,
    minimoMetricasValidas: 3,
  },
}
```

---

## ✅ 12. Vantagens da Nova Lógica

✓ **Leitura clara**: Aluno vê exatamente onde está bem/mal
✓ **Justiça**: Redações regulares não penalizam por quantidade
✓ **Evolução granular**: Identifica precisamente onde melhorar
✓ **Sem distorções**: Trata corretamente meses com oferta diferente
✓ **Comparação justa**: Cada aluno é medido contra ele mesmo
✓ **Foco pedagógico**: Score geral é secundário — prioridade é por funcionalidade

---

## 🎯 13. Papel do Score Geral

O **score geral** existe, mas é **secundário**.

**Leitura principal**:
- ✅ Por funcionalidade (redações, presença, exercícios, etc.)
- ✅ Evolução individual (▲ ▼ →)
- ✅ Tendência por métrica

**Leitura secundária**:
- Score geral (0-10)
- Faixa geral

---

## 📌 14. Diferenças da Versão Antiga

| Aspecto | Versão 1.0 (antiga) | Versão 2.0 (nova) |
|---------|---------------------|-------------------|
| **Comparação** | Com meta fixa / turma | Com ele mesmo (mês anterior) |
| **Foco principal** | Score geral | Por funcionalidade |
| **Redações regulares** | Meta fixa (2) | Comparação com histórico próprio |
| **Classificação** | Nota 0-10 | Percentual 0-100% |
| **Pesos** | Distribuídos igualmente | Redação (4) + Presença (3) = 70% |
| **Evolução** | Apenas geral | Por métrica individual |
| **Distorções** | Possíveis | Tratadas (oferta, dados, entrada) |
| **Bolsistas** | Score geral | Alertas por métrica + tendência |

---

## 🚀 15. Próximos Passos

A implementação está completa nos arquivos:

- `src/config/radarConfig.ts` — Configuração centralizada
- `src/utils/radarScore.ts` — Funções de cálculo
- `src/hooks/useMonitoramentoTurma.ts` — Hook de monitoramento
- `src/hooks/useAlunoScoreHistorico.ts` — Hook de histórico

**Próximas melhorias**:
- Atualizar componentes de UI para exibir scores por métrica
- Criar visualizações (radar chart, tabelas de evolução)
- Implementar filtros por métrica
- Adicionar exportação de relatórios
