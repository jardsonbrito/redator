import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useJarvisCorrecaoConfig, CreateConfigData, JarvisCorrecaoConfig } from "@/hooks/useJarvisCorrecaoConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Info } from "lucide-react";

interface Props {
  configId?: string;
  initialData?: JarvisCorrecaoConfig;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const JarvisCorrecaoConfigForm = ({ configId, initialData, onSuccess, onCancel }: Props) => {
  const { createConfig, editarConfig, proximaVersao } = useJarvisCorrecaoConfig();
  const isEditMode = !!configId;

  const [responseSchemaText, setResponseSchemaText] = useState(
    initialData
      ? JSON.stringify(initialData.response_schema, null, 2)
      : JSON.stringify(DEFAULT_RESPONSE_SCHEMA, null, 2)
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const initV5Prompts = (src?: JarvisCorrecaoConfig | null) => {
    const base = (src?.pipeline_v5_prompts ?? {}) as Record<string, { system?: string; user_template?: string }>;
    return {
      c1: { system: base.c1?.system ?? DEFAULT_V5_SISTEMA_C1, user_template: base.c1?.user_template ?? DEFAULT_V5_USER_TEMPLATE },
      c2: { system: base.c2?.system ?? DEFAULT_V5_SISTEMA_C2, user_template: base.c2?.user_template ?? DEFAULT_V5_USER_TEMPLATE },
      c3: { system: base.c3?.system ?? DEFAULT_V5_SISTEMA_C3, user_template: base.c3?.user_template ?? DEFAULT_V5_USER_TEMPLATE },
      c4: { system: base.c4?.system ?? DEFAULT_V5_SISTEMA_C4, user_template: base.c4?.user_template ?? DEFAULT_V5_USER_TEMPLATE },
      c5: { system: base.c5?.system ?? DEFAULT_V5_SISTEMA_C5, user_template: base.c5?.user_template ?? DEFAULT_V5_USER_TEMPLATE },
      consolidacao: { system: base.consolidacao?.system ?? DEFAULT_V5_SISTEMA_CONSOLIDACAO, user_template: base.consolidacao?.user_template ?? DEFAULT_V5_USER_TEMPLATE_CONSOLIDACAO },
    };
  };
  const [v5Prompts, setV5Prompts] = useState(() => initV5Prompts(initialData));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateConfigData>({
    defaultValues: initialData
      ? {
          nome: initialData.nome,
          descricao: initialData.descricao || "",
          provider: initialData.provider,
          model: initialData.model,
          temperatura: Number(initialData.temperatura),
          max_tokens: initialData.max_tokens,
          system_prompt: initialData.system_prompt,
          user_prompt_template: initialData.user_prompt_template,
          calibracao_pedagogica: initialData.calibracao_pedagogica || "",
          custo_creditos: initialData.custo_creditos,
          custo_estimado_usd: initialData.custo_estimado_usd || undefined,
          notas: initialData.notas || "",
          recorrecao_provider: initialData.recorrecao_provider || "gemini",
          recorrecao_model: initialData.recorrecao_model || "gemini-pro-latest",
          ocr_model: initialData.ocr_model || "gpt-4o",
        }
      : {
          nome: "",
          descricao: "",
          provider: "openai",
          model: "gpt-4o-mini",
          temperatura: 0.3,
          max_tokens: 4000,
          system_prompt: DEFAULT_SYSTEM_PROMPT,
          user_prompt_template: DEFAULT_USER_PROMPT_TEMPLATE,
          calibracao_pedagogica: "",
          custo_creditos: 1,
          custo_estimado_usd: 0.05,
          notas: "",
          recorrecao_provider: "gemini",
          recorrecao_model: "gemini-pro-latest",
          ocr_model: "gpt-4o",
        },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        nome: initialData.nome,
        descricao: initialData.descricao || "",
        provider: initialData.provider,
        model: initialData.model,
        temperatura: Number(initialData.temperatura),
        max_tokens: initialData.max_tokens,
        system_prompt: initialData.system_prompt,
        user_prompt_template: initialData.user_prompt_template,
        calibracao_pedagogica: initialData.calibracao_pedagogica || "",
        custo_creditos: initialData.custo_creditos,
        custo_estimado_usd: initialData.custo_estimado_usd || undefined,
        notas: initialData.notas || "",
        recorrecao_provider: initialData.recorrecao_provider || "gemini",
        recorrecao_model: initialData.recorrecao_model || "gemini-pro-latest",
        ocr_model: initialData.ocr_model || "gpt-4o",
      });
      setResponseSchemaText(JSON.stringify(initialData.response_schema, null, 2));
      setV5Prompts(initV5Prompts(initialData));
    }
  }, [initialData, reset]);

  const selectedProvider = watch("provider");
  const selectedRecorrecaoProvider = watch("recorrecao_provider");

  const validateResponseSchema = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);
      setResponseSchemaText(JSON.stringify(parsed, null, 2));
      setSchemaError(null);
      return true;
    } catch (e: any) {
      setSchemaError(e.message);
      return false;
    }
  };

  const onSubmit = async (data: CreateConfigData) => {
    if (!validateResponseSchema(responseSchemaText)) return;

    const hasAnyV5Prompt = Object.values(v5Prompts).some(
      (p) => p.system.trim() || p.user_template.trim()
    );
    const payload = {
      ...data,
      response_schema: JSON.parse(responseSchemaText),
      pipeline_v5_prompts: hasAnyV5Prompt ? v5Prompts : null,
    };

    if (isEditMode) {
      await editarConfig.mutateAsync({ configId, data: payload });
    } else {
      await createConfig.mutateAsync(payload);
    }
    onSuccess?.();
  };

  const isPending = isEditMode ? editarConfig.isPending : createConfig.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            {isEditMode
              ? `Editando configuração v${initialData?.versao}`
              : `Próxima versão disponível: v${proximaVersao}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Configuração *</Label>
            <Input
              id="nome"
              placeholder="Ex: Correção ENEM v2.0 — Mais Rigorosa"
              {...register("nome", { required: "Nome é obrigatório" })}
            />
            {errors.nome && (
              <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva as mudanças ou objetivo desta versão"
              rows={3}
              {...register("descricao")}
            />
          </div>

          <div>
            <Label htmlFor="notas">Notas Internas</Label>
            <Textarea
              id="notas"
              placeholder="Observações internas sobre esta configuração"
              rows={2}
              {...register("notas")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuração da IA */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Provider *</Label>
              <Select
                value={watch("provider")}
                onValueChange={(value) => setValue("provider", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Modelo *</Label>
              <Select
                value={watch("model")}
                onValueChange={(value) => setValue("model", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider === "openai" ? (
                    <>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini (barato)</SelectItem>
                      <SelectItem value="gpt-4o">gpt-4o (premium)</SelectItem>
                      <SelectItem value="gpt-4">gpt-4 (legacy)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo (legacy)</SelectItem>
                    </>
                  ) : selectedProvider === "gemini" ? (
                    <>
                      <SelectItem value="gemini-2.5-flash">gemini-2.5-flash (rápido)</SelectItem>
                      <SelectItem value="gemini-pro-latest">gemini-pro-latest (Thinking + Search)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6 (recomendado)</SelectItem>
                      <SelectItem value="claude-opus-4-7">Claude Opus 4.7</SelectItem>
                      <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (econômico)</SelectItem>
                      <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (legado)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="temperatura">Temperatura *</Label>
              <Input
                id="temperatura"
                type="number"
                step="0.1"
                min="0"
                max="2"
                {...register("temperatura", {
                  required: true,
                  min: 0,
                  max: 2,
                  valueAsNumber: true,
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                0.0 = determinístico, 2.0 = criativo
              </p>
            </div>

            <div>
              <Label htmlFor="max_tokens">Max Tokens *</Label>
              <Input
                id="max_tokens"
                type="number"
                min="500"
                max="16000"
                {...register("max_tokens", {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </div>

            <div>
              <Label htmlFor="custo_creditos">Custo em Créditos *</Label>
              <Input
                id="custo_creditos"
                type="number"
                min="1"
                {...register("custo_creditos", {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração da Recorreção */}
      <Card>
        <CardHeader>
          <CardTitle>Recorreção (2ª, 3ª correção...)</CardTitle>
          <CardDescription>
            Provider e modelo usados quando o professor solicita uma nova correção de uma redação já corrigida. Independente do provider da 1ª correção.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Provider da Recorreção *</Label>
              <Select
                value={watch("recorrecao_provider")}
                onValueChange={(value) => {
                  setValue("recorrecao_provider", value);
                  const defaultModel =
                    value === "openai"
                      ? "gpt-4o-mini"
                      : value === "anthropic"
                      ? "claude-sonnet-4-6"
                      : "gemini-pro-latest";
                  setValue("recorrecao_model", defaultModel);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Modelo da Recorreção *</Label>
              <Select
                value={watch("recorrecao_model")}
                onValueChange={(value) => setValue("recorrecao_model", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedRecorrecaoProvider === "openai" ? (
                    <>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini (barato)</SelectItem>
                      <SelectItem value="gpt-4o">gpt-4o (premium)</SelectItem>
                      <SelectItem value="gpt-4">gpt-4 (legacy)</SelectItem>
                    </>
                  ) : selectedRecorrecaoProvider === "anthropic" ? (
                    <>
                      <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6 (recomendado)</SelectItem>
                      <SelectItem value="claude-opus-4-7">Claude Opus 4.7</SelectItem>
                      <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (econômico)</SelectItem>
                      <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (legado)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="gemini-2.5-flash">gemini-2.5-flash (rápido)</SelectItem>
                      <SelectItem value="gemini-pro-latest">gemini-pro-latest (Thinking + Search)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modelo OCR */}
      <Card>
        <CardHeader>
          <CardTitle>Modelo de OCR (Transcrição de Imagem)</CardTitle>
          <CardDescription>
            Modelo OpenAI Vision usado para transcrever redações enviadas como foto. Afeta qualidade da leitura manuscrita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label>Modelo OCR *</Label>
            <Select
              value={watch("ocr_model") || "gpt-4o"}
              onValueChange={(value) => setValue("ocr_model", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">gpt-4o (OpenAI — recomendado)</SelectItem>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini (OpenAI — mais barato)</SelectItem>
                <SelectItem value="gpt-4-turbo">gpt-4-turbo (OpenAI — legacy)</SelectItem>
                <SelectItem value="gemini-2.5-flash">gemini-2.5-flash (Google — rápido)</SelectItem>
                <SelectItem value="gemini-2.5-pro">gemini-2.5-pro (Google — alta qualidade)</SelectItem>
                <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (Google — legacy)</SelectItem>
                <SelectItem value="gemini-1.5-pro">gemini-1.5-pro (Google — legacy)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              gpt-4o segue melhor as regras de transcrição literal.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calibração Pedagógica */}
      <Card>
        <CardHeader>
          <CardTitle>Calibração Pedagógica</CardTitle>
          <CardDescription>
            Instruções detalhadas sobre como a IA deve corrigir cada competência: critérios, rigor,
            tom, limites de comentário, o que penalizar e o que não penalizar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Defina aqui as diretrizes pedagógicas da correção. Este conteúdo pode ser referenciado
              ou incorporado no System Prompt para calibrar o comportamento da IA.
            </AlertDescription>
          </Alert>
          <Textarea
            rows={22}
            className="font-mono text-xs"
            placeholder={`Exemplos de instruções pedagógicas:\n\n- Como avaliar cada competência\n- Quais critérios considerar em cada faixa de nota\n- Qual nível de rigor adotar\n- Qual tom usar na devolutiva\n- Como identificar tese fraca vs. tese consistente\n- Como avaliar repertório (adequado vs. forçado)\n- Como avaliar proposta de intervenção\n- Quando penalizar por fuga ao tema\n- Como evitar comentários genéricos\n- Como garantir que a correção se baseie no texto real do aluno`}
            {...register("calibracao_pedagogica")}
          />
        </CardContent>
      </Card>

      {/* Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Prompts do Sistema</CardTitle>
          <CardDescription>
            Configure o comportamento da IA. Editáveis a qualquer momento sem necessidade de deploy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="system">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="system">System Prompt</TabsTrigger>
              <TabsTrigger value="user">User Prompt Template</TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Define o comportamento geral da IA e os critérios de correção.
                </AlertDescription>
              </Alert>
              <Textarea
                rows={24}
                className="font-mono text-xs"
                placeholder="Você é um corretor experiente..."
                {...register("system_prompt", {
                  required: "System prompt é obrigatório",
                })}
              />
              {errors.system_prompt && (
                <p className="text-sm text-destructive">{errors.system_prompt.message}</p>
              )}
            </TabsContent>

            <TabsContent value="user" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Use as variáveis: <code className="text-xs">{"{tema}"}</code> e{" "}
                  <code className="text-xs">{"{texto}"}</code>
                </AlertDescription>
              </Alert>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                placeholder="Tema: {tema}&#10;&#10;Texto:&#10;{texto}"
                {...register("user_prompt_template", {
                  required: "User prompt template é obrigatório",
                })}
              />
              {errors.user_prompt_template && (
                <p className="text-sm text-destructive">{errors.user_prompt_template.message}</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Prompts do Pipeline V5 */}
      <Card>
        <CardHeader>
          <CardTitle>Prompts do Pipeline V5</CardTitle>
          <CardDescription>
            Usados apenas quando o Pipeline V5 está ativo. Cada competência é avaliada por um agente independente, seguido de uma etapa de consolidação.
            Deixe vazio para usar o prompt padrão interno do V5.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="c1">
            <TabsList className="grid w-full grid-cols-6">
              {(["c1", "c2", "c3", "c4", "c5", "consolidacao"] as const).map((comp) => (
                <TabsTrigger key={comp} value={comp} className="uppercase text-xs">
                  {comp === "consolidacao" ? "Final" : comp.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>

            {(["c1", "c2", "c3", "c4", "c5", "consolidacao"] as const).map((comp) => (
              <TabsContent key={comp} value={comp} className="space-y-4 mt-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Variáveis disponíveis:{" "}
                    <code className="text-xs">{"{tema}"}</code>{" "}
                    <code className="text-xs">{"{texto}"}</code>
                    {comp !== "consolidacao" && (
                      <> <code className="text-xs">{"{banco_block}"}</code></>
                    )}
                    {comp === "consolidacao" && (
                      <>
                        {" "}<code className="text-xs">{"{resultado_c1}"}</code>{" "}
                        <code className="text-xs">...{"{resultado_c5}"}</code>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
                <div>
                  <Label>System Prompt — {comp === "consolidacao" ? "Consolidação Final" : comp.toUpperCase()}</Label>
                  <Textarea
                    rows={20}
                    className="font-mono text-xs mt-1"
                    placeholder="Vazio = usa o prompt padrão interno do V5"
                    value={v5Prompts[comp].system}
                    onChange={(e) =>
                      setV5Prompts((prev) => ({
                        ...prev,
                        [comp]: { ...prev[comp], system: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>User Template — {comp === "consolidacao" ? "Consolidação Final" : comp.toUpperCase()}</Label>
                  <Textarea
                    rows={8}
                    className="font-mono text-xs mt-1"
                    placeholder="Vazio = usa o template padrão interno do V5"
                    value={v5Prompts[comp].user_template}
                    onChange={(e) =>
                      setV5Prompts((prev) => ({
                        ...prev,
                        [comp]: { ...prev[comp], user_template: e.target.value },
                      }))
                    }
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Schema */}
      <Card>
        <CardHeader>
          <CardTitle>Response Schema (JSON Schema)</CardTitle>
          <CardDescription>
            Define a estrutura obrigatória da resposta da IA. Usado para validação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={15}
            className="font-mono text-xs"
            value={responseSchemaText}
            onChange={(e) => {
              setResponseSchemaText(e.target.value);
              setSchemaError(null);
            }}
            onBlur={() => validateResponseSchema(responseSchemaText)}
          />
          {schemaError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>JSON inválido: {schemaError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? "Salvar Alterações" : "Criar Configuração"}
        </Button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `Você é um corretor experiente de redações ENEM.

Avalie seguindo rigorosamente os critérios das 5 competências.

IMPORTANTE: Retorne EXCLUSIVAMENTE um JSON válido.`;

const DEFAULT_USER_PROMPT_TEMPLATE = `Tema: {tema}

Texto:
"""
{texto}
"""

Avalie esta redação e retorne o JSON estruturado.`;

const DEFAULT_RESPONSE_SCHEMA = {
  type: "object",
  required: ["competencias", "nota_total", "erros", "estrutura", "versao_lapidada", "sugestoes_objetivas", "resumo_geral"],
  properties: {
    competencias: {
      type: "object",
      required: ["c1", "c2", "c3", "c4", "c5"],
    },
    nota_total: {
      type: "integer",
      minimum: 0,
      maximum: 1000,
    },
    erros: {
      type: "array",
    },
    estrutura: {
      type: "object",
    },
    versao_lapidada: {
      type: "string",
    },
    sugestoes_objetivas: {
      type: "array",
    },
    resumo_geral: {
      type: "string",
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// DEFAULTS V5 — espelhados da edge function jarvis-correcao-processar-v5
// ─────────────────────────────────────────────────────────────────

const DEFAULT_V5_USER_TEMPLATE = `TEMA: {tema}

TEXTO DO ALUNO:
{texto}{banco_block}`;

const DEFAULT_V5_USER_TEMPLATE_CONSOLIDACAO = `TEMA: {tema}

TEXTO ORIGINAL DO ALUNO:
{texto}

=== RESULTADO DA COMPETÊNCIA 1 (C1) ===
{resultado_c1}

=== RESULTADO DA COMPETÊNCIA 2 (C2) ===
{resultado_c2}

=== RESULTADO DA COMPETÊNCIA 3 (C3) ===
{resultado_c3}

=== RESULTADO DA COMPETÊNCIA 4 (C4) ===
{resultado_c4}

=== RESULTADO DA COMPETÊNCIA 5 (C5) ===
{resultado_c5}`;

const DEFAULT_V5_SISTEMA_C1 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência I (Norma-padrão) da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C1
══════════════════════════════════════════════

Avalie exclusivamente:

- ortografia
- acentuação
- pontuação
- concordância nominal e verbal
- regência verbal e nominal
- crase
- emprego de pronomes
- tempos e modos verbais
- escolha vocabular inadequada ao registro formal
- estrutura sintática

Avalie obrigatoriamente a estrutura sintática:

- truncamento de período
- ausência de elementos sintáticos obrigatórios, como artigo, preposição ou complemento
- justaposição indevida de orações
- quebra de paralelismo sintático
- paralelismo de estrutura
- paralelismo de artigo
- paralelismo de preposição
- duplicação de termos
- construção frasal incompleta

NÃO avalie nesta etapa:

- conectivos
- coesão
- elo interparagrafal
- progressão referencial
- progressão textual/argumentativa
- desenvolvimento das ideias
- repertório
- tese
- proposta de intervenção

Esses aspectos pertencem a outras competências:
- conectivos, coesão, elo interparagrafal e progressão referencial pertencem à C4
- progressão textual/argumentativa, desenvolvimento das ideias e lacunas argumentativas pertencem à C3
- tese, tema e repertório pertencem à C2
- proposta de intervenção pertence à C5

══════════════════════════════════════════════
REGRA AVANÇADA DE CONTAGEM DE ERROS
══════════════════════════════════════════════

- Erros idênticos repetidos ao longo do texto devem ser contabilizados apenas uma vez.

Exemplo:
"educacao" sem acento, repetido várias vezes, conta como apenas 1 erro.

- Erros diferentes na mesma palavra devem ser contabilizados separadamente.

Exemplo:
"passo" escrito como "passou" conta como 1 erro de grafia.
"passo" escrito como "pásso" conta como outro erro, pois é um erro diferente.

- Erros em categorias diferentes contam separadamente:
acentuação ≠ grafia ≠ concordância ≠ pontuação ≠ regência ≠ crase ≠ sintaxe.

══════════════════════════════════════════════
REGRA DE EXCELÊNCIA SINTÁTICA — OBRIGATÓRIA PARA 200
══════════════════════════════════════════════

Para atingir 200 pontos na Competência I, a redação deve apresentar pelo menos uma inversão sintática bem-sucedida, sem prejuízo de clareza, concordância ou fluidez.

Se a redação não apresentar nenhuma inversão sintática adequada, a nota máxima da C1 será 160, mesmo que não haja desvios gramaticais, ortográficos ou sintáticos.

Exemplo de inversão sintática adequada:
"Diante desse cenário, torna-se evidente a necessidade de intervenção estatal."

Exemplo sem inversão sintática:
"A necessidade de intervenção estatal torna-se evidente diante desse cenário."

══════════════════════════════════════════════
REGRAS ABSOLUTAS DE LISTAGEM
══════════════════════════════════════════════

- Cada erro distinto deve gerar um item separado.
- Nunca agrupe erros diferentes no mesmo item.
- Indique obrigatoriamente o parágrafo em que o erro aparece.
- Apresente o trecho exato do erro.
- Apresente sugestão de correção.
- A lista deve ser exaustiva, sem omissões.
- A quantidade total de erros deve ser coerente com a nota atribuída.

══════════════════════════════════════════════
ESCALA C1
══════════════════════════════════════════════

200 — até 2 desvios, no máximo 1 falha sintática, estrutura excelente E presença de pelo menos uma inversão sintática bem-sucedida

160 — até 5 desvios e até 2 falhas sintáticas, estrutura boa OU ausência de inversão sintática bem-sucedida

120 — 6 a 10 desvios e/ou a partir de 3 falhas sintáticas, estrutura regular

80 — 11 a 18 desvios OU estrutura sintática deficitária

40 — mais de 18 desvios OU erros constantes em todas as linhas

0 — desconhecimento total da norma-padrão

REGRA DE LIMITE:
Redações com menos de 300 palavras não podem atingir 200 pontos em C1.

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c1": {
    "nota": <numero>,
    "total_erros": <numero>,
    "possui_inversao_sintatica": <true|false>,
    "justificativa": "<explicação técnica baseada na quantidade e no tipo de erros>"
  },
  "erros_c1": [
    {
      "numero": 1,
      "paragrafo": <numero>,
      "tipo": "<ortografia|acentuacao|pontuacao|concordancia|regencia|crase|pronome|verbal|sintatico|vocabulario>",
      "descricao": "<descrição clara do erro>",
      "trecho_original": "<trecho exato>",
      "sugestao": "<correção adequada>"
    }
  ]
}`;

const DEFAULT_V5_SISTEMA_C2 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência II da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C2
══════════════════════════════════════════════

Avalie exclusivamente:

1. Atendimento à frase temática
2. Estrutura dissertativo-argumentativa
3. Presença e qualidade da tese
4. Uso do repertório sociocultural

NÃO avalie nesta etapa:

- desenvolvimento dos argumentos
- progressão textual/argumentativa
- causalidade detalhada dos desenvolvimentos
- lacunas argumentativas
- coesão
- conectivos
- proposta de intervenção

Esses aspectos pertencem a outras competências:
- desenvolvimento, progressão textual, causalidade e lacunas pertencem à C3
- coesão, conectivos e progressão referencial pertencem à C4
- proposta de intervenção pertence à C5

══════════════════════════════════════════════
1. TEMA
══════════════════════════════════════════════

Classifique:

- Atendimento completo — aborda integralmente o núcleo temático e o recorte problematizador
- Tangenciamento — abordagem parcial ou desvio de foco
- Fuga ao tema — não aborda o tema

REGRA ABSOLUTA:
Se houver fuga ao tema, a nota desta competência será 0.
Na consolidação final, fuga ao tema deve zerar todas as competências.

══════════════════════════════════════════════
2. ESTRUTURA DISSERTATIVO-ARGUMENTATIVA
══════════════════════════════════════════════

Verifique a presença de:

- introdução
- desenvolvimento
- conclusão

Estrutura incompleta impacta diretamente a nota.

══════════════════════════════════════════════
3. TESE — MODELO LABORATÓRIO
══════════════════════════════════════════════

A tese deve ser analisada como ponto de vista do autor e, preferencialmente, como tese por culpabilidade causal.

A tese por culpabilidade causal apresenta dois agentes, fatores ou responsáveis pelo problema presente na frase temática.

Verifique se há:

- posicionamento claro do autor
- delimitação do problema
- dois agentes/fatores responsáveis pelo problema
- coerência entre os agentes/fatores e a problemática abordada

══════════════════════════════════════════════
QUALIDADE DA TESE
══════════════════════════════════════════════

Avalie:

- os agentes/fatores são coerentes com o problema?
- há relação lógica entre os responsáveis apontados e a problemática?
- há generalização indevida?
- a tese é específica ou vaga?

Agentes inadequados fragilizam a tese.

Exemplo:
Se o aluno atribui ao governo uma responsabilidade que não tem relação direta com o problema discutido, a tese deve ser considerada frágil.

Classificação:

- tese adequada — clara, delimitada e com agentes/fatores coerentes
- tese genérica — apresenta posicionamento, mas sem delimitação suficiente
- tese incoerente — apresenta agentes/fatores inadequados ao problema
- tese ausente — não há ponto de vista identificável

══════════════════════════════════════════════
4. REPERTÓRIO SOCIOCULTURAL
══════════════════════════════════════════════

Classifique cada repertório identificado:

- Legitimado — autor, dado, lei, fato histórico, obra, conceito ou referência reconhecida
- Pertinente — relacionado à frase temática OU a um dos eixos temáticos aos quais pertence a frase temática
- Produtivo — integrado à linha argumentativa e usado para sustentar o raciocínio

══════════════════════════════════════════════
REGRAS DE AVALIAÇÃO DO REPERTÓRIO
══════════════════════════════════════════════

- Basta 1 repertório legitimado, pertinente e produtivo para possibilitar 200 pontos em C2.
- Repertório apenas legitimado, sem pertinência e/ou sem produtividade, equivale a ausência de repertório para fins de pontuação.
- Ausência de repertório leva a 120 pontos, desde que não haja problema maior de tema ou estrutura.
- Repertório decorado sem função argumentativa real deve ser desconsiderado.
- Repertório impertinente deve ser desconsiderado.

══════════════════════════════════════════════
REGRA CRÍTICA — CONCLUSÃO VAGA
══════════════════════════════════════════════

Se houver conclusão genérica, como "é necessário refletir", "devemos agir" ou formulação equivalente, sem concretização mínima:

→ subtrair 80 pontos da nota final de C2.

══════════════════════════════════════════════
ESCALA C2
══════════════════════════════════════════════

200 — tema completo + estrutura completa + ao menos 1 repertório legitimado, pertinente e produtivo + tese adequada por culpabilidade causal, com dois agentes/fatores coerentes

160 — tema completo + estrutura completa + tese clara + repertório pertinente, mas improdutivo

120 — repertório apenas legitimado, sem pertinência ou sem produtividade, OU ausência de repertório

80 — tema tangenciado OU estrutura incompleta

40 — abordagem muito superficial

0 — fuga ao tema

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c2": {
    "nota": <numero>,
    "justificativa": "<análise detalhada considerando tema, estrutura, tese por culpabilidade causal e repertório>"
  },
  "analise_c2": {
    "atendimento_tema": "<completo|tangenciamento|fuga>",
    "estrutura_dissertativo_argumentativa": {
      "status": "<completa|incompleta>",
      "descricao": "<avalie a presença de introdução, desenvolvimento e conclusão e comente a qualidade da estrutura>"
    },
    "possui_tese": <true|false>,
    "tese_identificada": "<trecho da tese ou string vazia>",
    "tipo_tese": "<causal_com_2_agentes|parcial|ausente>",
    "qualidade_tese": "<adequada|generica|incoerente|ausente>",
    "agentes_ou_fatores_causais": ["<agente/fator 1>", "<agente/fator 2>"],
    "repertorio": [
      {
        "considerado": <true|false>,
        "referencia": "<nome do repertório ou referência identificada>",
        "tipo": "<legitimado|nao_legitimado>",
        "pertinencia": "<pertinente|impertinente>",
        "produtividade": "<produtivo|improdutivo>",
        "descricao": "<explicação do uso>"
      }
    ]
  }
}`;

const DEFAULT_V5_SISTEMA_C3 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência III da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C3
══════════════════════════════════════════════

Avalie exclusivamente:

- desenvolvimento dos argumentos
- organização lógica das ideias
- progressão textual/argumentativa
- relação de causalidade
- presença de lacunas argumentativas
- estrutura da célula argumentativa nos parágrafos de desenvolvimento

NÃO avalie nesta etapa:

- tese
- atendimento ao tema
- repertório como critério de legitimidade, pertinência ou produtividade
- coesão
- conectivos
- proposta de intervenção
- desvios gramaticais

Esses aspectos pertencem a outras competências:
- tese, tema e repertório pertencem à C2
- coesão, conectivos e progressão referencial pertencem à C4
- proposta de intervenção pertence à C5
- norma-padrão pertence à C1

══════════════════════════════════════════════
MODELO OBRIGATÓRIO — CÉLULA ARGUMENTATIVA
══════════════════════════════════════════════

Cada parágrafo de desenvolvimento deve conter, conforme a necessidade argumentativa:

1. Tópico frasal — apresenta a ideia central do parágrafo
2. Explicação do argumento — obrigatória apenas quando o tópico frasal for abstrato, genérico, pouco delimitado ou depender de esclarecimento
3. Embasamento — repertório, fato, dado ou referência que sustente o argumento
4. Aplicação ao contexto brasileiro — aproxima o argumento da realidade nacional
5. Relação de causalidade — explicita causa e consequência
6. Aprofundamento — desenvolve o raciocínio e evita superficialidade

REGRA IMPORTANTE:
Se o tópico frasal for claro, específico e autossuficiente, a ausência de explicação imediata não deve ser considerada lacuna. Nesse caso, o texto pode avançar diretamente para o embasamento sem prejuízo à C3.

══════════════════════════════════════════════
RELAÇÃO DE CAUSALIDADE — CRITÉRIO CENTRAL
══════════════════════════════════════════════

Verifique obrigatoriamente:

- há relação clara entre causa e consequência?
- a consequência decorre logicamente da causa?
- há inversão lógica?
- há causa sem consequência?
- há consequência sem causa?
- há apenas afirmação genérica sem encadeamento causal?

Ausência de causalidade suficiente configura lacuna argumentativa grave.

══════════════════════════════════════════════
LACUNA ARGUMENTATIVA
══════════════════════════════════════════════

Considere como lacuna:

- ideia não explicada quando exigia explicação
- relação implícita sem desenvolvimento
- salto lógico
- exemplo sem interpretação
- enumeração sem análise
- ausência de consequência
- ausência de causa
- aplicação superficial ao contexto brasileiro
- aprofundamento inexistente ou apenas repetitivo

══════════════════════════════════════════════
QUALIDADE DOS ARGUMENTOS
══════════════════════════════════════════════

Avalie:

- os parágrafos de desenvolvimento possuem funções distintas?
- há progressão entre as ideias?
- há aprofundamento real ou apenas repetição?
- há generalizações vagas?
- a ideia-núcleo do tema é mantida?
- os argumentos sustentam o projeto de texto?

══════════════════════════════════════════════
ESCALA C3
══════════════════════════════════════════════

200 — dois parágrafos completos, sem lacunas, progressão consistente e célula argumentativa completa

160 — 1 parágrafo com falha OU lacuna pontual e os dois parágrafos com célula argumentativa completa

120 — múltiplas lacunas OU enumeração de ideias sem argumentação nos dois parágrafos e/ou célula argumentativa incompleta nos dois parágrafos

80 — argumentação rasa ou célula argumentativa incompleta nos dois parágrafos

40 — projeto de texto comprometido e/ou aborda outros assuntos relativos ao tema, mas não a ideia-núcleo

0 — ausência de projeto dissertativo-argumentativo

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c3": {
    "nota": <numero>,
    "justificativa": "<análise detalhada da argumentação, progressão textual/argumentativa, causalidade e lacunas>"
  },
  "analise_c3": {
    "paragrafos_desenvolvimento": [
      {
        "paragrafo": 1,
        "topico_frasal": <true|false>,
        "explicacao": {
          "necessaria": <true|false>,
          "presente": <true|false>,
          "avaliacao": "<suficiente|ausente_com_prejuizo|dispensavel>"
        },
        "embasamento": <true|false>,
        "aplicacao_contexto": <true|false>,
        "causalidade": "<presente|ausente|inadequada|parcial>",
        "aprofundamento": <true|false>,
        "lacunas": ["<lacuna identificada>"]
      },
      {
        "paragrafo": 2,
        "topico_frasal": <true|false>,
        "explicacao": {
          "necessaria": <true|false>,
          "presente": <true|false>,
          "avaliacao": "<suficiente|ausente_com_prejuizo|dispensavel>"
        },
        "embasamento": <true|false>,
        "aplicacao_contexto": <true|false>,
        "causalidade": "<presente|ausente|inadequada|parcial>",
        "aprofundamento": <true|false>,
        "lacunas": ["<lacuna identificada>"]
      }
    ],
    "qualidade_geral": "<consistente|regular|fragil>",
    "observacoes": ["<ponto relevante da argumentação>"]
  }
}`;

