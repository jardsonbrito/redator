import { useState, useEffect } from "react";
import {
  useJarvisCorrecaoModelosReferencia,
  ModeloReferencia,
} from "@/hooks/useJarvisCorrecaoModelosReferencia";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";

type FormData = Omit<ModeloReferencia, "id" | "criado_em" | "atualizado_em">;

const CAMPOS_COMP = [
  { key: "c1", label: "C1 — Norma Padrão" },
  { key: "c2", label: "C2 — Temática e Repertório" },
  { key: "c3", label: "C3 — Argumentação" },
  { key: "c4", label: "C4 — Coesão" },
  { key: "c5", label: "C5 — Proposta de Intervenção" },
] as const;

const SCORES = [0, 40, 80, 120, 160, 200] as const;

const defaultValues: FormData = {
  titulo: "",
  tema: "",
  texto_aluno: "",
  nota_total: 0,
  nota_c1: 0,
  nota_c2: 0,
  nota_c3: 0,
  nota_c4: 0,
  nota_c5: 0,
  justificativa_c1: "",
  justificativa_c2: "",
  justificativa_c3: "",
  justificativa_c4: "",
  justificativa_c5: "",
  erros_identificados: "",
  sugestoes_melhoria: "",
  comentario_pedagogico: "",
  ativo: true,
};

