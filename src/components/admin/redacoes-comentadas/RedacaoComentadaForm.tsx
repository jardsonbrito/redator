import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus, X, ArrowLeft, Save, Loader2, Mic, Square, Play, Pause, Search, Pencil,
} from 'lucide-react';
import { TURMAS_VALIDAS } from '@/utils/turmaUtils';
import { ImageSelector } from '@/components/admin/ImageSelector';
const uuidv4 = () => crypto.randomUUID();

type ImageValue = {
  source: 'upload' | 'url';
  url?: string;
  file_path?: string;
  file_size?: number;
  dimensions?: { width: number; height: number };
} | null;

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TipoBloco =
  | 'texto_original' | 'texto_corrigido' | 'versao_lapidada'
  | 'comentarios_trecho' | 'comentarios_paragrafo'
  | 'analise_global' | 'orientacao_estudo'
  | 'pontos_fortes' | 'pontos_melhoria'
  | 'observacoes_corretor' | 'competencias_pontuacao';

interface Bloco {
  localId: string;
  dbId?: string;
  tipo: TipoBloco;
  ordem: number;
  visivel: boolean;
  conteudo: any;
}

interface ModoCorrecao {
  id: string;
  nome: string;
  descricao: string | null;
  blocos_padrao: Array<{ tipo: TipoBloco; ordem: number; visivel: boolean }>;
}

interface TurmaProfessor {
  id: string;
  nome: string;
}