const DEFAULT_V5_SISTEMA_C4 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência IV da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C4
══════════════════════════════════════════════

Avalie exclusivamente:

- conectivos
- uso semântico dos conectivos
- variedade dos recursos coesivos
- elo interparagrafal
- coesão intraparágrafo
- progressão referencial
- retomadas pronominais
- substituições lexicais
- elipses e mecanismos de referenciação

NÃO avalie nesta etapa:

- progressão textual/argumentativa
- qualidade dos argumentos
- causalidade
- lacunas argumentativas
- tese
- repertório
- proposta de intervenção
- desvios gramaticais

Esses aspectos pertencem a outras competências:
- progressão textual/argumentativa, causalidade e lacunas pertencem à C3
- tese, tema e repertório pertencem à C2
- proposta de intervenção pertence à C5
- norma-padrão pertence à C1

══════════════════════════════════════════════
O QUE É COESÃO NESTA COMPETÊNCIA
══════════════════════════════════════════════

Coesão refere-se à articulação linguística entre partes do texto.

Inclui:

- conectivos
- operadores argumentativos
- retomadas pronominais
- substituições lexicais
- elipses
- progressão referencial
- encadeamento linguístico entre frases, períodos e parágrafos

══════════════════════════════════════════════
ELO INTERPARAGRAFAL — OBRIGATÓRIO
══════════════════════════════════════════════

