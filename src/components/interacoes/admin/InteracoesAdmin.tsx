import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, MoreHorizontal, ChevronRight,
  BarChart2, Users, ArrowLeft, GripVertical, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useInteracoesAdmin,
  useCreateInteracao,
  useUpdateInteracao,
  useToggleInteracaoAtiva,
  useDeleteInteracao,
  useResultadoInteracao,
  type Interacao,
  type InteracaoAlternativa,
} from '@/hooks/useInteratividade';

// ── Schema do formulário ─────────────────────────────────────────────────────

const altSchema = z.object({ texto: z.string().min(1, 'Texto obrigatório') });

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório'),
  descricao: z.string().optional(),
  pergunta: z.string().min(1, 'Pergunta obrigatória'),
  ativa: z.boolean(),
  mostrar_resultado_aluno: z.boolean(),
  encerramento_em: z.string().optional(),
  alternativas: z.array(altSchema).min(2, 'Mínimo de 2 alternativas'),
});

type FormData = z.infer<typeof schema>;

// ── Componente principal ─────────────────────────────────────────────────────

type Tela = 'lista' | 'form' | 'resultado';

export const InteracoesAdmin = () => {
  const { data: interacoes = [], isLoading } = useInteracoesAdmin();
  const [tela, setTela] = useState<Tela>('lista');
  const [editando, setEditando] = useState<(Interacao & { alternativas: InteracaoAlternativa[] }) | null>(null);
  const [visualizando, setVisualizando] = useState<Interacao | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState<string | null>(null);

  const createMutation = useCreateInteracao();
  const updateMutation = useUpdateInteracao();
  const toggleAtiva = useToggleInteracaoAtiva();
  const deleteMutation = useDeleteInteracao();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '',
      descricao: '',
      pergunta: '',
      ativa: true,
      mostrar_resultado_aluno: false,
      encerramento_em: '',
      alternativas: [{ texto: '' }, { texto: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'alternativas' });

  const abrirNova = () => {
    setEditando(null);
    reset({
      titulo: '',
      descricao: '',
      pergunta: '',
      ativa: true,
      mostrar_resultado_aluno: false,
      encerramento_em: '',
      alternativas: [{ texto: '' }, { texto: '' }],
    });
    setTela('form');
  };

  const abrirEdicao = (item: Interacao & { alternativas: InteracaoAlternativa[] }) => {
    setEditando(item);
    reset({
      titulo: item.titulo,
      descricao: item.descricao ?? '',
      pergunta: item.pergunta,
      ativa: item.ativa,
      mostrar_resultado_aluno: item.mostrar_resultado_aluno,
      encerramento_em: item.encerramento_em
        ? item.encerramento_em.slice(0, 16)
        : '',
      alternativas: item.alternativas
        .sort((a, b) => a.ordem - b.ordem)
        .map(a => ({ texto: a.texto })),
    });
    setTela('form');
  };

  const abrirResultado = (item: Interacao) => {
    setVisualizando(item);
    setTela('resultado');
  };

  const voltar = () => {
    setTela('lista');
    setEditando(null);
    setVisualizando(null);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      titulo: data.titulo,
      descricao: data.descricao || null,
      tipo: 'enquete' as const,
      pergunta: data.pergunta,
      ativa: data.ativa,
      mostrar_resultado_aluno: data.mostrar_resultado_aluno,
      ordem: editando?.ordem ?? interacoes.length,
      encerramento_em: data.encerramento_em || null,
    };

    const alts = data.alternativas.map((a, i) => ({ texto: a.texto, ordem: i }));

    if (editando) {
      await updateMutation.mutateAsync({ id: editando.id, interacao: payload, alternativas: alts });
    } else {
      await createMutation.mutateAsync({ interacao: payload, alternativas: alts });
    }
    voltar();
  };

  // ── Tela: formulário ─────────────────────────────────────────────────────

  if (tela === 'form') {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={voltar}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <h2 className="text-xl font-semibold">
            {editando ? 'Editar Interação' : 'Nova Interação'}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" {...register('titulo')} placeholder="Ex: Opinião sobre o tema de hoje" />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição / Instrução</Label>
            <Textarea
              id="descricao"
              {...register('descricao')}
              placeholder="Instrução breve exibida ao aluno (opcional)"
              rows={2}
            />
          </div>

          {/* Pergunta */}
          <div className="space-y-1.5">
            <Label htmlFor="pergunta">Pergunta *</Label>
            <Textarea
              id="pergunta"
              {...register('pergunta')}
              placeholder="Ex: Qual competência você acha mais difícil?"
              rows={2}
            />
            {errors.pergunta && <p className="text-xs text-destructive">{errors.pergunta.message}</p>}
          </div>

          {/* Alternativas */}
          <div className="space-y-3">
            <Label>Alternativas * (mínimo 2)</Label>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                  <span className="text-sm font-medium text-gray-400 w-5 text-center">{idx + 1}</span>
                  <Input
                    {...register(`alternativas.${idx}.texto`)}
                    placeholder={`Alternativa ${idx + 1}`}
                    className="flex-1"
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-destructive"
                      onClick={() => remove(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.alternativas && (
              <p className="text-xs text-destructive">
                {typeof errors.alternativas.message === 'string'
                  ? errors.alternativas.message
                  : 'Verifique as alternativas'}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ texto: '' })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar alternativa
            </Button>
          </div>

          {/* Encerramento */}
          <div className="space-y-1.5">
            <Label htmlFor="encerramento_em">Data de encerramento (opcional)</Label>
            <Input
              id="encerramento_em"
              type="datetime-local"
              {...register('encerramento_em')}
            />
          </div>

          {/* Switches */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Interação ativa</p>
                <p className="text-xs text-gray-500">Alunos conseguem ver e responder</p>
              </div>
              <Switch
                checked={watch('ativa')}
                onCheckedChange={v => setValue('ativa', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Exibir resultado ao aluno</p>
                <p className="text-xs text-gray-500">O aluno vê o placar após responder</p>
              </div>
              <Switch
                checked={watch('mostrar_resultado_aluno')}
                onCheckedChange={v => setValue('mostrar_resultado_aluno', v)}
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar interação'}
            </Button>
            <Button type="button" variant="outline" onClick={voltar}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Tela: resultado ──────────────────────────────────────────────────────

  if (tela === 'resultado' && visualizando) {
    return (
      <ResultadoView interacao={visualizando} onVoltar={voltar} />
    );
  }

  // ── Tela: lista ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {interacoes.length} {interacoes.length === 1 ? 'interação cadastrada' : 'interações cadastradas'}
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nova interação
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : interacoes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Nenhuma interação criada</p>
          <p className="text-sm mt-1">Crie a primeira enquete ou votação para os alunos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interacoes.map(item => (
            <InteracaoCard
              key={item.id}
              item={item}
              dropdownAberto={dropdownAberto}
              setDropdownAberto={setDropdownAberto}
              onEditar={() => abrirEdicao(item)}
              onResultado={() => abrirResultado(item)}
              onToggle={() => toggleAtiva.mutate({ id: item.id, ativa: !item.ativa })}
              onExcluir={() => setExcluindoId(item.id)}
            />
          ))}
        </div>
      )}

      {/* Dialog de exclusão */}
      <AlertDialog
        open={!!excluindoId}
        onOpenChange={open => { if (!open) setExcluindoId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir interação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todas as respostas dos alunos também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (excluindoId) {
                  deleteMutation.mutate(excluindoId);
                  setExcluindoId(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── Card de item na lista ────────────────────────────────────────────────────

interface CardProps {
  item: Interacao & { alternativas: InteracaoAlternativa[] };
  dropdownAberto: string | null;
  setDropdownAberto: (id: string | null) => void;
  onEditar: () => void;
  onResultado: () => void;
  onToggle: () => void;
  onExcluir: () => void;
}

const InteracaoCard = ({
  item, dropdownAberto, setDropdownAberto,
  onEditar, onResultado, onToggle, onExcluir,
}: CardProps) => {
  const [excluirOpen, setExcluirOpen] = useState(false);

  return (
    <>
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{item.titulo}</h3>
                <Badge variant={item.ativa ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {item.ativa ? 'Ativa' : 'Inativa'}
                </Badge>
                {item.mostrar_resultado_aluno && (
                  <Badge variant="outline" className="text-xs shrink-0">Resultado visível</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">{item.pergunta}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{item.alternativas.length} alternativas</span>
                {item.encerramento_em && (
                  <span>
                    Encerra: {format(new Date(item.encerramento_em), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={onResultado}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Resultados
              </Button>

              <DropdownMenu
                open={dropdownAberto === item.id}
                onOpenChange={open => setDropdownAberto(open ? item.id : null)}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onCloseAutoFocus={e => e.preventDefault()}
                >
                  <DropdownMenuItem onClick={() => {
                    setDropdownAberto(null);
                    setTimeout(onEditar, 100);
                  }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setDropdownAberto(null);
                    onToggle();
                  }}>
                    {item.ativa ? 'Desativar' : 'Ativar'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setDropdownAberto(null);
                      setTimeout(() => setExcluirOpen(true), 100);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{item.titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todas as respostas dos alunos também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { setExcluirOpen(false); onExcluir(); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ── Painel de resultados ─────────────────────────────────────────────────────

const ResultadoView = ({ interacao, onVoltar }: { interacao: Interacao; onVoltar: () => void }) => {
  const { data, isLoading } = useResultadoInteracao(interacao.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{interacao.titulo}</h2>
          <p className="text-sm text-muted-foreground">{interacao.pergunta}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
      ) : !data ? null : (
        <>
          {/* Resumo */}
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center gap-2 text-primary">
                <Users className="w-5 h-5" />
                <span className="text-2xl font-bold">{data.total}</span>
              </div>
              <p className="text-sm text-gray-600">
                {data.total === 1 ? 'participação registrada' : 'participações registradas'}
              </p>
            </CardContent>
          </Card>

          {/* Barras por alternativa */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição das respostas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.resultados.map(r => (
                <div key={r.alternativa_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{r.texto}</span>
                    <span className="font-semibold text-gray-900 shrink-0 ml-2">
                      {r.votos} {r.votos === 1 ? 'voto' : 'votos'} — {r.percentual}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${r.percentual}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Lista de participantes */}
          {data.participantes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {data.participantes.map((p, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{p.email_aluno}</p>
                        <p className="text-gray-500 text-xs mt-0.5">Respondeu: {p.alternativa_texto}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-3">
                        {format(new Date(p.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
