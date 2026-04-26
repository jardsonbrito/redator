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
      });
      setResponseSchemaText(JSON.stringify(initialData.response_schema, null, 2));
    }
  }, [initialData, reset]);

  const selectedProvider = watch("provider");

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

    const payload = {
      ...data,
      response_schema: JSON.parse(responseSchemaText),
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
                  ) : (
                    <>
                      <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
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
