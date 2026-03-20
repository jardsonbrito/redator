import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageSelector } from './ImageSelector';
import { useGuiaTematico, GuiaTematico, NovoGuiaInput } from '@/hooks/useGuiaTematico';
import { Plus, Trash2, Loader2 } from 'lucide-react';

// ==================== SCHEMA ====================

const itemSchema = z.object({
  titulo: z.string().min(2, 'Obrigatório'),
  descricao: z.string().min(5, 'Obrigatório'),
});

const schema = z.object({
  frase_tematica: z.string().min(5, 'Mínimo 5 caracteres'),
  comando_tema: z.string().min(5, 'Mínimo 5 caracteres'),
  nucleo_tematico: z.string().min(2, 'Mínimo 2 caracteres'),
  contexto: z.string().min(5, 'Mínimo 5 caracteres'),
  perguntas_norteadoras: z
    .array(z.object({ pergunta: z.string().min(5, 'Mínimo 5 caracteres') }))
    .min(1, 'Adicione ao menos uma pergunta'),
  interpretacao: z.string().min(20, 'Mínimo 20 caracteres'),
  vocabulario: z.array(itemSchema).min(1, 'Adicione ao menos um termo'),
  problematica_central: z.string().min(20, 'Mínimo 20 caracteres'),
  problematicas_associadas: z.array(itemSchema).min(1, 'Adicione ao menos uma problemática'),
  propostas_solucao: z.array(itemSchema).min(1, 'Adicione ao menos uma proposta'),
});

type FormValues = z.infer<typeof schema>;

type ImageValue = {
  source: 'upload' | 'url';
  url?: string;
  file_path?: string;
} | null;

// ==================== PROPS ====================

interface GuiaTematicoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guiaParaEditar?: GuiaTematico | null;
  onSuccess?: () => void;
}

// ==================== COMPONENTE ====================

