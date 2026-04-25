-- ═══════════════════════════════════════════════════════════════
-- JARVIS CORREÇÃO - SEED CONFIGURAÇÃO INICIAL
-- Migration: 20260425000002
-- Descrição: Configuração v1.0 - Baseline para correções ENEM
-- ═══════════════════════════════════════════════════════════════

INSERT INTO jarvis_correcao_config (
  versao,
  ativo,
  nome,
  descricao,
  provider,
  model,
  temperatura,
  max_tokens,
  system_prompt,
  user_prompt_template,
  response_schema,
  custo_creditos,
  custo_estimado_usd,
  notas
) VALUES (
  1,
  true,
  'Correção ENEM v1.0 - Padrão',
  'Configuração inicial baseada nos critérios oficiais do ENEM 2024. Temperatura baixa para correção objetiva e consistente.',
  'openai',
  'gpt-4o-mini',
  0.30,
  4000,

  -- ═══════════════════════════════════════════════════════════════
  -- SYSTEM PROMPT (Editável pelo Admin)
  -- ═══════════════════════════════════════════════════════════════
  'Você é um corretor experiente de redações ENEM, com profundo conhecimento dos critérios oficiais estabelecidos pelo INEP.

# MISSÃO
Avaliar redações de forma rigorosa, justa e pedagógica, seguindo EXATAMENTE os critérios das 5 competências do ENEM.

# CRITÉRIOS DE AVALIAÇÃO (ENEM 2024)

## Competência 1: Domínio da norma padrão da língua escrita (0-200 pontos)
- 200 pts: Demonstra excelente domínio, com desvios gramaticais raros e não graves
- 160 pts: Demonstra bom domínio, com poucos desvios
- 120 pts: Demonstra domínio mediano, com alguns desvios
- 80 pts: Demonstra domínio insuficiente, com muitos desvios
- 40 pts: Demonstra domínio precário, com desvios graves e frequentes
- 0 pts: Demonstra desconhecimento total da norma padrão

## Competência 2: Compreender o tema e aplicar conceitos (0-200 pontos)
- 200 pts: Desenvolve muito bem o tema com argumentação consistente
- 160 pts: Desenvolve bem o tema com argumentação adequada
- 120 pts: Desenvolve de forma mediana o tema
- 80 pts: Desenvolve de forma insuficiente o tema
- 40 pts: Desenvolve de forma precária ou tangencia o tema
- 0 pts: Fuga total ao tema ou texto insuficiente

## Competência 3: Seleção e organização de argumentos (0-200 pontos)
- 200 pts: Apresenta informações, fatos, opiniões e argumentos muito bem organizados
- 160 pts: Apresenta informações, fatos e opiniões bem organizados
- 120 pts: Apresenta informações, fatos e opiniões de forma mediana
- 80 pts: Apresenta informações, fatos e opiniões de forma insuficiente
- 40 pts: Apresenta informações, fatos e opiniões de forma precária
- 0 pts: Não apresenta argumentação ou informações incoerentes

## Competência 4: Coesão e coerência (0-200 pontos)
- 200 pts: Articula muito bem as partes do texto com repertório diversificado
- 160 pts: Articula bem as partes do texto com recursos coesivos
- 120 pts: Articula de forma mediana as partes do texto
- 80 pts: Articula de forma insuficiente as partes do texto
- 40 pts: Articula de forma precária as partes do texto
- 0 pts: Não articula as informações

## Competência 5: Proposta de intervenção (0-200 pontos)
- 200 pts: Elabora muito bem proposta completa (ação, agente, modo/meio, efeito e detalhamento)
- 160 pts: Elabora bem proposta com 4 elementos
- 120 pts: Elabora de forma mediana proposta com 3 elementos
- 80 pts: Elabora de forma insuficiente proposta com 2 elementos
- 40 pts: Elabora de forma precária proposta com 1 elemento
- 0 pts: Não apresenta proposta ou fere direitos humanos

# REGRAS OBRIGATÓRIAS

1. **Formato de saída**: RETORNE EXCLUSIVAMENTE UM JSON VÁLIDO. Não inclua texto antes ou depois do JSON.

2. **Soma exata**: A soma das 5 competências DEVE ser EXATAMENTE igual à nota_total.

3. **Identificação de erros**: Liste TODOS os erros relevantes encontrados, numerados sequencialmente.

4. **Justificativas objetivas**: Cada competência deve ter justificativa clara baseada nos critérios.

5. **Versão lapidada**: Mantenha o CONTEÚDO e as IDEIAS originais do aluno. Corrija apenas:
   - Erros gramaticais
   - Problemas de coesão
   - Estrutura de parágrafos
   NÃO invente novos argumentos ou repertórios que o aluno não mencionou.

6. **Tom pedagógico**: Seja criterioso mas construtivo. O objetivo é educar, não desanimar.

# ESTRUTURA DO JSON

```json
{
  "competencias": {
    "c1": { "nota": number, "justificativa": string },
    "c2": { "nota": number, "justificativa": string },
    "c3": { "nota": number, "justificativa": string },
    "c4": { "nota": number, "justificativa": string },
    "c5": { "nota": number, "justificativa": string }
  },
  "nota_total": number,
  "erros": [
    {
      "numero": number,
      "tipo": string,
      "descricao": string,
      "trecho_original": string,
      "sugestao": string
    }
  ],
  "estrutura": {
    "possui_tese": boolean,
    "tese_identificada": string,
    "argumentos": [string],
    "uso_repertorio": string,
    "proposta_intervencao": string
  },
  "versao_lapidada": string,
  "sugestoes_objetivas": [string],
  "resumo_geral": string
}
```

Avalie com rigor acadêmico, mas sempre com olhar pedagógico.',

  -- ═══════════════════════════════════════════════════════════════
  -- USER PROMPT TEMPLATE (Editável pelo Admin)
  -- ═══════════════════════════════════════════════════════════════
  '# REDAÇÃO PARA AVALIAÇÃO

**Tema:** {tema}

**Texto do aluno:**
"""
{texto}
"""

---

Avalie esta redação seguindo rigorosamente os critérios ENEM descritos no prompt do sistema.

Retorne o JSON estruturado conforme especificado.',

  -- ═══════════════════════════════════════════════════════════════
  -- RESPONSE SCHEMA (JSON Schema para validação)
  -- ═══════════════════════════════════════════════════════════════
  '{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": [
      "competencias",
      "nota_total",
      "erros",
      "estrutura",
      "versao_lapidada",
      "sugestoes_objetivas",
      "resumo_geral"
    ],
    "properties": {
      "competencias": {
        "type": "object",
        "required": ["c1", "c2", "c3", "c4", "c5"],
        "properties": {
          "c1": {
            "type": "object",
            "required": ["nota", "justificativa"],
            "properties": {
              "nota": { "type": "integer", "minimum": 0, "maximum": 200 },
              "justificativa": { "type": "string", "minLength": 10 }
            }
          },
          "c2": {
            "type": "object",
            "required": ["nota", "justificativa"],
            "properties": {
              "nota": { "type": "integer", "minimum": 0, "maximum": 200 },
              "justificativa": { "type": "string", "minLength": 10 }
            }
          },
          "c3": {
            "type": "object",
            "required": ["nota", "justificativa"],
            "properties": {
              "nota": { "type": "integer", "minimum": 0, "maximum": 200 },
              "justificativa": { "type": "string", "minLength": 10 }
            }
          },
          "c4": {
            "type": "object",
            "required": ["nota", "justificativa"],
            "properties": {
              "nota": { "type": "integer", "minimum": 0, "maximum": 200 },
              "justificativa": { "type": "string", "minLength": 10 }
            }
          },
          "c5": {
            "type": "object",
            "required": ["nota", "justificativa"],
            "properties": {
              "nota": { "type": "integer", "minimum": 0, "maximum": 200 },
              "justificativa": { "type": "string", "minLength": 10 }
            }
          }
        }
      },
      "nota_total": {
        "type": "integer",
        "minimum": 0,
        "maximum": 1000
      },
      "erros": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["numero", "tipo", "descricao", "trecho_original", "sugestao"],
          "properties": {
            "numero": { "type": "integer", "minimum": 1 },
            "tipo": {
              "type": "string",
              "enum": ["gramática", "ortografia", "pontuação", "concordância", "regência", "coesão", "coerência", "estrutura", "vocabulário", "outro"]
            },
            "descricao": { "type": "string", "minLength": 5 },
            "trecho_original": { "type": "string" },
            "sugestao": { "type": "string", "minLength": 5 }
          }
        }
      },
      "estrutura": {
        "type": "object",
        "required": ["possui_tese", "tese_identificada", "argumentos", "uso_repertorio", "proposta_intervencao"],
        "properties": {
          "possui_tese": { "type": "boolean" },
          "tese_identificada": { "type": "string" },
          "argumentos": {
            "type": "array",
            "items": { "type": "string" }
          },
          "uso_repertorio": { "type": "string" },
          "proposta_intervencao": { "type": "string" }
        }
      },
      "versao_lapidada": {
        "type": "string",
        "minLength": 50
      },
      "sugestoes_objetivas": {
        "type": "array",
        "items": { "type": "string" },
        "minItems": 1
      },
      "resumo_geral": {
        "type": "string",
        "minLength": 20
      }
    }
  }'::jsonb,

  1, -- custo_creditos
  0.05, -- custo_estimado_usd
  'Configuração inicial do sistema. Baseline para futuras calibrações.'
);

-- Registrar criação da config v1 no audit
INSERT INTO jarvis_correcao_config_audit (
  config_id,
  acao,
  admin_id,
  observacao
) VALUES (
  (SELECT id FROM jarvis_correcao_config WHERE versao = 1),
  'criada',
  NULL, -- Criada via migration, não por admin
  'Configuração v1.0 criada via migration - baseline do sistema'
);

-- ═══════════════════════════════════════════════════════════════
-- COMENTÁRIO IMPORTANTE
-- ═══════════════════════════════════════════════════════════════

COMMENT ON COLUMN jarvis_correcao_config.system_prompt IS
  'V1: Prompt rigoroso baseado em critérios oficiais ENEM 2024. Temperatura 0.30 para consistência.';

-- ═══════════════════════════════════════════════════════════════
-- FIM DO SEED
-- ═══════════════════════════════════════════════════════════════
