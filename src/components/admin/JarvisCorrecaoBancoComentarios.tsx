import { useState } from "react";
import {
  useJarvisCorrecaoBancoComentarios,
  BancoComentario,
  Competencia,
} from "@/hooks/useJarvisCorrecaoBancoComentarios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Edit, Trash2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";

type FormData = {
  competencia: Competencia;
  categoria: string;
  texto: string;
  ativo: boolean;
};

const ABAS: { key: Competencia; label: string }[] = [
  { key: "geral", label: "Orientações Gerais" },
  { key: "c1", label: "Competência 1" },
  { key: "c2", label: "Competência 2" },
  { key: "c3", label: "Competência 3" },
  { key: "c4", label: "Competência 4" },
  { key: "c5", label: "Competência 5" },
];

const COMP_LABEL: Record<Competencia, string> = {
  geral: "Orientações Gerais",
  c1: "C1",
  c2: "C2",
  c3: "C3",
  c4: "C4",
  c5: "C5",
};

const ComentarioLista = ({ competencia }: { competencia: Competencia }) => {
  const { comentarios, isLoading, remover, toggleAtivo } =
    useJarvisCorrecaoBancoComentarios(competencia);

  const [editando, setEditando] = useState<BancoComentario | null>(null);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      competencia,
      categoria: "",
      texto: "",
      prioridade: 0,
      ativo: true,
    },
  });

  const { criar, editar } = useJarvisCorrecaoBancoComentarios();

  const abrirCriar = () => {
    setEditando(null);
    reset({ competencia, categoria: "", texto: "", ativo: true });
    setShowForm(true);
  };

  const abrirEditar = (c: BancoComentario) => {
    setEditando(c);
    reset({
      competencia: c.competencia,
      categoria: c.categoria || "",
      texto: c.texto,
      ativo: c.ativo,
    });
    setShowForm(true);
  };

  const onSubmit = async (data: FormData) => {
    if (editando) {
      await editar.mutateAsync({ id: editando.id, data });
    } else {
      await criar.mutateAsync(data);
    }
    setShowForm(false);
    setEditando(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const ativos = comentarios?.filter((c) => c.ativo) ?? [];
  const inativos = comentarios?.filter((c) => !c.ativo) ?? [];

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {ativos.length} comentário(s) ativo(s)
            {inativos.length > 0 && ` · ${inativos.length} inativo(s)`}
          </p>
          <Button size="sm" onClick={abrirCriar}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar
          </Button>
        </div>

        {comentarios && comentarios.length === 0 && (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Nenhum comentário cadastrado para esta competência ainda.
          </div>
        )}

        {/* Ativos */}
        {ativos.map((c) => (
          <div
            key={c.id}
            className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50/40 p-3"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <div className="flex-1 min-w-0">
              {c.categoria && (
                <span className="mb-1 inline-block rounded-full bg-[#efe4ff] px-2 py-0.5 text-[10px] font-bold text-[#4B0082]">
                  {c.categoria}
                </span>
              )}
              <p className="text-sm text-zinc-800">{c.texto}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleAtivo.mutate({ id: c.id, ativo: false })}
                title="Desativar"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => abrirEditar(c)}
                title="Editar"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletando(c.id)}
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {/* Inativos */}
        {inativos.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-muted-foreground">Inativos</p>
            {inativos.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 rounded-lg border bg-zinc-50/60 p-3 opacity-60"
              >
                <div className="flex-1 min-w-0">
                  {c.categoria && (
                    <span className="mb-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                      {c.categoria}
                    </span>
                  )}
                  <p className="text-sm text-zinc-600">{c.texto}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAtivo.mutate({ id: c.id, ativo: true })}
                    title="Ativar"
                  >
                    <Eye className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirEditar(c)}
                    title="Editar"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletando(c.id)}
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar comentário" : `Novo comentário — ${COMP_LABEL[competencia]}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div>
              <Label>Categoria (opcional)</Label>
              <Input
                placeholder="Ex: ortografia, concordância, repertório..."
                {...register("categoria")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Subcategoria para organização interna. Não aparece para o professor.
              </p>
            </div>
            <div>
              <Label>Texto do comentário *</Label>
              <Textarea
                rows={4}
                placeholder="Ex: Corrija os erros de concordância verbal identificados no texto."
                {...register("texto", { required: true })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A IA seleciona este comentário quando ele se aplica ao texto do aluno.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={criar.isPending || editar.isPending}
              >
                {(criar.isPending || editar.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editando ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Deletar */}
      <AlertDialog open={!!deletando} onOpenChange={() => setDeletando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              O comentário será permanentemente removido do banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletando) {
                  remover.mutate(deletando);
                  setDeletando(null);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const JarvisCorrecaoBancoComentarios = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banco de Comentários Pedagógicos</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="geral">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            {ABAS.map((aba) => (
              <TabsTrigger key={aba.key} value={aba.key} className="text-xs">
                {aba.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {ABAS.map((aba) => (
            <TabsContent key={aba.key} value={aba.key}>
              <ComentarioLista competencia={aba.key} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
