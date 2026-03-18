import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useRepertorioLaboratorio,
  LaboratorioAula,
  NovaAulaInput,
  converterParaWebP,
  uploadImagemAutor,
} from '@/hooks/useRepertorioLaboratorio';
import { EIXOS_TEMATICOS, getEixoColors } from '@/utils/eixoTematicoCores';
import { Upload, X, Loader2, User } from 'lucide-react';

const schema = z.object({
  titulo: z.string().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  subtitulo: z.string().min(10, 'Mínimo 10 caracteres').max(150, 'Máximo 150 caracteres'),
  frase_tematica: z.string().min(10, 'Mínimo 10 caracteres').max(500, 'Máximo 500 caracteres'),
  nome_autor: z.string().min(2, 'Mínimo 2 caracteres').max(150, 'Máximo 150 caracteres'),
  descricao_autor: z.string().min(20, 'Mínimo 20 caracteres').max(600, 'Máximo 600 caracteres'),
  obra_referencia: z.string().min(2, 'Mínimo 2 caracteres').max(200, 'Máximo 200 caracteres'),
  ideia_central: z.string().min(20, 'Mínimo 20 caracteres').max(1000, 'Máximo 1000 caracteres'),
  paragrafo_modelo: z.string().min(50, 'Mínimo 50 caracteres').max(3000, 'Máximo 3000 caracteres'),
  observacao_paragrafo: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
});

type FormValues = z.infer<typeof schema>;

interface LaboratorioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aulaParaEditar?: LaboratorioAula | null;
  onSuccess?: () => void;
}