export const JarvisCorrecaoModelosReferencia = () => {
  const { modelos, isLoading, criarModelo, editarModelo, deletarModelo, toggleAtivo } =
    useJarvisCorrecaoModelosReferencia();

  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<ModeloReferencia | null>(null);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<ModeloReferencia | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues,
  });

  const [nc1, nc2, nc3, nc4, nc5] = watch(["nota_c1", "nota_c2", "nota_c3", "nota_c4", "nota_c5"]);

  useEffect(() => {
    setValue("nota_total", (nc1 || 0) + (nc2 || 0) + (nc3 || 0) + (nc4 || 0) + (nc5 || 0));
  }, [nc1, nc2, nc3, nc4, nc5, setValue]);

  const abrirCriar = () => {
    setEditando(null);
    reset(defaultValues);
    setShowForm(true);
  };

  const abrirEditar = (modelo: ModeloReferencia) => {
    setEditando(modelo);
    reset({
      titulo: modelo.titulo,
      tema: modelo.tema,
      texto_aluno: modelo.texto_aluno,
      nota_total: modelo.nota_total,
      nota_c1: modelo.nota_c1,
      nota_c2: modelo.nota_c2,
      nota_c3: modelo.nota_c3,
      nota_c4: modelo.nota_c4,
      nota_c5: modelo.nota_c5,
      justificativa_c1: modelo.justificativa_c1 || "",
      justificativa_c2: modelo.justificativa_c2 || "",
      justificativa_c3: modelo.justificativa_c3 || "",
      justificativa_c4: modelo.justificativa_c4 || "",
      justificativa_c5: modelo.justificativa_c5 || "",
      erros_identificados: modelo.erros_identificados || "",
      sugestoes_melhoria: modelo.sugestoes_melhoria || "",
      comentario_pedagogico: modelo.comentario_pedagogico || "",
      ativo: modelo.ativo,
    });
    setShowForm(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        nota_total: Number(data.nota_total),
        nota_c1: Number(data.nota_c1),
        nota_c2: Number(data.nota_c2),
        nota_c3: Number(data.nota_c3),
        nota_c4: Number(data.nota_c4),
        nota_c5: Number(data.nota_c5),
      };
      if (editando) {
        await editarModelo.mutateAsync({ id: editando.id, data: payload });
      } else {
        await criarModelo.mutateAsync(payload as any);
      }
      setShowForm(false);
      setEditando(null);
    } catch {
      // tratado no hook
    }
  };

  const confirmarDelete = () => {
    if (deletando) {
      deletarModelo.mutate(deletando);
      setDeletando(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Modelos de Referência</CardTitle>
              <CardDescription>
                Exemplos pedagógicos que calibram o padrão avaliativo da Correção IA por few-shot
                learning. A IA aprende o estilo e o rigor esperado a partir desses modelos.
              </CardDescription>
            </div>
            <Button onClick={abrirCriar}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Modelo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!modelos || modelos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum modelo de referência cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {modelos.map((modelo) => (
                <div
                  key={modelo.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{modelo.titulo}</p>
                      {modelo.ativo ? (
                        <Badge variant="default" className="bg-green-500 shrink-0">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{modelo.tema}</p>
                    <div className="flex gap-3 mt-1.5 text-xs font-mono text-muted-foreground">
                      <span>Total: {modelo.nota_total}</span>
                      <span>C1:{modelo.nota_c1}</span>
                      <span>C2:{modelo.nota_c2}</span>
                      <span>C3:{modelo.nota_c3}</span>
                      <span>C4:{modelo.nota_c4}</span>
                      <span>C5:{modelo.nota_c5}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisualizando(modelo)}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleAtivo.mutate({ id: modelo.id, ativo: !modelo.ativo })
                      }
                      title={modelo.ativo ? "Desativar" : "Ativar"}
                    >
                      {modelo.ativo ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirEditar(modelo)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletando(modelo.id)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Criar / Editar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar: ${editando.titulo}` : "Novo Modelo de Referência"}
            </DialogTitle>
            <DialogDescription>
              Preencha o texto original do aluno e o gabarito pedagógico esperado por competência.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
            {/* Campos ocultos para registrar as notas no react-hook-form */}
            <input type="hidden" {...register("nota_c1", { valueAsNumber: true })} />
            <input type="hidden" {...register("nota_c2", { valueAsNumber: true })} />
            <input type="hidden" {...register("nota_c3", { valueAsNumber: true })} />
            <input type="hidden" {...register("nota_c4", { valueAsNumber: true })} />
            <input type="hidden" {...register("nota_c5", { valueAsNumber: true })} />
            <input type="hidden" {...register("nota_total", { valueAsNumber: true })} />

            <div>
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Redação 640 pontos — boa argumentação"
                {...register("titulo", { required: "Título é obrigatório" })}
              />
              {errors.titulo && <p className="text-xs text-destructive mt-1">{errors.titulo.message}</p>}
            </div>

            <div>
              <Label>Tema *</Label>
              <Input
                placeholder="Ex: Desafios para o combate à violência contra a mulher"
                {...register("tema", { required: "Tema é obrigatório" })}
              />
            </div>

            <div>
              <Label>Texto Original do Aluno *</Label>
              <Textarea
                rows={10}
                className="font-mono text-sm"
                placeholder="Cole aqui a redação original do aluno..."
                {...register("texto_aluno", { required: "Texto é obrigatório" })}
              />
            </div>

            {/* Notas com chips clicáveis */}
            <div>
              <p className="text-sm font-semibold mb-3">Notas esperadas</p>
              <div className="space-y-2.5">
                {CAMPOS_COMP.map(({ key, label }) => {
                  const currentVal = watch(`nota_${key}` as any) ?? 0;
                  return (
                    <div key={key} className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-muted-foreground w-52 shrink-0">{label}</span>
                      <div className="flex gap-1.5">
                        {SCORES.map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setValue(`nota_${key}` as any, score)}
                            className={cn(
                              "min-w-[44px] h-9 px-2 text-sm font-semibold rounded-lg border transition-colors",
                              currentVal === score
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-accent border-input text-foreground"
                            )}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  {(nc1 || 0) + (nc2 || 0) + (nc3 || 0) + (nc4 || 0) + (nc5 || 0)}
                </span>
                <span className="text-sm text-muted-foreground">/ 1000</span>
              </div>
            </div>

            {/* Justificativas por competência */}
            <div>
              <p className="text-sm font-semibold mb-3">Justificativas por competência</p>
              <div className="space-y-3">
                {CAMPOS_COMP.map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Textarea
                      rows={3}
                      placeholder={`Justificativa para ${key.toUpperCase()}...`}
                      {...register(`justificativa_${key}` as any)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Erros identificados</Label>
              <Textarea
                rows={4}
                placeholder="Liste os principais erros encontrados nessa redação e como deveriam ser identificados..."
                {...register("erros_identificados")}
              />
            </div>

            <div>
              <Label>Sugestões de melhoria</Label>
              <Textarea
                rows={4}
                placeholder="O que o aluno poderia melhorar para atingir uma nota maior..."
                {...register("sugestoes_melhoria")}
              />
            </div>

            <div>
              <Label>Comentário pedagógico final</Label>
              <Textarea
                rows={4}
                placeholder="Síntese avaliativa que exemplifica o tom e a profundidade esperados da IA..."
                {...register("comentario_pedagogico")}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={criarModelo.isPending || editarModelo.isPending}
              >
                {(criarModelo.isPending || editarModelo.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editando ? "Salvar alterações" : "Criar modelo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Visualizar */}
      {visualizando && (
        <Dialog open={!!visualizando} onOpenChange={() => setVisualizando(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{visualizando.titulo}</DialogTitle>
              <DialogDescription>{visualizando.tema}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm font-semibold mb-2">Notas</p>
                <div className="flex gap-4 font-mono text-sm">
                  <span>Total: <strong>{visualizando.nota_total}</strong></span>
                  {(["c1","c2","c3","c4","c5"] as const).map((k) => (
                    <span key={k}>{k.toUpperCase()}: <strong>{(visualizando as any)[`nota_${k}`]}</strong></span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Texto do aluno</p>
                <pre className="bg-muted p-3 rounded-md text-xs whitespace-pre-wrap">
                  {visualizando.texto_aluno}
                </pre>
              </div>
              {(["c1","c2","c3","c4","c5"] as const).map((k) => {
                const just = (visualizando as any)[`justificativa_${k}`];
                if (!just) return null;
                return (
                  <div key={k}>
                    <p className="text-sm font-semibold mb-1">
                      {CAMPOS_COMP.find((c) => c.key === k)?.label}
                    </p>
                    <p className="text-sm text-muted-foreground">{just}</p>
                  </div>
                );
              })}
              {visualizando.erros_identificados && (
                <div>
                  <p className="text-sm font-semibold mb-1">Erros identificados</p>
                  <p className="text-sm text-muted-foreground">{visualizando.erros_identificados}</p>
                </div>
              )}
              {visualizando.comentario_pedagogico && (
                <div>
                  <p className="text-sm font-semibold mb-1">Comentário pedagógico final</p>
                  <p className="text-sm text-muted-foreground">{visualizando.comentario_pedagogico}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AlertDialog: Deletar */}
      <AlertDialog open={!!deletando} onOpenChange={() => setDeletando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Modelo de Referência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O modelo será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