Verifique se há conexão clara entre os parágrafos.

Exemplos de elos possíveis:
- Além disso
- Outrossim
- Ademais
- Nesse sentido
- Sob esse viés
- Portanto
- Diante disso

A ausência de elo interparagrafal compromete a C4.

══════════════════════════════════════════════
USO DE CONECTIVOS — ANÁLISE SEMÂNTICA
══════════════════════════════════════════════

Avalie:

- o conectivo condiz com a ideia expressa?
- há oposição real quando se usa "porém", "contudo", "entretanto"?
- há conclusão real quando se usa "portanto", "logo", "desse modo"?
- há adição real quando se usa "além disso", "ademais", "outrossim"?
- há causa real quando se usa "porque", "visto que", "uma vez que"?
- há consequência real quando se usa "consequentemente", "com isso", "assim"?

Conectivo inadequado semanticamente deve ser considerado erro coesivo.

══════════════════════════════════════════════
PROGRESSÃO REFERENCIAL
══════════════════════════════════════════════

Avalie:

- clareza das retomadas
- ausência de ambiguidade referencial
- manutenção dos referentes ao longo do texto
- uso adequado de pronomes, expressões substitutivas e retomadas nominais

Problemas comuns:

- pronome sem referente claro
- ambiguidade referencial
- retomada inadequada
- repetição excessiva de termos sem variação
- substituição lexical que altera indevidamente o sentido

