import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MicroQuizBuilder, Questao } from './MicroQuizBuilder';
import type { MicroItem } from '@/hooks/useMicroItens';
import { sanitizeFileName } from '@/utils/fileUtils';

const PLANOS = ['Largada', 'Lapidação', 'Liderança', 'Bolsista'] as const;

const ORDEM_PADRAO: Record<string, number> = {
  video: 1,
  microtexto: 2,
  card: 3,
  audio: 4,
  podcast: 5,
  infografico: 6,
  quiz: 7,
  flashcard: 8,
};

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório'),
  descricao_curta: z.string().optional(),
  tipo: z.enum(['video', 'audio', 'podcast', 'microtexto', 'infografico', 'card', 'quiz', 'flashcard']),
  status: z.enum(['ativo', 'inativo']),
  ordem: z.number().int().min(0),
  planos_permitidos: z.array(z.string()).min(1, 'Selecione ao menos um plano'),
  conteudo_url: z.string().optional(),
  conteudo_texto: z.string().optional(),
  nota_maxima: z.number().min(0).nullable().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  topicoId: string;
  item?: MicroItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MicroItemForm = ({ topicoId, item, onSuccess, onCancel }: Props) => {
  const queryClient = useQueryClient();
  const isEditing = !!item;
  const [ordemEditada, setOrdemEditada] = useState(false);
  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [questoes, setQuestoes] = useState<Questao[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: item?.titulo ?? '',
      descricao_curta: item?.descricao_curta ?? '',
      tipo: item?.tipo ?? 'video',
      status: item?.status ?? 'inativo',
      ordem: item?.ordem ?? 1,
      planos_permitidos: item?.planos_permitidos ?? [],
      conteudo_url: item?.conteudo_url ?? '',
      conteudo_texto: item?.conteudo_texto ?? '',
      nota_maxima: item?.nota_maxima ?? null,
    },
  });

  const tipo = watch('tipo');
  const planosSelected = watch('planos_permitidos');

  // Pré-preencher ordem ao mudar tipo (apenas na criação)
  useEffect(() => {
    if (!isEditing && !ordemEditada) {
      setValue('ordem', ORDEM_PADRAO[tipo] ?? 99);
    }
  }, [tipo, isEditing, ordemEditada, setValue]);

  // Carregar questões existentes
  useEffect(() => {
    if (item && item.tipo === 'quiz') {
      const carregarQuestoes = async () => {
        const { data } = await supabase
          .from('micro_quiz_questoes')
          .select('*, micro_quiz_alternativas(*)')
          .eq('item_id', item.id)
          .order('ordem', { ascending: true });

        if (data) {
          setQuestoes(data.map(q => ({
            id: q.id,
            enunciado: q.enunciado,
            tentativas_max: q.tentativas_max,
            ordem: q.ordem,
            alternativas: (q.micro_quiz_alternativas ?? []).map((a: any) => ({
              id: a.id,
              texto: a.texto,
              correta: a.correta,
              justificativa: a.justificativa ?? '',
              ordem: a.ordem,
            })),
          })));
        }
      };
      carregarQuestoes();
    }
  }, [item]);

  const togglePlano = (plano: string) => {
    const atual = planosSelected ?? [];
    if (atual.includes(plano)) {
      setValue('planos_permitidos', atual.filter(p => p !== plano));
    } else {
      setValue('planos_permitidos', [...atual, plano]);
    }
  };

  const uploadArquivo = async (itemId: string): Promise<string | null> => {
    if (!arquivoUpload) return item?.conteudo_storage_path ?? null;

    const bucket = tipo === 'audio' ? 'micro-audio'
      : tipo === 'infografico' ? 'micro-infograficos'
      : 'micro-pdfs';

    const nome = sanitizeFileName(arquivoUpload.name);
    const path = `${topicoId}/${itemId}/${Date.now()}_${nome}`;

    const { error } = await supabase.storage.from(bucket).upload(path, arquivoUpload);
    if (error) throw error;
    return path;
  };

  const salvarQuestoes = async (itemId: string) => {
    if (tipo !== 'quiz') return;

    // Remover questões antigas se editando
    if (isEditing) {
      await supabase.from('micro_quiz_questoes').delete().eq('item_id', itemId);
    }

    for (let qi = 0; qi < questoes.length; qi++) {
      const q = questoes[qi];
      const { data: questaoSalva, error: qError } = await supabase
        .from('micro_quiz_questoes')
        .insert({
          item_id: itemId,
          enunciado: q.enunciado,
          ordem: qi,
          tentativas_max: q.tentativas_max,
        })
        .select()
        .single();

      if (qError || !questaoSalva) continue;

      const alts = q.alternativas.map((a, ai) => ({
        questao_id: questaoSalva.id,
        texto: a.texto,
        correta: a.correta,
        justificativa: a.justificativa || null,
        ordem: ai,
      }));

      await supabase.from('micro_quiz_alternativas').insert(alts);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      setUploadando(true);

      let storagePath = item?.conteudo_storage_path ?? null;

      const payload = {
        topico_id: topicoId,
        titulo: data.titulo,
        descricao_curta: data.descricao_curta || null,
        tipo: data.tipo,
        status: data.status,
        ordem: data.ordem,
        planos_permitidos: data.planos_permitidos,
        conteudo_url: ['video', 'podcast'].includes(data.tipo) ? (data.conteudo_url || null) : null,
        conteudo_texto: data.tipo === 'card' ? (data.conteudo_texto || null) : null,
        conteudo_storage_path: storagePath,
        nota_maxima: data.tipo === 'quiz' ? (data.nota_maxima ?? null) : null,
      };

      let itemId = item?.id;

      if (isEditing && itemId) {
        storagePath = await uploadArquivo(itemId);
        const { error } = await supabase
          .from('micro_itens')
          .update({ ...payload, conteudo_storage_path: storagePath })
          .eq('id', itemId);
        if (error) throw error;
      } else {
        const { data: novo, error } = await supabase
          .from('micro_itens')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        itemId = novo.id;
        storagePath = await uploadArquivo(itemId!);
        if (storagePath !== payload.conteudo_storage_path) {
          await supabase
            .from('micro_itens')
            .update({ conteudo_storage_path: storagePath })
            .eq('id', itemId);
        }
      }

      await salvarQuestoes(itemId!);
    },
    onSuccess: () => {
      setUploadando(false);
      queryClient.invalidateQueries({ queryKey: ['micro-itens-admin', topicoId] });
      toast.success(isEditing ? 'Item atualizado!' : 'Item criado!');
      onSuccess();
    },
    onError: (err: any) => {
      setUploadando(false);
      toast.error(`Erro: ${err.message}`);
    },
  });

  const precisaUpload = ['audio', 'microtexto', 'infografico', 'flashcard'].includes(tipo);
  const precisaUrl = ['video', 'podcast'].includes(tipo);
  const precisaTexto = tipo === 'card';

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      {/* Tipo */}
      <div className="space-y-1">
        <Label>Tipo de conteúdo *</Label>
        <Select
          value={tipo}
          onValueChange={v => setValue('tipo', v as any)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">🎥 Vídeo</SelectItem>
            <SelectItem value="audio">🎙️ Áudio</SelectItem>
            <SelectItem value="podcast">🎧 Podcast</SelectItem>
            <SelectItem value="microtexto">📄 Microtexto (PDF)</SelectItem>
            <SelectItem value="infografico">🖼️ Infográfico</SelectItem>
            <SelectItem value="card">📌 Card (Post-it)</SelectItem>
            <SelectItem value="quiz">❓ Quiz</SelectItem>
            <SelectItem value="flashcard">🃏 Flashcard (PDF)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Título */}
      <div className="space-y-1">
        <Label>Título *</Label>
        <Input {...register('titulo')} placeholder="Ex: O que é tese?" />
        {errors.titulo && <p className="text-xs text-red-500">{errors.titulo.message}</p>}
      </div>

      {/* Descrição */}
      <div className="space-y-1">
        <Label>Descrição curta</Label>
        <Input {...register('descricao_curta')} placeholder="Resumo em uma linha" />
      </div>

      {/* Conteúdo condicional */}
      {precisaUrl && (
        <div className="space-y-1">
          <Label>URL {tipo === 'video' ? 'do YouTube' : 'do Podcast'} *</Label>
          <Input
            {...register('conteudo_url')}
            placeholder={tipo === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://open.spotify.com/episode/...'}
          />
          {tipo === 'podcast' && (
            <p className="text-xs text-gray-400">
              Plataformas suportadas: Spotify, SoundCloud, Anchor.fm, YouTube e Instagram. Cole a URL normal — o embed é gerado automaticamente.
            </p>
          )}
        </div>
      )}

      {precisaUpload && (
        <div className="space-y-1">
          <Label>
            Arquivo {tipo === 'audio' ? '(MP3/WAV)' : '(PDF/JPG/PNG)'} *
          </Label>
          <Input
            type="file"
            accept={tipo === 'audio' ? 'audio/*' : tipo === 'infografico' ? 'image/*,.pdf' : '.pdf'}
            onChange={e => setArquivoUpload(e.target.files?.[0] ?? null)}
          />
          {item?.conteudo_storage_path && !arquivoUpload && (
            <p className="text-xs text-gray-500">Arquivo atual: {item.conteudo_storage_path.split('/').pop()}</p>
          )}
        </div>
      )}

      {precisaTexto && (
        <div className="space-y-1">
          <Label>Conteúdo do card *</Label>
          <Textarea
            {...register('conteudo_texto')}
            placeholder="Digite o conteúdo do post-it..."
            rows={5}
          />
        </div>
      )}

      {tipo === 'quiz' && (
        <div className="space-y-1">
          <Label>Nota máxima do quiz</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="Ex: 10"
              value={watch('nota_maxima') ?? ''}
              onChange={e => {
                const v = e.target.value;
                setValue('nota_maxima', v === '' ? null : Number(v));
              }}
              className="w-28"
            />
            <p className="text-xs text-gray-400">
              Cada questão valerá <strong>{watch('nota_maxima') && questoes.length ? ((watch('nota_maxima') as number) / questoes.length).toFixed(2) : '—'}</strong> ponto(s)
            </p>
          </div>
          <p className="text-xs text-gray-400">Deixe em branco para exibir apenas "acertou X de Y"</p>
        </div>
      )}

      {tipo === 'quiz' && (
        <MicroQuizBuilder questoes={questoes} onChange={setQuestoes} />
      )}

      {/* Planos */}
      <div className="space-y-2">
        <Label>Planos com acesso *</Label>
        <div className="grid grid-cols-2 gap-2">
          {PLANOS.map(plano => (
            <div key={plano} className="flex items-center gap-2">
              <Checkbox
                id={`plano-${plano}`}
                checked={(planosSelected ?? []).includes(plano)}
                onCheckedChange={() => togglePlano(plano)}
              />
              <label htmlFor={`plano-${plano}`} className="text-sm cursor-pointer">
                {plano}
              </label>
            </div>
          ))}
        </div>
        {errors.planos_permitidos && (
          <p className="text-xs text-red-500">{errors.planos_permitidos.message}</p>
        )}
      </div>

      {/* Ordem */}
      <div className="space-y-1">
        <Label>Ordem de exibição</Label>
        <Input
          type="number"
          min={0}
          {...register('ordem', { valueAsNumber: true })}
          onChange={e => {
            setOrdemEditada(true);
            setValue('ordem', Number(e.target.value));
          }}
          className="w-24"
        />
        <p className="text-xs text-gray-400">
          Sugerida para este tipo: {ORDEM_PADRAO[tipo] ?? 99}
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <Switch
          checked={watch('status') === 'ativo'}
          onCheckedChange={v => setValue('status', v ? 'ativo' : 'inativo')}
        />
        <Label>
          {watch('status') === 'ativo' ? (
            <span className="text-green-600 font-medium">Ativo (visível para alunos)</span>
          ) : (
            <span className="text-gray-400">Inativo (oculto)</span>
          )}
        </Label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending || uploadando}
          className="bg-[#3f0776] hover:bg-[#643293]"
        >
          {mutation.isPending || uploadando ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar item'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