export function GuiaTematicoForm({
  open,
  onOpenChange,
  guiaParaEditar,
  onSuccess,
}: GuiaTematicoFormProps) {
  const { criarGuia, editarGuia, isCriando, isEditando } = useGuiaTematico();
  const isEditing = !!guiaParaEditar;
  const isSaving = isCriando || isEditando;

  const [cover, setCover] = useState<ImageValue>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      frase_tematica: '',
      comando_tema: '',
      nucleo_tematico: '',
      contexto: '',
      perguntas_norteadoras: [{ pergunta: '' }],
      interpretacao: '',
      vocabulario: [{ titulo: '', descricao: '' }],
      problematica_central: '',
      problematicas_associadas: [{ titulo: '', descricao: '' }],
      propostas_solucao: [{ titulo: '', descricao: '' }],
    },
  });

  const {
    fields: perguntasFields,
    append: appendPergunta,
    remove: removePergunta,
  } = useFieldArray({ control, name: 'perguntas_norteadoras' });

  const {
    fields: vocabularioFields,
    append: appendVocabulario,
    remove: removeVocabulario,
  } = useFieldArray({ control, name: 'vocabulario' });

  const {
    fields: problematicasFields,
    append: appendProblematica,
    remove: removeProblematica,
  } = useFieldArray({ control, name: 'problematicas_associadas' });

  const {
    fields: propostasFields,
    append: appendProposta,
    remove: removeProposta,
  } = useFieldArray({ control, name: 'propostas_solucao' });

  // Popula o form ao editar
  useEffect(() => {
    if (guiaParaEditar) {
      reset({
        frase_tematica: guiaParaEditar.frase_tematica,
        comando_tema: guiaParaEditar.comando_tema,
        nucleo_tematico: guiaParaEditar.nucleo_tematico,
        contexto: guiaParaEditar.contexto,
        perguntas_norteadoras:
          guiaParaEditar.perguntas_norteadoras.length > 0
            ? guiaParaEditar.perguntas_norteadoras.map((p) => ({ pergunta: p }))
            : [{ pergunta: '' }],
        interpretacao: guiaParaEditar.interpretacao,
        vocabulario:
          guiaParaEditar.vocabulario.length > 0
            ? guiaParaEditar.vocabulario
            : [{ titulo: '', descricao: '' }],
        problematica_central: guiaParaEditar.problematica_central,
        problematicas_associadas:
          guiaParaEditar.problematicas_associadas.length > 0
            ? guiaParaEditar.problematicas_associadas
            : [{ titulo: '', descricao: '' }],
        propostas_solucao:
          guiaParaEditar.propostas_solucao.length > 0
            ? guiaParaEditar.propostas_solucao
            : [{ titulo: '', descricao: '' }],
      });

      setCover(
        guiaParaEditar.cover_source
          ? {
              source: guiaParaEditar.cover_source as 'upload' | 'url',
              url: guiaParaEditar.cover_url || undefined,
              file_path: guiaParaEditar.cover_file_path || undefined,
            }
          : null
      );
    } else {
      reset({
        frase_tematica: '',
        comando_tema: '',
        nucleo_tematico: '',
        contexto: '',
        perguntas_norteadoras: [{ pergunta: '' }],
        interpretacao: '',
        vocabulario: [{ titulo: '', descricao: '' }],
        problematica_central: '',
        problematicas_associadas: [{ titulo: '', descricao: '' }],
        propostas_solucao: [{ titulo: '', descricao: '' }],
      });
      setCover(null);
    }
  }, [guiaParaEditar, reset, open]);

  const onSubmit = async (values: FormValues) => {
    const input: NovoGuiaInput = {
      frase_tematica: values.frase_tematica,
      cover_source: cover?.source ?? null,
      cover_url: cover?.url ?? null,
      cover_file_path: cover?.file_path ?? null,
      comando_tema: values.comando_tema,
      nucleo_tematico: values.nucleo_tematico,
      contexto: values.contexto,
      perguntas_norteadoras: values.perguntas_norteadoras.map((p) => p.pergunta),
      interpretacao: values.interpretacao,
      vocabulario: values.vocabulario,
      problematica_central: values.problematica_central,
      problematicas_associadas: values.problematicas_associadas,
      propostas_solucao: values.propostas_solucao,
    };

    if (isEditing) {
      await editarGuia({ id: guiaParaEditar!.id, ...input });
    } else {
      await criarGuia(input);
    }

    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Guia Temático' : 'Novo Guia Temático'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Imagem de capa */}
          <ImageSelector
            title="Imagem de capa"
            description="Imagem principal do card e da tela de abertura do guia."
            value={cover}
            onChange={setCover}
            bucket="themes"
          />

          {/* Frase temática */}
          <div className="space-y-1.5">
            <Label>Frase temática</Label>
            <Input {...register('frase_tematica')} placeholder="Digite a frase temática..." />
            {errors.frase_tematica && (
              <p className="text-xs text-red-500">{errors.frase_tematica.message}</p>
            )}
          </div>

          {/* Seção: Análise da frase temática */}
          <div className="border-t pt-5 space-y-4">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest">
              Análise da frase temática
            </p>

            <div className="space-y-1.5">
              <Label>Comando do tema</Label>
              <Textarea
                {...register('comando_tema')}
                placeholder="Qual é o comando / o que o tema pede?"
                rows={3}
              />
              {errors.comando_tema && (
                <p className="text-xs text-red-500">{errors.comando_tema.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Núcleo temático</Label>
              <Input
                {...register('nucleo_tematico')}
                placeholder="Qual é o núcleo temático central?"
              />
              {errors.nucleo_tematico && (
                <p className="text-xs text-red-500">{errors.nucleo_tematico.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Contexto</Label>
              <Textarea
                {...register('contexto')}
                placeholder="Contexto histórico, social ou cultural do tema..."
                rows={3}
              />
              {errors.contexto && (
                <p className="text-xs text-red-500">{errors.contexto.message}</p>
              )}
            </div>
          </div>

          {/* Seção: Questões norteadoras */}
          <div className="border-t pt-5 space-y-3">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest">
              Questões norteadoras
            </p>

            <div className="space-y-2">
              {perguntasFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      {...register(`perguntas_norteadoras.${index}.pergunta`)}
                      placeholder={`Pergunta ${index + 1}...`}
                    />
                    {errors.perguntas_norteadoras?.[index]?.pergunta && (
                      <p className="text-xs text-red-500">
                        {errors.perguntas_norteadoras[index]!.pergunta!.message}
                      </p>
                    )}
                  </div>
                  {perguntasFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePergunta(index)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendPergunta({ pergunta: '' })}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar pergunta
            </Button>

            {errors.perguntas_norteadoras?.root && (
              <p className="text-xs text-red-500">{errors.perguntas_norteadoras.root.message}</p>
            )}
          </div>

          {/* Seção: Interpretação do tema */}
          <div className="border-t pt-5 space-y-1.5">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-3">
              Interpretação do tema
            </p>
            <Textarea
              {...register('interpretacao')}
              placeholder="Texto interpretativo sobre o tema..."
              rows={5}
            />
            {errors.interpretacao && (
              <p className="text-xs text-red-500">{errors.interpretacao.message}</p>
            )}
          </div>

          {/* Seção: Vocabulário temático */}
          <div className="border-t pt-5 space-y-3">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest">
              Vocabulário temático
            </p>

            <div className="space-y-3">
              {vocabularioFields.map((field, index) => (
                <div key={field.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Termo {index + 1}</span>
                    {vocabularioFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVocabulario(index)}
                        className="h-6 w-6 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <Input
                    {...register(`vocabulario.${index}.titulo`)}
                    placeholder="Título / expressão..."
                  />
                  {errors.vocabulario?.[index]?.titulo && (
                    <p className="text-xs text-red-500">{errors.vocabulario[index]!.titulo!.message}</p>
                  )}
                  <Textarea
                    {...register(`vocabulario.${index}.descricao`)}
                    placeholder="Explicação do termo..."
                    rows={2}
                  />
                  {errors.vocabulario?.[index]?.descricao && (
                    <p className="text-xs text-red-500">{errors.vocabulario[index]!.descricao!.message}</p>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendVocabulario({ titulo: '', descricao: '' })}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar termo
            </Button>
          </div>

          {/* Seção: Problemática central */}
          <div className="border-t pt-5 space-y-1.5">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-3">
              Problemática central
            </p>
            <Textarea
              {...register('problematica_central')}
              placeholder="Qual é o problema central envolvido no tema?"
              rows={4}
            />
            {errors.problematica_central && (
              <p className="text-xs text-red-500">{errors.problematica_central.message}</p>
            )}
          </div>

          {/* Seção: Problemáticas associadas */}
          <div className="border-t pt-5 space-y-3">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest">
              Problemáticas associadas
            </p>

            <div className="space-y-3">
              {problematicasFields.map((field, index) => (
                <div key={field.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Problemática {index + 1}</span>
                    {problematicasFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProblematica(index)}
                        className="h-6 w-6 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <Input
                    {...register(`problematicas_associadas.${index}.titulo`)}
                    placeholder="Título da problemática..."
                  />
                  {errors.problematicas_associadas?.[index]?.titulo && (
                    <p className="text-xs text-red-500">{errors.problematicas_associadas[index]!.titulo!.message}</p>
                  )}
                  <Textarea
                    {...register(`problematicas_associadas.${index}.descricao`)}
                    placeholder="Desenvolvimento da problemática..."
                    rows={3}
                  />
                  {errors.problematicas_associadas?.[index]?.descricao && (
                    <p className="text-xs text-red-500">{errors.problematicas_associadas[index]!.descricao!.message}</p>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendProblematica({ titulo: '', descricao: '' })}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar problemática
            </Button>
          </div>

          {/* Seção: Propostas de solução */}
          <div className="border-t pt-5 space-y-3">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest">
              Propostas de solução
            </p>

            <div className="space-y-3">
              {propostasFields.map((field, index) => (
                <div key={field.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Proposta {index + 1}</span>
                    {propostasFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProposta(index)}
                        className="h-6 w-6 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <Input
                    {...register(`propostas_solucao.${index}.titulo`)}
                    placeholder="Título da proposta..."
                  />
                  {errors.propostas_solucao?.[index]?.titulo && (
                    <p className="text-xs text-red-500">{errors.propostas_solucao[index]!.titulo!.message}</p>
                  )}
                  <Textarea
                    {...register(`propostas_solucao.${index}.descricao`)}
                    placeholder="Desenvolvimento da proposta..."
                    rows={3}
                  />
                  {errors.propostas_solucao?.[index]?.descricao && (
                    <p className="text-xs text-red-500">{errors.propostas_solucao[index]!.descricao!.message}</p>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendProposta({ titulo: '', descricao: '' })}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar proposta
            </Button>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar alterações' : 'Criar guia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