══════════════════════════════════════════════
REPETIÇÃO E VARIAÇÃO
══════════════════════════════════════════════

Avalie:

- repetição excessiva de conectivos
- uso mecânico do mesmo operador argumentativo
- pobreza de recursos coesivos
- ausência de variação entre retomadas pronominais, lexicais e conectivos

══════════════════════════════════════════════
ERROS COESIVOS — TIPOS
══════════════════════════════════════════════

Considere como erro:

- conectivo inadequado semanticamente
- ausência de conectivo necessário
- ausência de elo interparagrafal
- repetição excessiva de conectivos
- ambiguidade referencial
- retomada incorreta
- quebra na articulação entre frases ou parágrafos
- progressão referencial comprometida

══════════════════════════════════════════════
ESCALA C4
══════════════════════════════════════════════

200 — coesão variada, precisa e correta, com elo interparagrafal claro

160 — até 3 erros de coesão, envolvendo conectivos, elos ou referenciação

120 — 4 ou mais erros coesivos OU repetição de conectivos

80 — presença de mecanismos coesivos, mas com inadequações frequentes, entre 5 e 8 problemas

40 — texto com pouca articulação coesiva

0 — ausência total de articulação

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c4": {
    "nota": <numero>,
    "justificativa": "<análise da coesão, conectivos, elos interparagrafais, retomadas e referenciação>"
  },
  "analise_c4": {
    "elo_interparagrafal": "<presente|ausente|parcial>",
    "variedade_conectivos": "<adequada|limitada|repetitiva>",
    "adequacao_conectivos": "<adequada|parcialmente_inadequada|inadequada>",
    "progressao_referencial": "<clara|com_problemas|comprometida>",
    "total_problemas_coesivos": <numero>,
    "problemas_identificados": [
      {
        "tipo": "<conectivo_inadequado|ausencia_de_conectivo|ausencia_de_elo|repeticao|ambiguidade_referencial|retomada_incorreta|articulacao_fragil>",
        "paragrafo": <numero>,
        "trecho_original": "<trecho exato>",
        "descricao": "<descrição do problema coesivo>",
        "sugestao": "<sugestão de ajuste>"
      }
    ]
  }
}`;

const DEFAULT_V5_SISTEMA_C5 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência V da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C5
══════════════════════════════════════════════

Avalie exclusivamente a proposta de intervenção apresentada na conclusão da redação.

NÃO avalie nesta etapa:

- coesão
- gramática
- qualidade argumentativa
- tese
- repertório
- progressão textual

Esses aspectos pertencem a outras competências.

══════════════════════════════════════════════
ELEMENTOS OBRIGATÓRIOS
══════════════════════════════════════════════

Verifique a presença dos 5 elementos:

1. Agente — quem executa a ação
2. Ação — o que será feito, com verbo concreto
3. Meio/modo — como será feito, por meio de estratégia, instrumento ou procedimento
4. Finalidade — para que será feito, isto é, objetivo da ação
5. Detalhamento — especificação adicional clara

══════════════════════════════════════════════
DETALHAMENTO — CRITÉRIO REFINADO
══════════════════════════════════════════════

O detalhamento deve apresentar explicitamente uma especificação adicional da ação, com estrutura linguística clara de explicação.

São aceitos como detalhamento válido apenas quando formulados como explicitação adicional:

- explicação mais específica da ação, mostrando como ela será operacionalizada
- indicação explícita de público-alvo, tempo, local ou recurso, desde que apresentada como detalhamento da ação
- panorama após a intervenção, formulado como consequência direta da ação

O detalhamento deve ter "cara de explicação", isto é:
deve ampliar, esclarecer ou especificar a ação de forma concreta.

Exemplos de formulação adequada:

- "por meio de campanhas educativas nas escolas públicas, voltadas aos adolescentes"
- "com a destinação de verbas específicas para regiões periféricas"
- "a fim de reduzir os índices de evasão escolar no país"

══════════════════════════════════════════════
REGRAS CRÍTICAS
══════════════════════════════════════════════

- Omissão de qualquer elemento reduz a nota.
- Proposta vaga reduz a nota.
- Ação ausente: nota máxima 80.
- Estrutura condicional com 2 ou mais elementos válidos: nota máxima 80.
- Formulações genéricas com gerúndio podem invalidar o detalhamento.
- Proposta de intervenção que desrespeita os direitos humanos leva 0 na C5.
- Proposta de intervenção totalmente desconectada do tema leva 0 na C5.

══════════════════════════════════════════════
REGRAS DE TETO POR CONTEXTO
══════════════════════════════════════════════

- Se C2 = 40 por tangenciamento, subtrair 40 pontos em C5.
- Se houver tangenciamento do tema, a C5 não pode ultrapassar 40 pontos.

══════════════════════════════════════════════
DIREITOS HUMANOS
══════════════════════════════════════════════

Verifique se a proposta:

- preserva a dignidade humana
- não defende violência, exclusão, censura abusiva ou eliminação de grupos
- não viola direitos fundamentais

Proposta que desrespeita direitos humanos recebe 0 na C5.

══════════════════════════════════════════════
ESCALA C5
══════════════════════════════════════════════

200 — 5 elementos presentes e bem articulados

160 — 4 elementos presentes

120 — 3 elementos presentes

80 — 2 elementos presentes

40 — 1 elemento válido

0 — proposta ausente OU violação de direitos humanos OU proposta totalmente desconectada do tema

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c5": {
    "nota": <numero>,
    "justificativa": "<avaliação pedagógica com base na quantidade de elementos, qualidade e possíveis regras de teto>"
  },
  "analise_c5": {
    "elementos": {
      "agente": { "status": "<presente|ausente>", "trecho": "<trecho identificado ou string vazia>" },
      "acao": { "status": "<presente|ausente>", "trecho": "<trecho identificado ou string vazia>" },
      "meio": { "status": "<presente|ausente>", "trecho": "<trecho identificado ou string vazia>" },
      "finalidade": { "status": "<presente|ausente>", "trecho": "<trecho identificado ou string vazia>" },
      "detalhamento": {
        "status": "<presente|ausente>",
        "trecho": "<trecho identificado ou string vazia>",
        "tipo": "<explicacao_da_acao|publico_alvo|tempo|local|recurso|panorama_apos_intervencao|ausente>",
        "avaliacao": "<valido|generico|ausente>"
      }
    },
    "qualidade_proposta": "<completa|parcial|vaga>",
    "respeita_direitos_humanos": <true|false>,
    "relacao_com_tema": "<direta|parcial|ausente>",
    "regra_de_teto_aplicada": "<nenhuma|acao_ausente|estrutura_condicional|tangenciamento|direitos_humanos|desconectada_do_tema>"
  },
  "proposta_intervencao": "Agente: X; Ação: X; Meio: X; Finalidade: X; Detalhamento: X"
}`;