export function LaboratorioForm({ open, onOpenChange, aulaParaEditar, onSuccess }: LaboratorioFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { criarAula, editarAula, isCriando, isEditando } = useRepertorioLaboratorio();
  const isEditing = !!aulaParaEditar;
  const isSaving = isCriando || isEditando;

  const [eixosSelecionados, setEixosSelecionados] = useState<string[]>([]);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [uploadingImagem, setUploadingImagem] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Preencher formulário ao editar
  useEffect(() => {
    if (aulaParaEditar && open) {
      reset({
        titulo: aulaParaEditar.titulo,
        subtitulo: aulaParaEditar.subtitulo,
        frase_tematica: aulaParaEditar.frase_tematica,
        nome_autor: aulaParaEditar.nome_autor,
        descricao_autor: aulaParaEditar.descricao_autor,
        obra_referencia: aulaParaEditar.obra_referencia,
        ideia_central: aulaParaEditar.ideia_central,
        paragrafo_modelo: aulaParaEditar.paragrafo_modelo,
        observacao_paragrafo: aulaParaEditar.observacao_paragrafo ?? '',
      });
      setEixosSelecionados(aulaParaEditar.eixos || []);
      setImagemPreview(aulaParaEditar.imagem_autor_url || null);
      setImagemFile(null);
    } else if (!open) {
      reset({});
      setEixosSelecionados([]);
      setImagemPreview(null);
      setImagemFile(null);
    }
  }, [aulaParaEditar, open, reset]);

  const toggleEixo = (eixo: string) => {
    setEixosSelecionados((prev) =>
      prev.includes(eixo) ? prev.filter((e) => e !== eixo) : [...prev, eixo]
    );
  };

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Selecione uma imagem válida.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'Imagem deve ter no máximo 5MB.', variant: 'destructive' });
      return;
    }

    setImagemFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagemPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: FormValues) => {
    if (eixosSelecionados.length === 0) {
      toast({ title: 'Atenção', description: 'Selecione pelo menos um eixo temático.', variant: 'destructive' });
      return;
    }

    let imagemUrl: string | null | undefined = aulaParaEditar?.imagem_autor_url ?? null;

    // Upload de imagem se houver arquivo novo
    if (imagemFile) {
      setUploadingImagem(true);
      try {
        // Precisamos de um ID para o path. No create, usamos um UUID temporário
        // que será o mesmo do registro (criado pelo banco).
        // Estratégia: criar registro primeiro (sem imagem), depois upload com o ID retornado.
        const webpBlob = await converterParaWebP(imagemFile);

        if (isEditing && aulaParaEditar) {
          imagemUrl = await uploadImagemAutor(aulaParaEditar.id, webpBlob);
        } else {
          // Para criação, vamos fazer o upload após criar o registro
          // Guardamos o blob para usar logo após
          imagemUrl = null; // será preenchido abaixo
        }
      } catch (err) {
        console.error('Erro no upload da imagem:', err);
        toast({ title: 'Erro no upload', description: 'Não foi possível enviar a imagem.', variant: 'destructive' });
        setUploadingImagem(false);
        return;
      } finally {
        setUploadingImagem(false);
      }
    }

    const input: NovaAulaInput = {
      ...values,
      eixos: eixosSelecionados,
      observacao_paragrafo: values.observacao_paragrafo || null,
      imagem_autor_url: imagemUrl,
    };

    try {
      if (isEditing && aulaParaEditar) {
        await editarAula(aulaParaEditar.id, input);
      } else {
        const novaAula = await criarAula(input);

        // Se havia arquivo de imagem, fazer upload agora com o ID real
        if (imagemFile && novaAula?.id) {
          setUploadingImagem(true);
          try {
            const webpBlob = await converterParaWebP(imagemFile);
            const url = await uploadImagemAutor(novaAula.id, webpBlob);
            // Atualizar a URL no registro recém-criado
            await supabase
              .from('repertorio_laboratorio')
              .update({ imagem_autor_url: url })
              .eq('id', novaAula.id);
            // Invalidar cache para refletir a imagem recém-salva
            queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio'] });
            queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio-admin'] });
          } catch (err) {
            console.error('Erro ao atualizar imagem após criação:', err);
          } finally {
            setUploadingImagem(false);
          }
        }
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Erros já tratados nas mutations
    }
  };

  const isLoading = isSaving || uploadingImagem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar aula' : 'Nova aula do Laboratório'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Seção 1: Contexto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide border-b border-purple-100 pb-1">
              1. Contexto
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo">Título da aula *</Label>
                <Input id="titulo" {...register('titulo')} placeholder="Ex: Nicholas Carr" />
                {errors.titulo && <p className="text-xs text-red-500">{errors.titulo.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subtitulo">
                  Subtítulo <span className="text-gray-400">(exibido no card)</span> *
                </Label>
                <Input
                  id="subtitulo"
                  {...register('subtitulo')}
                  placeholder="Ex: Tecnologia e o pensamento humano"
                />
                {errors.subtitulo && <p className="text-xs text-red-500">{errors.subtitulo.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="frase_tematica">Frase temática *</Label>
              <Textarea
                id="frase_tematica"
                {...register('frase_tematica')}
                placeholder="A frase de contextualização do tema..."
                rows={2}
              />
              {errors.frase_tematica && <p className="text-xs text-red-500">{errors.frase_tematica.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Eixos temáticos * <span className="text-gray-400 font-normal">(selecione um ou mais)</span></Label>
              <div className="flex flex-wrap gap-2">
                {EIXOS_TEMATICOS.map((eixo) => {
                  const selected = eixosSelecionados.includes(eixo);
                  const colors = getEixoColors(eixo);
                  return (
                    <Badge
                      key={eixo}
                      variant="outline"
                      onClick={() => toggleEixo(eixo)}
                      className={`cursor-pointer px-3 py-1 transition-all ${
                        selected
                          ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm`
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {eixo}
                    </Badge>
                  );
                })}
              </div>
              {eixosSelecionados.length === 0 && (
                <p className="text-xs text-gray-400">Nenhum eixo selecionado</p>
              )}
            </div>
          </div>

          {/* Seção 2: Repertório */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide border-b border-purple-100 pb-1">
              2. Repertório
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome_autor">Nome do autor *</Label>
                <Input id="nome_autor" {...register('nome_autor')} placeholder="Ex: Nicholas Carr" />
                {errors.nome_autor && <p className="text-xs text-red-500">{errors.nome_autor.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obra_referencia">Obra de referência *</Label>
                <Input
                  id="obra_referencia"
                  {...register('obra_referencia')}
                  placeholder="Ex: A Geração Superficial"
                />
                {errors.obra_referencia && <p className="text-xs text-red-500">{errors.obra_referencia.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao_autor">Descrição do autor *</Label>
              <Textarea
                id="descricao_autor"
                {...register('descricao_autor')}
                placeholder="Quem é essa pessoa e por que ela importa..."
                rows={3}
              />
              {errors.descricao_autor && <p className="text-xs text-red-500">{errors.descricao_autor.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ideia_central">Ideia central *</Label>
              <Textarea
                id="ideia_central"
                {...register('ideia_central')}
                placeholder="A ideia principal do repertório que o aluno deve guardar..."
                rows={4}
              />
              {errors.ideia_central && <p className="text-xs text-red-500">{errors.ideia_central.message}</p>}
            </div>

            {/* Upload da imagem do autor */}
            <div className="space-y-2">
              <Label>Imagem do autor</Label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0">
                  {imagemPreview ? (
                    <img src={imagemPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImagemChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {imagemPreview ? 'Trocar imagem' : 'Selecionar imagem'}
                  </Button>
                  {imagemPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImagemPreview(null);
                        setImagemFile(null);
                      }}
                      className="gap-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                      Remover
                    </Button>
                  )}
                  <p className="text-xs text-gray-400">
                    JPG, PNG ou WebP · Máx 5MB · Convertida para WebP automaticamente
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Parágrafo Modelo */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide border-b border-purple-100 pb-1">
              3. Parágrafo Modelo
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="paragrafo_modelo">Parágrafo ENEM *</Label>
              <Textarea
                id="paragrafo_modelo"
                {...register('paragrafo_modelo')}
                placeholder="O parágrafo completo no padrão ENEM aplicando o repertório ao tema..."
                rows={8}
              />
              {errors.paragrafo_modelo && (
                <p className="text-xs text-red-500">{errors.paragrafo_modelo.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacao_paragrafo">
                Observação didática{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="observacao_paragrafo"
                {...register('observacao_paragrafo')}
                placeholder="Explique ao aluno o que observar no parágrafo: como o repertório foi conectado ao tema, quais elementos estruturais foram usados, o que torna esse parágrafo eficaz..."
                rows={5}
              />
              {errors.observacao_paragrafo && (
                <p className="text-xs text-red-500">{errors.observacao_paragrafo.message}</p>
              )}
              <p className="text-xs text-gray-400">
                Esse texto aparece abaixo do parágrafo na aula do aluno como comentário do professor.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar alterações' : 'Criar aula'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