interface Props {
  editingId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoBloco, string> = {
  texto_original: 'Texto Original',
  texto_corrigido: 'Texto Corrigido',
  versao_lapidada: 'Versão Lapidada',
  comentarios_trecho: 'Comentários por Trecho',
  comentarios_paragrafo: 'Comentários por Parágrafo',
  analise_global: 'Análise Global',
  orientacao_estudo: 'Orientação de Estudo',
  pontos_fortes: 'Pontos Fortes',
  pontos_melhoria: 'Pontos a Melhorar',
  observacoes_corretor: 'Observações do Corretor',
  competencias_pontuacao: 'Competências e Pontuação (ENEM)',
};

const TODOS_TIPOS: TipoBloco[] = [
  'texto_original', 'texto_corrigido', 'versao_lapidada',
  'comentarios_trecho', 'comentarios_paragrafo',
  'analise_global', 'orientacao_estudo', 'pontos_fortes', 'pontos_melhoria',
  'observacoes_corretor', 'competencias_pontuacao',
];

const COMPETENCIAS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;
const COMPETENCIA_LABELS = { c1: 'C1', c2: 'C2', c3: 'C3', c4: 'C4', c5: 'C5' };
const COMPETENCIA_COLORS: Record<string, string> = {
  c1: 'bg-red-100 text-red-700 border-red-300',
  c2: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  c3: 'bg-blue-100 text-blue-700 border-blue-300',
  c4: 'bg-orange-100 text-orange-700 border-orange-300',
  c5: 'bg-purple-100 text-purple-700 border-purple-300',
};

const TIPO_ANOTACAO_OPTIONS = ['erro', 'dica', 'elogio', 'ponto_de_atencao'];
const TIPO_ANOTACAO_LABELS: Record<string, string> = {
  erro: 'Erro',
  dica: 'Dica',
  elogio: 'Elogio',
  ponto_de_atencao: 'Ponto de atenção',
};

function conteudoPadrao(tipo: TipoBloco): any {
  switch (tipo) {
    case 'texto_original':
    case 'texto_corrigido':
    case 'versao_lapidada':
    case 'analise_global':
      return { texto: '' };
    case 'observacoes_corretor':
      return { texto: '', audio_url: null, audio_duration: null, mostrar_texto: true, mostrar_audio: true };
    case 'comentarios_trecho':
      return { anotacoes: [] };
    case 'comentarios_paragrafo':
      return { paragrafos: [] };
    case 'orientacao_estudo':
    case 'pontos_fortes':
    case 'pontos_melhoria':
      return { itens: [] };
    case 'competencias_pontuacao':
      return {
        competencias: {
          c1: { nota: 0, comentario: '' },
          c2: { nota: 0, comentario: '' },
          c3: { nota: 0, comentario: '' },
          c4: { nota: 0, comentario: '' },
          c5: { nota: 0, comentario: '' },
        },
        total: 0,
      };
    default:
      return {};
  }
}

// ─── Mini gravador de áudio para Observações do Corretor ─────────────────────

interface AudioRecorderInlineProps {
  existingUrl: string | null;
  onSaved: (url: string, duration: number) => void;
  onDeleted: () => void;
}

const AudioRecorderInline = ({ existingUrl, onSaved, onDeleted }: AudioRecorderInlineProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingDurationRef = useRef<number>(0);

  // Enumerar microfones disponíveis ao montar
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Pede permissão primeiro (sem ela o browser não retorna labels)
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setMicDevices(mics);
        if (mics.length > 0) setSelectedMicId(mics[0].deviceId);
      } catch { /* permissão negada — ignora, usa default */ }
    };
    loadDevices();
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        ...(selectedMicId ? { deviceId: { exact: selectedMicId } } : {}),
      };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => {
        const next = p >= 180 ? p : p + 1;
        recordingDurationRef.current = next;
        if (p >= 180) stopRecording();
        return next;
      }), 1000);
    } catch {
      toast.error('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const extractStoragePath = (url: string) => {
    const marker = 'audios-corretores/';
    const idx = url.indexOf(marker);
    return idx !== -1 ? url.slice(idx + marker.length) : null;
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      // Apaga o arquivo anterior do bucket antes de enviar o novo
      if (existingUrl) {
        const oldPath = extractStoragePath(existingUrl);
        if (oldPath) await supabase.storage.from('audios-corretores').remove([oldPath]);
      }
      const path = `redacoes-comentadas/${Date.now()}.webm`;
      const { error } = await supabase.storage.from('audios-corretores').upload(path, audioBlob, { contentType: 'audio/webm', upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('audios-corretores').getPublicUrl(path);
      setAudioBlob(null);
      setPreviewUrl(null);
      onSaved(publicUrl, recordingDurationRef.current);
      toast.success('Áudio salvo!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar áudio.');
    } finally {
      setUploading(false);
    }
  };

  const deleteAudio = async () => {
    if (existingUrl) {
      const filePath = extractStoragePath(existingUrl);
      if (filePath) await supabase.storage.from('audios-corretores').remove([filePath]);
    }
    setAudioBlob(null);
    setPreviewUrl(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
    onDeleted();
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const activeUrl = existingUrl || previewUrl;

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mt-3">
        <div className="flex items-center gap-2 text-red-600 flex-1">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Gravando... {formatTime(recordingTime)}</span>
        </div>
        <Button type="button" size="sm" variant="destructive" className="rounded-full w-8 h-8 p-0" onClick={stopRecording}>
          <Square className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  if (activeUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/40 border rounded-lg mt-3">
        <audio ref={audioRef} src={activeUrl} onEnded={() => setIsPlaying(false)} preload="metadata" />
        <Button type="button" size="sm" variant="outline" className="rounded-full w-8 h-8 p-0" onClick={togglePlay}>
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </Button>
        <span className="flex-1 text-xs text-muted-foreground">{audioBlob ? 'Áudio gravado (não salvo)' : 'Áudio salvo'}</span>
        {audioBlob && (
          <Button type="button" size="sm" disabled={uploading} onClick={uploadAudio} className="text-xs h-7">
            {uploading ? 'Salvando...' : 'Salvar áudio'}
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" className="rounded-full w-8 h-8 p-0 text-destructive" onClick={deleteAudio} disabled={uploading}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {micDevices.length > 1 && (
        <Select value={selectedMicId} onValueChange={setSelectedMicId}>
          <SelectTrigger className="h-8 text-xs w-auto max-w-[220px]">
            <SelectValue placeholder="Microfone" />
          </SelectTrigger>
          <SelectContent>
            {micDevices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId} className="text-xs">
                {d.label || `Microfone ${micDevices.indexOf(d) + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button type="button" size="sm" variant="outline" onClick={startRecording} className="gap-2 text-xs">
        <Mic className="w-3.5 h-3.5 text-red-500" />
        Gravar áudio
      </Button>
      <span className="text-xs text-muted-foreground">Opcional — até 3 minutos</span>
    </div>
  );
};

// ─── Editor de conteúdo por tipo ─────────────────────────────────────────────

interface BlocoEditorProps {
  bloco: Bloco;
  textoOriginal: string;
  onChange: (localId: string, conteudo: any) => void;
}

const BlocoEditor = ({ bloco, textoOriginal, onChange }: BlocoEditorProps) => {
  const update = (partial: any) => onChange(bloco.localId, { ...bloco.conteudo, ...partial });

  if (
    bloco.tipo === 'texto_original' ||
    bloco.tipo === 'texto_corrigido' ||
    bloco.tipo === 'versao_lapidada' ||
    bloco.tipo === 'analise_global'
  ) {
    return (
      <Textarea
        value={bloco.conteudo.texto || ''}
        onChange={(e) => update({ texto: e.target.value })}
        rows={bloco.tipo === 'versao_lapidada' ? 10 : 6}
        placeholder={`Digite ${bloco.tipo === 'versao_lapidada' ? 'a versão lapidada do texto...' : `o ${TIPO_LABELS[bloco.tipo].toLowerCase()}...`}`}
        className="text-sm"
      />
    );
  }

  if (bloco.tipo === 'observacoes_corretor') {
    const mostrarTexto = bloco.conteudo.mostrar_texto !== false;
    const mostrarAudio = bloco.conteudo.mostrar_audio !== false;
    return (
      <div className="space-y-3">
        {/* Toggles de visibilidade independentes */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={mostrarTexto}
              onCheckedChange={(v) => update({ mostrar_texto: v })}
            />
            Exibir texto
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={mostrarAudio}
              onCheckedChange={(v) => update({ mostrar_audio: v })}
            />
            Exibir áudio
          </label>
        </div>

        <Textarea
          value={bloco.conteudo.texto || ''}
          onChange={(e) => update({ texto: e.target.value })}
          rows={5}
          placeholder="Digite as observações do corretor..."
          className={`text-sm ${!mostrarTexto ? 'opacity-40' : ''}`}
        />
        <AudioRecorderInline
          existingUrl={bloco.conteudo.audio_url || null}
          onSaved={(url, duration) => update({ audio_url: url, audio_duration: duration })}
          onDeleted={() => update({ audio_url: null, audio_duration: null })}
        />
      </div>
    );
  }

  if (bloco.tipo === 'orientacao_estudo' || bloco.tipo === 'pontos_fortes' || bloco.tipo === 'pontos_melhoria') {
    const itens: Array<{ id: string; texto: string }> = bloco.conteudo.itens || [];
    return (
      <div className="space-y-2">
        {itens.map((item) => (
          <div key={item.id} className="flex gap-2">
            <Input
              value={item.texto}
              onChange={(e) => {
                const novo = itens.map(i => i.id === item.id ? { ...i, texto: e.target.value } : i);
                update({ itens: novo });
              }}
              placeholder="Digite o item..."
              className="text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-9 w-9 p-0 text-muted-foreground"
              onClick={() => update({ itens: itens.filter(i => i.id !== item.id) })}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => update({ itens: [...itens, { id: uuidv4(), texto: '' }] })}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar item
        </Button>
      </div>
    );
  }

  if (bloco.tipo === 'comentarios_paragrafo') {
    const paragrafos: Array<{ id: string; numero: number; titulo: string; comentario: string }> =
      bloco.conteudo.paragrafos || [];
    return (
      <div className="space-y-3">
        {paragrafos.map((par) => (
          <div key={par.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={par.numero}
                onChange={(e) => {
                  const novo = paragrafos.map(p => p.id === par.id ? { ...p, numero: Number(e.target.value) } : p);
                  update({ paragrafos: novo });
                }}
                className="w-20 text-sm"
                placeholder="Nº"
                min={1}
              />
              <Input
                value={par.titulo}
                onChange={(e) => {
                  const novo = paragrafos.map(p => p.id === par.id ? { ...p, titulo: e.target.value } : p);
                  update({ paragrafos: novo });
                }}
                placeholder="Título (ex.: Introdução)"
                className="text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-9 w-9 p-0 text-muted-foreground"
                onClick={() => update({ paragrafos: paragrafos.filter(p => p.id !== par.id) })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={par.comentario}
              onChange={(e) => {
                const novo = paragrafos.map(p => p.id === par.id ? { ...p, comentario: e.target.value } : p);
                update({ paragrafos: novo });
              }}
              rows={3}
              placeholder="Comentário sobre este parágrafo..."
              className="text-sm"
            />
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => update({ paragrafos: [...paragrafos, { id: uuidv4(), numero: paragrafos.length + 1, titulo: '', comentario: '' }] })}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar parágrafo
        </Button>
      </div>
    );
  }

  if (bloco.tipo === 'competencias_pontuacao') {
    const comp = bloco.conteudo.competencias || {};
    const total = COMPETENCIAS.reduce((sum, c) => sum + (Number(comp[c]?.nota) || 0), 0);
    return (
      <div className="space-y-3">
        {COMPETENCIAS.map((c) => (
          <div key={c} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-3">
              <Badge className={`border text-xs shrink-0 ${COMPETENCIA_COLORS[c]}`}>
                {COMPETENCIA_LABELS[c]}
              </Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Nota (0–200):</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  step={40}
                  value={comp[c]?.nota || 0}
                  onChange={(e) => {
                    const novoComp = { ...comp, [c]: { ...comp[c], nota: Number(e.target.value) } };
                    const novoTotal = COMPETENCIAS.reduce((sum, k) => sum + (Number(novoComp[k]?.nota) || 0), 0);
                    update({ competencias: novoComp, total: novoTotal });
                  }}
                  className="w-24 text-sm"
                />
              </div>
            </div>
            <Textarea
              value={comp[c]?.comentario || ''}
              onChange={(e) => {
                const novoComp = { ...comp, [c]: { ...comp[c], comentario: e.target.value } };
                update({ competencias: novoComp });
              }}
              rows={2}
              placeholder={`Comentário sobre ${COMPETENCIA_LABELS[c]}...`}
              className="text-sm"
            />
          </div>
        ))}
        <div className="text-right font-semibold text-primary">
          Total: {total} / 1000
        </div>
      </div>
    );
  }

  if (bloco.tipo === 'comentarios_trecho') {
    return (
      <TrechoEditor
        conteudo={bloco.conteudo}
        textoOriginal={textoOriginal}
        onChange={(novoConteudo) => onChange(bloco.localId, novoConteudo)}
      />
    );
  }

  return <p className="text-sm text-muted-foreground">Editor não disponível para este tipo.</p>;
};

// ─── Editor de trechos ────────────────────────────────────────────────────────

interface TrechoEditorProps {
  conteudo: any;
  textoOriginal: string;
  onChange: (novoConteudo: any) => void;
}

interface Anotacao {
  id: string;
  start: number;
  end: number;
  trecho: string;
  comentario: string;
  tipo: string;
  competencia?: string;
}

/** Renderiza o texto com os trechos que batem com `busca` destacados em amarelo. */
function TextoComHighlight({ texto, busca }: { texto: string; busca: string }) {
  if (!busca.trim()) return <>{texto}</>;
  const escapado = busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const partes = texto.split(new RegExp(`(${escapado})`, 'gi'));
  return (
    <>
      {partes.map((parte, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-300 text-yellow-900 rounded-sm">{parte}</mark>
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </>
  );
}

interface DialogAnotacaoState {
  dados: Partial<Anotacao>;
  isEdit: boolean;
}

const TrechoEditor = ({ conteudo, textoOriginal, onChange }: TrechoEditorProps) => {
  const anotacoes: Anotacao[] = conteudo.anotacoes || [];
  const [dialogAnotacao, setDialogAnotacao] = useState<DialogAnotacaoState | null>(null);
  const [busca, setBusca] = useState('');
  const textoRef = useRef<HTMLDivElement>(null);

  const totalOcorrencias = busca.trim()
    ? (textoOriginal.match(new RegExp(busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    : 0;

  const fecharDialog = () => setDialogAnotacao(null);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !textoRef.current) return;

    try {
      const range = sel.getRangeAt(0);
      const container = textoRef.current;

      if (
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        sel.removeAllRanges();
        return;
      }

      const preRange = document.createRange();
      preRange.selectNodeContents(container);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;
      const selected = sel.toString();
      if (!selected.trim()) return;

      sel.removeAllRanges();

      setTimeout(() => setDialogAnotacao({
        isEdit: false,
        dados: {
          id: uuidv4(),
          start,
          end: start + selected.length,
          trecho: selected,
          comentario: '',
          tipo: 'erro',
          competencia: 'none',
        },
      }), 10);
    } catch {
      sel?.removeAllRanges();
    }
  };

  const handleEditarAnotacao = (a: Anotacao) => {
    setDialogAnotacao({
      isEdit: true,
      dados: { ...a, competencia: a.competencia || 'none' },
    });
  };

  const handleSalvarDialog = () => {
    const { dados, isEdit } = dialogAnotacao!;
    if (!dados.comentario?.trim()) {
      toast.error('Digite um comentário para a anotação');
      return;
    }
    const anotacao: Anotacao = {
      id: dados.id!,
      start: dados.start!,
      end: dados.end!,
      trecho: dados.trecho!,
      comentario: dados.comentario!,
      tipo: dados.tipo || 'erro',
      competencia: (dados.competencia && dados.competencia !== 'none') ? dados.competencia : undefined,
    };
    if (isEdit) {
      onChange({ anotacoes: anotacoes.map(a => a.id === anotacao.id ? anotacao : a) });
    } else {
      onChange({ anotacoes: [...anotacoes, anotacao] });
    }
    fecharDialog();
  };

  const handleRemoverAnotacao = (id: string) => {
    onChange({ anotacoes: anotacoes.filter(a => a.id !== id) });
  };

  const atualizarDados = (patch: Partial<Anotacao>) =>
    setDialogAnotacao(prev => prev ? { ...prev, dados: { ...prev.dados, ...patch } } : null);

  return (
    <div className="space-y-3">
      {textoOriginal ? (
        <>
          <p className="text-xs text-muted-foreground">
            Selecione um trecho no texto abaixo para criar uma anotação:
          </p>

          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar palavra no texto..."
              className="w-full pl-8 pr-8 py-1.5 text-xs border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {busca && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {totalOcorrencias > 0 && (
                  <span className="text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full font-medium">
                    {totalOcorrencias}
                  </span>
                )}
                <button type="button" onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div
            ref={textoRef}
            onMouseUp={handleMouseUp}
            className="border rounded-lg p-3 text-sm whitespace-pre-wrap leading-relaxed bg-amber-50 cursor-text select-text"
          >
            <TextoComHighlight texto={textoOriginal} busca={busca} />
          </div>
        </>
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          Adicione um bloco "Texto Original" e preencha o texto para habilitar a seleção de trechos.
        </p>
      )}

      {/* Dialog unificado: criar ou editar anotação */}
      <Dialog open={!!dialogAnotacao} onOpenChange={(open) => !open && fecharDialog()}>
        <DialogContent
          className="max-w-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{dialogAnotacao?.isEdit ? 'Editar anotação' : 'Nova anotação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm italic text-amber-900 leading-relaxed">
              "{dialogAnotacao?.dados.trecho}"
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Comentário *</Label>
              <Textarea
                value={dialogAnotacao?.dados.comentario || ''}
                onChange={(e) => atualizarDados({ comentario: e.target.value })}
                rows={3}
                placeholder="Escreva o comentário sobre este trecho..."
                className="text-sm"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-medium">Tipo</Label>
                <Select
                  value={dialogAnotacao?.dados.tipo || 'erro'}
                  onValueChange={(v) => atualizarDados({ tipo: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_ANOTACAO_OPTIONS.map(t => (
                      <SelectItem key={t} value={t} className="text-xs">{TIPO_ANOTACAO_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-medium">Competência (opcional)</Label>
                <Select
                  value={dialogAnotacao?.dados.competencia || 'none'}
                  onValueChange={(v) => atualizarDados({ competencia: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Sem competência</SelectItem>
                    {COMPETENCIAS.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{COMPETENCIA_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={fecharDialog}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSalvarDialog}>
              {dialogAnotacao?.isEdit ? 'Salvar alterações' : 'Salvar anotação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de anotações já criadas */}
      {anotacoes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {anotacoes.length} anotação(ões):
          </p>
          {anotacoes.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2 border rounded p-2 text-xs bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <span className="italic text-muted-foreground">"{a.trecho}"</span>
                {' — '}
                <span>{a.comentario}</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">{TIPO_ANOTACAO_LABELS[a.tipo] ?? a.tipo}</Badge>
                  {a.competencia && (
                    <Badge className={`text-xs border ${COMPETENCIA_COLORS[a.competencia]}`}>
                      {COMPETENCIA_LABELS[a.competencia as keyof typeof COMPETENCIA_LABELS]}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground shrink-0"
                onClick={() => handleEditarAnotacao(a)}
                title="Editar anotação"
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive shrink-0"
                onClick={() => handleRemoverAnotacao(a.id)}
                title="Remover anotação"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Formulário principal ─────────────────────────────────────────────────────

export const RedacaoComentadaForm = ({ editingId, onSuccess, onCancel }: Props) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editingId);
  const [activeSection, setActiveSection] = useState<'info' | 'blocos'>('info');

  const [titulo, setTitulo] = useState('');
  const [eixoTematico, setEixoTematico] = useState('');
  const [modoCorrecaoId, setModoCorrecaoId] = useState('enem');
  const [turmasAutorizadas, setTurmasAutorizadas] = useState<string[]>([]);
  const [ativo, setAtivo] = useState(false);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [capa, setCapa] = useState<ImageValue>(null);

  const [modosCorrecao, setModosCorrecao] = useState<ModoCorrecao[]>([]);
  const [turmasProfessores, setTurmasProfessores] = useState<TurmaProfessor[]>([]);

  // Chip de bloco ativo na seção Blocos
  const [blocoAtivoLocalId, setBlocoAtivoLocalId] = useState<string | null>(null);

  // Tipo de bloco a adicionar manualmente
  const [tipoParaAdicionar, setTipoParaAdicionar] = useState<TipoBloco>('texto_original');

  // Carrega modos e turmas de professores
  useEffect(() => {
    const carregar = async () => {
      const [modosRes, turmasRes] = await Promise.all([
        supabase.from('modos_correcao').select('*').order('id'),
        supabase.from('turmas_professores').select('id, nome').eq('ativo', true).order('nome'),
      ]);
      setModosCorrecao((modosRes.data || []) as ModoCorrecao[]);
      setTurmasProfessores((turmasRes.data || []) as TurmaProfessor[]);
    };
    carregar();
  }, []);

  // Modo para edição: carrega dados existentes
  useEffect(() => {
    if (!editingId) { setInitialLoading(false); return; }
    const carregar = async () => {
      setInitialLoading(true);
      try {
        const [rcRes, blocosRes] = await Promise.all([
          supabase.from('redacoes_comentadas').select('*').eq('id', editingId).single(),
          supabase.from('redacao_comentada_blocos').select('*').eq('redacao_comentada_id', editingId).order('ordem'),
        ]);
        if (rcRes.data) {
          const rc = rcRes.data as any;
          setTitulo(rc.titulo);
          setEixoTematico(rc.eixo_tematico || '');
          setModoCorrecaoId(rc.modo_correcao_id);
          setTurmasAutorizadas(rc.turmas_autorizadas || []);
          setAtivo(rc.ativo);
          if (rc.capa_source === 'upload' && rc.capa_file_path) {
            setCapa({ source: 'upload', file_path: rc.capa_file_path });
          } else if (rc.capa_source === 'url' && rc.capa_url) {
            setCapa({ source: 'url', url: rc.capa_url });
          }
        }
        if (blocosRes.data) {
          const loaded = blocosRes.data.map((b: any) => ({
            localId: uuidv4(),
            dbId: b.id,
            tipo: b.tipo as TipoBloco,
            ordem: b.ordem,
            visivel: b.visivel,
            conteudo: b.conteudo,
          }));
          setBlocos(loaded);
          if (loaded.length > 0) setBlocoAtivoLocalId((loaded.find(b => b.visivel) ?? loaded[0]).localId);
        }
      } finally {
        setInitialLoading(false);
      }
    };
    carregar();
  }, [editingId]);

  // Ao trocar o modo (só em criação), carrega os blocos padrão do modo
  const handleModoChange = (novoModo: string) => {
    setModoCorrecaoId(novoModo);
    if (editingId) return; // em edição, não substitui blocos
    const modo = modosCorrecao.find(m => m.id === novoModo);
    if (!modo) return;
    const novos = modo.blocos_padrao.map((bp, idx) => ({
      localId: uuidv4(),
      tipo: bp.tipo,
      ordem: idx + 1,
      visivel: bp.visivel,
      conteudo: conteudoPadrao(bp.tipo),
    }));
    setBlocos(novos);
    if (novos.length > 0) setBlocoAtivoLocalId((novos.find(b => b.visivel) ?? novos[0]).localId);
  };

  // Carrega blocos padrão quando os modos chegam (criação inicial)
  useEffect(() => {
    if (editingId || modosCorrecao.length === 0 || blocos.length > 0) return;
    const modo = modosCorrecao.find(m => m.id === modoCorrecaoId);
    if (!modo) return;
    const novos = modo.blocos_padrao.map((bp, idx) => ({
      localId: uuidv4(),
      tipo: bp.tipo,
      ordem: idx + 1,
      visivel: bp.visivel,
      conteudo: conteudoPadrao(bp.tipo),
    }));
    setBlocos(novos);
    if (novos.length > 0) setBlocoAtivoLocalId((novos.find(b => b.visivel) ?? novos[0]).localId);
  }, [modosCorrecao]);

  // Texto original (para o editor de trechos)
  const textoOriginal = blocos.find(b => b.tipo === 'texto_original')?.conteudo?.texto || '';

  const handleToggleTurma = (turma: string) => {
    setTurmasAutorizadas(prev =>
      prev.includes(turma) ? prev.filter(t => t !== turma) : [...prev, turma]
    );
  };

  const handleBlocoConteudoChange = (localId: string, conteudo: any) => {
    setBlocos(prev => prev.map(b => b.localId === localId ? { ...b, conteudo } : b));
  };

  const handleToggleVisivel = (localId: string) => {
    setBlocos(prev => {
      const atualizado = prev.map(b => b.localId === localId ? { ...b, visivel: !b.visivel } : b);
      // Se o bloco ativo foi inativado, seleciona o primeiro visível restante
      const blocoAlterado = atualizado.find(b => b.localId === localId);
      if (blocoAtivoLocalId === localId && blocoAlterado && !blocoAlterado.visivel) {
        const primeiroVisivel = atualizado.find(b => b.visivel);
        setBlocoAtivoLocalId(primeiroVisivel ? primeiroVisivel.localId : localId);
      }
      return atualizado;
    });
  };

  const handleMoverBloco = (localId: string, direcao: 'up' | 'down') => {
    setBlocos(prev => {
      const idx = prev.findIndex(b => b.localId === localId);
      if (idx < 0) return prev;
      const alvo = direcao === 'up' ? idx - 1 : idx + 1;
      if (alvo < 0 || alvo >= prev.length) return prev;
      const novo = [...prev];
      [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
      return novo.map((b, i) => ({ ...b, ordem: i + 1 }));
    });
  };

  const handleRemoverBloco = (localId: string) => {
    setBlocos(prev => {
      const idx = prev.findIndex(b => b.localId === localId);
      const filtered = prev.filter(b => b.localId !== localId).map((b, i) => ({ ...b, ordem: i + 1 }));
      // Seleciona bloco adjacente após remoção
      if (blocoAtivoLocalId === localId && filtered.length > 0) {
        const nextIdx = Math.min(idx, filtered.length - 1);
        setBlocoAtivoLocalId(filtered[nextIdx].localId);
      } else if (filtered.length === 0) {
        setBlocoAtivoLocalId(null);
      }
      return filtered;
    });
  };

  const handleAdicionarBloco = () => {
    const novoLocalId = uuidv4();
    const novoBloco: Bloco = {
      localId: novoLocalId,
      tipo: tipoParaAdicionar,
      ordem: blocos.length + 1,
      visivel: true,
      conteudo: conteudoPadrao(tipoParaAdicionar),
    };
    setBlocos(prev => [...prev, novoBloco]);
    setBlocoAtivoLocalId(novoLocalId);
  };

  const handleSalvar = async () => {
    if (!titulo.trim()) {
      toast.error('O título é obrigatório');
      setActiveSection('info');
      return;
    }
    if (turmasAutorizadas.length === 0) {
      toast.error('Selecione ao menos uma turma autorizada');
      setActiveSection('info');
      return;
    }

    setLoading(true);
    try {
      let rcId = editingId;

      const payload: any = {
        titulo: titulo.trim(),
        eixo_tematico: eixoTematico.trim() || null,
        modo_correcao_id: modoCorrecaoId,
        turmas_autorizadas: turmasAutorizadas,
        ativo,
        atualizado_em: new Date().toISOString(),
        capa_source: capa?.source ?? null,
        capa_url: capa?.source === 'url' ? (capa.url ?? null) : null,
        capa_file_path: capa?.source === 'upload' ? (capa.file_path ?? null) : null,
      };

      if (ativo && !editingId) {
        payload.publicado_em = new Date().toISOString();
      }

      if (editingId) {
        // Buscar publicado_em existente para não sobrescrever
        const { data: existing } = await supabase
          .from('redacoes_comentadas')
          .select('publicado_em, ativo')
          .eq('id', editingId)
          .single();
        if (ativo && !existing?.publicado_em) {
          payload.publicado_em = new Date().toISOString();
        }
        const { error } = await supabase.from('redacoes_comentadas').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('redacoes_comentadas')
          .insert({ ...payload, criado_em: new Date().toISOString() })
          .select('id')
          .single();
        if (error) throw error;
        rcId = (data as any).id;
      }

      // Salvar blocos: delete-all então re-insert
      await supabase.from('redacao_comentada_blocos').delete().eq('redacao_comentada_id', rcId);

      if (blocos.length > 0) {
        const blocosParaInserir = blocos.map((b, idx) => ({
          redacao_comentada_id: rcId,
          tipo: b.tipo,
          ordem: idx + 1,
          visivel: b.visivel,
          conteudo: b.conteudo,
          criado_em: new Date().toISOString(),
        }));
        const { error: blocoError } = await supabase
          .from('redacao_comentada_blocos')
          .insert(blocosParaInserir);
        if (blocoError) throw blocoError;
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-redacoes-comentadas'] });
      toast.success(editingId ? 'Redação comentada atualizada' : 'Redação comentada criada');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar redação comentada');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const turmasAlunos = TURMAS_VALIDAS as string[];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold">
            {editingId ? 'Editar Redação Comentada' : 'Nova Redação Comentada'}
          </h2>
        </div>
        <Button onClick={handleSalvar} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      {/* Navegação em chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['info', 'blocos'] as const).map((sec) => (
          <button
            key={sec}
            onClick={() => setActiveSection(sec)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors text-white ${
              activeSection === sec
                ? 'bg-[#662F96]'
                : 'bg-[#B175FF] hover:bg-[#662F96]'
            }`}
          >
            {sec === 'info' ? 'Informações' : `Blocos (${blocos.length})`}
          </button>
        ))}
      </div>

      {/* Seção: Informações */}
      {activeSection === 'info' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Redação nota 1000 – Análise ENEM 2023"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="eixo_tematico">Eixo Temático</Label>
            <Input
              id="eixo_tematico"
              value={eixoTematico}
              onChange={(e) => setEixoTematico(e.target.value)}
              placeholder="Ex.: Ciência e Tecnologia, Educação, Meio Ambiente..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Modo de Correção *</Label>
            <Select value={modoCorrecaoId} onValueChange={handleModoChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modosCorrecao.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modosCorrecao.find(m => m.id === modoCorrecaoId)?.descricao && (
              <p className="text-xs text-muted-foreground mt-1">
                {modosCorrecao.find(m => m.id === modoCorrecaoId)?.descricao}
              </p>
            )}
          </div>

          <div>
            <Label>Turmas Autorizadas *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Selecione quais turmas de alunos e/ou professores podem visualizar esta redação.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {turmasAlunos.map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={turmasAutorizadas.includes(t)}
                    onCheckedChange={() => handleToggleTurma(t)}
                  />
                  <span>Turma {t}</span>
                </label>
              ))}
            </div>
            {turmasProfessores.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-3 mb-2">Turmas de professores:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {turmasProfessores.map((tp) => (
                    <label key={tp.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={turmasAutorizadas.includes(tp.nome)}
                        onCheckedChange={() => handleToggleTurma(tp.nome)}
                      />
                      <span>{tp.nome}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <ImageSelector
            title="Imagem de Capa"
            description="Capa exibida no card da redação (16:9 recomendado). Faça upload ou informe uma URL."
            bucket="themes"
            value={capa}
            onChange={setCapa}
            minDimensions={{ width: 400, height: 225 }}
          />

          <div className="flex items-center gap-3">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <div>
              <Label>Publicado</Label>
              <p className="text-xs text-muted-foreground">
                {ativo ? 'Visível para alunos e professores autorizados' : 'Oculto (rascunho)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seção: Blocos */}
      {activeSection === 'blocos' && (
        <div className="space-y-3">
          {blocos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum bloco adicionado. Use o seletor abaixo para adicionar blocos.
            </p>
          ) : (
            <>
              {/* Chips de navegação entre blocos — ativos primeiro, inativos no final */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[...blocos].sort((a, b) => {
                  if (a.visivel === b.visivel) return 0;
                  return a.visivel ? -1 : 1;
                }).map((bloco) => (
                  <button
                    key={bloco.localId}
                    type="button"
                    onClick={() => setBlocoAtivoLocalId(bloco.localId)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      !bloco.visivel ? 'opacity-50' : ''
                    } ${
                      blocoAtivoLocalId === bloco.localId
                        ? 'bg-[#662F96] text-white'
                        : 'bg-[#B175FF] text-white hover:bg-[#662F96]'
                    }`}
                  >
                    {TIPO_LABELS[bloco.tipo]}
                  </button>
                ))}
              </div>

              {/* Card do bloco ativo */}
              {(() => {
                const bloco = blocos.find(b => b.localId === blocoAtivoLocalId) ?? blocos[0];
                if (!bloco) return null;
                const idx = blocos.findIndex(b => b.localId === bloco.localId);
                return (
                  <Card key={bloco.localId} className={!bloco.visivel ? 'opacity-50' : ''}>
                    <CardHeader className="py-2 px-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground w-5 text-center">
                            {idx + 1}
                          </span>
                          <CardTitle className="text-sm">{TIPO_LABELS[bloco.tipo]}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={idx === 0}
                            onClick={() => handleMoverBloco(bloco.localId, 'up')}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={idx === blocos.length - 1}
                            onClick={() => handleMoverBloco(bloco.localId, 'down')}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleToggleVisivel(bloco.localId)}
                            title={bloco.visivel ? 'Ocultar bloco' : 'Mostrar bloco'}
                          >
                            {bloco.visivel ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleRemoverBloco(bloco.localId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                      <BlocoEditor
                        bloco={bloco}
                        textoOriginal={textoOriginal}
                        onChange={handleBlocoConteudoChange}
                      />
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}

          {/* Adicionar bloco */}
          <div className="flex gap-2 items-center border-t pt-3 mt-3">
            <Select value={tipoParaAdicionar} onValueChange={(v) => setTipoParaAdicionar(v as TipoBloco)}>
              <SelectTrigger className="flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TODOS_TIPOS.map((t) => (
                  <SelectItem key={t} value={t} className="text-sm">{TIPO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleAdicionarBloco} className="shrink-0 gap-1.5">
              <Plus className="w-4 h-4" />
              Adicionar bloco
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