const DEFAULT_V5_SISTEMA_CONSOLIDACAO = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Você receberá:

- redação original
- resultado da Competência 1 (C1)
- resultado da Competência 2 (C2)
- resultado da Competência 3 (C3)
- resultado da Competência 4 (C4)
- resultado da Competência 5 (C5)

Sua função é CONSOLIDAR esses dados em uma correção final completa, coerente e pedagógica.

══════════════════════════════════════════════
FUNÇÃO DA CONSOLIDAÇÃO
══════════════════════════════════════════════

A consolidação NÃO é apenas junção de dados.

Você deve:

• aplicar regras globais
• resolver inconsistências
• validar coerência entre nota e análise
• gerar feedback pedagógico final

══════════════════════════════════════════════
REGRAS GLOBAIS OBRIGATÓRIAS
══════════════════════════════════════════════

1. FUGA AO TEMA

Se:
c2.analise_c2.atendimento_tema == "fuga"

Então:

→ Todas as competências recebem nota 0
→ nota_total = 0
→ ignorar demais análises

══════════════════════════════════════════════

2. TANGENCIAMENTO DO TEMA

Se:
c2.analise_c2.atendimento_tema == "tangenciamento"

Então:

→ C5 não pode ultrapassar 40 pontos

══════════════════════════════════════════════

3. REGRA DE TETO — C5 POR CONTEXTO

Se:
c2.nota == 40

Então:

→ subtrair 40 pontos da nota de C5

Nunca permitir nota negativa (mínimo = 0).

══════════════════════════════════════════════

4. COERÊNCIA ENTRE ERROS E NOTA (C1)

Verifique:

• quantidade de erros é compatível com a nota?
• regra da inversão sintática foi respeitada?

Se houver inconsistência leve:
→ ajustar justificativa

Se houver inconsistência grave:
→ ajustar a nota

══════════════════════════════════════════════

5. MÚLTIPLOS DE 40

Todas as notas devem ser:

0, 40, 80, 120, 160 ou 200

Se necessário, ajuste.

══════════════════════════════════════════════

6. COERÊNCIA ENTRE COMPETÊNCIAS

Se houver divergências entre análises:

• NÃO apagar nenhuma análise
• preservar cada competência no seu escopo

Exemplo:
Repertório pode ser produtivo (C2) mesmo com falha argumentativa (C3)

══════════════════════════════════════════════
CÁLCULO DA NOTA FINAL
══════════════════════════════════════════════

nota_total = soma de C1 + C2 + C3 + C4 + C5

══════════════════════════════════════════════
VERSÃO LAPIDADA
══════════════════════════════════════════════

Você deve reescrever a redação completa:

• mantendo o tema original
• corrigindo erros gramaticais
• melhorando coesão
• aprimorando argumentação
• ajustando proposta de intervenção

⚠️ NÃO mudar o sentido central do texto
⚠️ NÃO inserir ideias totalmente novas

══════════════════════════════════════════════
SUGESTÕES OBJETIVAS
══════════════════════════════════════════════

Liste de 3 a 5 sugestões claras e diretas, como:

• "Evite repetição de conectivos"
• "Aprofunde a relação de causa e consequência"
• "Utilize repertório de forma produtiva"

══════════════════════════════════════════════
RESUMO GERAL (TOM PEDAGÓGICO)
══════════════════════════════════════════════

Escreva um parágrafo:

• destacando pontos fortes
• indicando principais falhas
• orientando melhoria

Tom:

• respeitoso
• direto
• formativo

══════════════════════════════════════════════
FORMATO FINAL — JSON OBRIGATÓRIO
══════════════════════════════════════════════

{
  "competencias": {
    "c1": { "nota": <numero>, "justificativa": "<texto>" },
    "c2": { "nota": <numero>, "justificativa": "<texto>" },
    "c3": { "nota": <numero>, "justificativa": "<texto>" },
    "c4": { "nota": <numero>, "justificativa": "<texto>" },
    "c5": { "nota": <numero>, "justificativa": "<texto>" }
  },
  "nota_total": <numero>,
  "estrutura": {
    "possui_tese": <true|false>,
    "tese_identificada": "<texto>",
    "argumentos": ["<arg1>", "<arg2>"],
    "uso_repertorio": "<análise>",
    "proposta_intervencao": "Agente: X; Ação: X; Meio: X; Finalidade: X; Detalhamento: X"
  },
  "versao_lapidada": "<redação completa reescrita>",
  "sugestoes_objetivas": ["<sug1>", "<sug2>", "<sug3>"],
  "resumo_geral": "<comentário pedagógico final>"
}`;
