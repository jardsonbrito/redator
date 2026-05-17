import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Copy, Maximize2, X, AlertTriangle, Info, BookMarked, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarcacoesJarvisPanel } from "./MarcacoesJarvisPanel";
import { useComentariosTrechoCorrecao, ComentarioTrecho } from "@/hooks/useComentariosTrechoCorrecao";
import { Badge } from "@/components/ui/badge";
import { FileText, ImageIcon } from "lucide-react";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import { useJarvisAdmin } from "@/hooks/useJarvisAdmin";
import { estaCongelada } from "@/utils/redacaoUtils";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { RedacaoAnotacaoVisual, RedacaoAnotacaoVisualRef } from "./RedacaoAnotacaoVisual";
import { RelatorioPedagogicoModal } from "./RelatorioPedagogicoModal";
import { TemaModal } from "./TemaModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextareaWithSpellcheck } from "@/components/ui/textarea-with-spellcheck";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder } from "./AudioRecorder";
import { PEPMarcacaoModal } from "./PEPMarcacaoModal";
import { useMarcacoesRedacao } from "@/hooks/usePEPMarcacoes";

interface FormularioCorrecaoCompletoComAnotacoesProps {
  redacao: RedacaoCorretor;
  corretorEmail: string;
  onVoltar: () => void;
  onSucesso: () => void;
  onRefreshList: () => void;
}

interface NotasCorrecao {
  c1: number; c2: number; c3: number; c4: number; c5: number; total: number;
}

interface ComentariosCorrecao {
  c1: string; c2: string; c3: string; c4: string; c5: string; elogios: string;
}

const opcoesNota = [0, 40, 80, 120, 160, 200];

const COMP_INFO = {
  c1: { cor: '#E53935', bg: '#FEF2F2', tc: '#991B1B', label: 'Norma-padrão' },
  c2: { cor: '#43A047', bg: '#F0FDF4', tc: '#166534', label: 'Tema e repertório' },
  c3: { cor: '#2196F3', bg: '#EFF6FF', tc: '#1E3A8A', label: 'Projeto de texto' },
  c4: { cor: '#FF9800', bg: '#FFF7ED', tc: '#9A3412', label: 'Coesão' },
  c5: { cor: '#9C27B0', bg: '#FAF5FF', tc: '#6B21A8', label: 'Intervenção' },
} as const;

const PILLS_INFO = [
  { key: 1, label: 'C1', cor: '#E53935' },
  { key: 2, label: 'C2', cor: '#43A047' },
  { key: 3, label: 'C3', cor: '#2196F3' },
  { key: 4, label: 'C4', cor: '#FF9800' },
  { key: 5, label: 'C5', cor: '#9C27B0' },
  { key: 6, label: 'PA', cor: '#00BCD4' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_correcao: 'Em correção',
  incompleta: 'Incompleta',
  corrigida: 'Corrigida',
  devolvida: 'Devolvida',
};

const TIPO_LABELS_FORM: Record<string, string> = {
  erro: 'Erro',
  dica: 'Dica',
  ponto_de_atencao: 'Ponto de atenção',
};

interface DialogAnotacao {
  mode: 'nova' | 'editar';
  trecho: string;
  inicio: number;
  fim: number;
  paragrafo?: number;
  existingId?: string;
  competencia: string;
  tipo: string;
  comentario: string;
  sugestao_reescrita: string;
}

export const FormularioCorrecaoCompletoComAnotacoes = ({
  redacao,
  corretorEmail,
  onVoltar,
  onSucesso,
  onRefreshList
}: FormularioCorrecaoCompletoComAnotacoesProps) => {
  const [notas, setNotas] = useState<NotasCorrecao>({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, total: 0 });
  const [comentarios, setComentarios] = useState<ComentariosCorrecao>({
    c1: "sem_comentario", c2: "sem_comentario", c3: "sem_comentario",
    c4: "sem_comentario", c5: "sem_comentario", elogios: ""
  });

  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [showTemaModal, setShowTemaModal] = useState(false);
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [showPEPModal, setShowPEPModal] = useState(false);
  const [showRedacaoExpandida, setShowRedacaoExpandida] = useState(false);
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [temaCompleto, setTemaCompleto] = useState<any>(null);
  const [corretorId, setCorretorId] = useState<string>('');
  const [corretorNome, setCorretorNome] = useState<string>('');
  const [parUtilizado, setParUtilizado] = useState<string | null>(null);
  const [redacaoFinalizada, setRedacaoFinalizada] = useState(false);
  const [anotacoesCounts, setAnotacoesCounts] = useState<Record<number, number>>({});
  const [refineElogiosLoading, setRefineElogiosLoading] = useState(false);
  const [refineElogiosSugestoes, setRefineElogiosSugestoes] = useState<string[]>([]);
  const [showJarvisPanel, setShowJarvisPanel] = useState(false);
  const [jarvisData, setJarvisData] = useState<any>(null);
  const [loadingJarvis, setLoadingJarvis] = useState(false);

  // Ref para RedacaoAnotacaoVisual — permite triggerLimparTodasAnotacoes
  const anotacaoRef = useRef<RedacaoAnotacaoVisualRef>(null);

  const { data: marcacoesPEP = [], refetch: refetchMarcacoesPEP } = useMarcacoesRedacao(redacao.id);
  const { toast } = useToast();
  const { fetchPrecorrecao } = useJarvisAdmin();

  const redacaoCongelada = estaCongelada({
    data_envio: redacao.data_envio,
    corrigida: redacao.corrigida === true || redacao.status_minha_correcao === 'corrigida',
    congelada: redacao.congelada,
    data_descongelamento: redacao.data_descongelamento
  });

  const handleAnotacoesChange = useCallback((counts: Record<number, number>) => {
    setAnotacoesCounts(counts);
  }, []);

  const totalAnotacoes = Object.values(anotacoesCounts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    const buscarCorretorId = async () => {
      try {
        const { data } = await supabase
          .from('corretores')
          .select('id, nome_completo')
          .eq('email', corretorEmail)
          .eq('ativo', true)
          .single();
        if (data?.id) {
          setCorretorId(data.id);
          setCorretorNome(data.nome_completo || corretorEmail);
        }
      } catch (_e) { /* silent */ }
    };
    if (corretorEmail) buscarCorretorId();
  }, [corretorEmail]);

  useEffect(() => {
    const total = notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5;
    setNotas(prev => ({ ...prev, total }));
  }, [notas.c1, notas.c2, notas.c3, notas.c4, notas.c5]);

  useEffect(() => {
    carregarCorrecaoExistente();
    buscarTemaCompleto();
  }, [redacao.id]);

  useEffect(() => {
    if (!showJarvisPanel || !redacao.jarvis_precorrecao_id || jarvisData) return;
    setLoadingJarvis(true);
    fetchPrecorrecao(redacao.jarvis_precorrecao_id)
      .then(data => setJarvisData(data))
      .catch(() => toast({ title: "Erro ao carregar sugestão do Jarvis", variant: "destructive" }))
      .finally(() => setLoadingJarvis(false));
  }, [showJarvisPanel]);

  const buscarTemaCompleto = async () => {
    try {
      const { data } = await supabase
        .from('temas')
        .select('*')
        .eq('frase_tematica', redacao.frase_tematica)
        .maybeSingle();
      setTemaCompleto(data || { id: null, frase_tematica: redacao.frase_tematica });
    } catch {}
  };

  const carregarCorrecaoExistente = async () => {
    try {
      const colunas = `
        id,
        c1_corretor_1, c2_corretor_1, c3_corretor_1, c4_corretor_1, c5_corretor_1, nota_final_corretor_1,
        c1_corretor_2, c2_corretor_2, c3_corretor_2, c4_corretor_2, c5_corretor_2, nota_final_corretor_2,
        comentario_c1_corretor_1, comentario_c2_corretor_1, comentario_c3_corretor_1, comentario_c4_corretor_1, comentario_c5_corretor_1,
        comentario_c1_corretor_2, comentario_c2_corretor_2, comentario_c3_corretor_2, comentario_c4_corretor_2, comentario_c5_corretor_2,
        elogios_pontos_atencao_corretor_1, elogios_pontos_atencao_corretor_2,
        audio_url_corretor_1, audio_url_corretor_2
      `;

      let data: any, error: any;

      if (redacao.tipo_redacao === 'regular') {
        const result = await supabase.from('redacoes_enviadas').select(colunas).eq('id', redacao.id).single();
        data = result.data; error = result.error;
      } else if (redacao.tipo_redacao === 'simulado') {
        const result = await supabase.from('redacoes_simulado').select(colunas + ', par_utilizado, corrigida').eq('id', redacao.id).single();
        data = result.data; error = result.error;
        if (result.data) { setParUtilizado(result.data.par_utilizado || null); setRedacaoFinalizada(result.data.corrigida || false); }
      } else if (redacao.tipo_redacao === 'exercicio') {
        const result = await supabase.from('redacoes_exercicio').select(colunas).eq('id', redacao.id).single();
        data = result.data; error = result.error;
      } else return;

      if (error) throw error;

      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';
      setNotas({
        c1: data[`c1_${prefixo}`] || 0,
        c2: data[`c2_${prefixo}`] || 0,
        c3: data[`c3_${prefixo}`] || 0,
        c4: data[`c4_${prefixo}`] || 0,
        c5: data[`c5_${prefixo}`] || 0,
        total: data[`nota_final_${prefixo}`] || 0
      });

      const c1 = data[`comentario_c1_${prefixo}`] || "sem_comentario";
      const c2 = data[`comentario_c2_${prefixo}`] || "sem_comentario";
      const c3 = data[`comentario_c3_${prefixo}`] || "sem_comentario";
      const c4 = data[`comentario_c4_${prefixo}`] || "sem_comentario";
      const c5 = data[`comentario_c5_${prefixo}`] || "sem_comentario";
      setComentarios({
        c1: c1 === "" ? "sem_comentario" : c1,
        c2: c2 === "" ? "sem_comentario" : c2,
        c3: c3 === "" ? "sem_comentario" : c3,
        c4: c4 === "" ? "sem_comentario" : c4,
        c5: c5 === "" ? "sem_comentario" : c5,
        elogios: data[`elogios_pontos_atencao_${prefixo}`] || ""
      });
      setAudioUrl(data[`audio_url_${prefixo}`] || null);
    } catch (error) {
      console.error('Erro ao carregar correção:', error);
    }
  };

  const salvarCorrecao = useCallback(async (status: 'incompleta' | 'corrigida') => {
    if (status === 'corrigida') {
      const { data: marcacoesAtuais } = await refetchMarcacoesPEP();
      if (!marcacoesAtuais || marcacoesAtuais.length === 0) {
        toast({ title: 'Plano de Estudo não preenchido', description: 'Clique em "Gerar plano de estudo" e marque os aspectos identificados antes de finalizar.', variant: 'destructive' });
        setShowPEPModal(true);
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('salvar_correcao_corretor', {
        redacao_id: redacao.id,
        tabela_nome: redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio',
        eh_corretor_1: redacao.eh_corretor_1,
        c1_nota: notas.c1, c2_nota: notas.c2, c3_nota: notas.c3, c4_nota: notas.c4, c5_nota: notas.c5,
        nota_final: notas.total,
        status_correcao: status,
        comentario_c1: comentarios.c1 === "sem_comentario" ? "" : comentarios.c1,
        comentario_c2: comentarios.c2 === "sem_comentario" ? "" : comentarios.c2,
        comentario_c3: comentarios.c3 === "sem_comentario" ? "" : comentarios.c3,
        comentario_c4: comentarios.c4 === "sem_comentario" ? "" : comentarios.c4,
        comentario_c5: comentarios.c5 === "sem_comentario" ? "" : comentarios.c5,
        elogios_pontos: comentarios.elogios
      });
      if (error) throw error;

      if (status === 'corrigida') {
        try {
          const ensureUtf8 = (str: string) => {
            try { const b = new TextEncoder().encode(str); return new TextDecoder('utf-8', { fatal: false }).decode(b); }
            catch { return str; }
          };
          await supabase.functions.invoke('send-correction-email', {
            body: {
              redacao_id: redacao.id,
              student_email: redacao.email_aluno,
              student_name: ensureUtf8(redacao.nome_aluno || ''),
              tema_titulo: ensureUtf8(redacao.frase_tematica || 'Tema sem título'),
              tipo_envio: redacao.tipo_redacao || 'Regular',
              corretor_nome: ensureUtf8(corretorNome || corretorEmail),
              nota: notas.total
            }
          });
        } catch (_e) { /* silent — email failure não bloqueia o fluxo */ }
      }

      toast({
        title: status === 'corrigida' ? "Correção finalizada!" : "Correção salva!",
        description: status === 'corrigida' ? "A correção foi finalizada e está disponível para o aluno." : "Você pode continuar a correção depois."
      });

      onRefreshList();
      if (status === 'corrigida') onSucesso();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message || "Não foi possível salvar a correção.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [redacao, notas, comentarios, toast, onSucesso, onRefreshList, refetchMarcacoesPEP, corretorNome, corretorEmail]);

  const atualizarNota = (competencia: keyof Omit<NotasCorrecao, 'total'>, valor: number) => {
    setNotas(prev => ({ ...prev, [competencia]: valor }));
  };

  const atualizarComentario = (competencia: keyof ComentariosCorrecao, valor: string) => {
    setComentarios(prev => ({ ...prev, [competencia]: valor }));
  };

  const devolverRedacao = useCallback(async () => {
    if (!motivoDevolucao.trim()) {
      toast({ title: "Motivo obrigatório", description: "Por favor, explique o motivo da devolução.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const tabelaNome = redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio';
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';
      const updateData: any = { [`status_${prefixo}`]: 'devolvida' };
      if (redacao.tipo_redacao === 'regular') updateData.status = 'devolvida';
      updateData[`elogios_pontos_atencao_${prefixo}`] = `Sua redação foi devolvida pelo corretor com a seguinte justificativa:\n\n${motivoDevolucao}`;

      const { error } = await supabase.from(tabelaNome).update(updateData).eq('id', redacao.id);
      if (error) throw error;

      toast({ title: "Redação devolvida", description: "A redação foi devolvida ao aluno." });
      setShowDevolverModal(false);
      setMotivoDevolucao("");
      onRefreshList();
      onSucesso();
    } catch (error: any) {
      toast({ title: "Erro ao devolver", description: error.message || "Não foi possível devolver a redação.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [redacao, motivoDevolucao, toast, onRefreshList, onSucesso]);

  const copiarRedacaoDigitada = () => {
    const texto = `Nome do Aluno: ${redacao.nome_aluno}\n\nFrase Temática: ${redacao.frase_tematica}\n\nTexto da Redação:\n${redacao.texto || 'Texto não disponível'}`;
    navigator.clipboard.writeText(texto).then(
      () => toast({ title: "Copiado!", description: "Redação copiada para a área de transferência." }),
      () => toast({ title: "Erro", description: "Não foi possível copiar o texto.", variant: "destructive" })
    );
  };

  const handleMouseUpTexto = () => {
    if (!modoTexto || !textoCorretorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    try {
      const range = sel.getRangeAt(0);
      const container = textoCorretorRef.current;
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        sel.removeAllRanges();
        return;
      }
      const preRange = document.createRange();
      preRange.selectNodeContents(container);
      preRange.setEnd(range.startContainer, range.startOffset);
      const inicio = preRange.toString().length;
      const selected = sel.toString();
      if (!selected.trim()) return;
      sel.removeAllRanges();
      setTimeout(() => {
        setDialogAnotacao({ mode: 'nova', trecho: selected, inicio, fim: inicio + selected.length, competencia: 'c1', tipo: 'erro', comentario: '', sugestao_reescrita: '' });
      }, 10);
    } catch {
      window.getSelection()?.removeAllRanges();
    }
  };

  const refinarElogios = async () => {
    if (!comentarios.elogios.trim()) {
      toast({ title: "Atenção", description: "Digite a mensagem antes de refinar.", variant: "destructive" });
      return;
    }
    setRefineElogiosLoading(true);
    setRefineElogiosSugestoes([]);
    try {
      const { data, error } = await supabase.functions.invoke('refinar-comentario-corretor', { body: { comentario: comentarios.elogios.trim() } });
      if (error) throw error;
      if (data?.sugestoes && Array.isArray(data.sugestoes)) setRefineElogiosSugestoes(data.sugestoes);
    } catch (err: any) {
      toast({ title: "Erro ao refinar", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setRefineElogiosLoading(false);
    }
  };

  const hasImage = !!(redacao as any).redacao_imagem_gerada_url || !!redacao.redacao_manuscrita_url;
  const imagemUrl = (redacao as any).redacao_imagem_gerada_url || redacao.redacao_manuscrita_url;
  const isImagemGerada = !!(redacao as any).redacao_imagem_gerada_url;

  // Modo texto com marcações Jarvis: só disponível para digitadas com Jarvis corrigido
  const hasJarvisAtivo = isImagemGerada && !!redacao.texto && redacao.jarvis_precorrecao_status === 'corrigida';
  const [modoTexto, setModoTexto] = useState(false);

  // Sincroniza modo texto quando a redação muda
  useEffect(() => {
    setModoTexto(hasJarvisAtivo);
  }, [redacao.id]);

  const {
    marcacoes: marcacoesJarvis,
    inserir: inserirAnotacao, isInserting: isInsertingAnotacao,
    confirmar: confirmarMarcacao, ignorar: ignorarMarcacao,
    isSaving: isSavingMarcacao,
  } = useComentariosTrechoCorrecao(hasJarvisAtivo ? redacao.id : null);
  const [tooltipMarcacao, setTooltipMarcacao] = useState<ComentarioTrecho | null>(null);
  const textoCorretorRef = useRef<HTMLDivElement>(null);
  const [dialogAnotacao, setDialogAnotacao] = useState<DialogAnotacao | null>(null);

  const dataFormatada = new Date(redacao.data_envio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const statusLabel = STATUS_LABELS[redacao.status_minha_correcao] || redacao.status_minha_correcao;

  // Indicador de discrepância
  const showDiscrepancia = redacaoFinalizada && parUtilizado != null &&
    ((redacao.eh_corretor_1 && parUtilizado === '2_admin') || (!redacao.eh_corretor_1 && parUtilizado === '1_admin'));

  return (
    <div className="container-corretor space-y-4 pb-8">
      {/* Botão Voltar */}
      <Button variant="outline" onClick={onVoltar} className="flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      {/* Cabeçalho premium com gradiente */}
      <section className="rounded-2xl overflow-hidden border border-violet-100 bg-white shadow-md">
        <div className="bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 px-6 py-5 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setShowTemaModal(true)}
                className="text-xs font-bold uppercase tracking-widest text-violet-300 hover:text-white mb-1 transition-colors"
              >
                Ver tema completo →
              </button>
              <h1 className="text-lg font-black leading-snug">{redacao.frase_tematica}</h1>
              <p className="mt-1.5 text-sm text-violet-200">
                {redacao.nome_aluno}
                {redacao.turma ? ` • ${redacao.turma}` : ''}
                {` • ${dataFormatada}`}
                {corretorNome ? ` • Corretor: ${corretorNome}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                {statusLabel}
              </span>
              <div className="rounded-2xl bg-white/10 px-5 py-3 text-center backdrop-blur border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Nota final</p>
                <p className="text-3xl font-black leading-none mt-1">{notas.total}</p>
                <p className="text-[10px] text-violet-200 mt-0.5">de 1000</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notas por competência */}
        <div className="grid grid-cols-5 gap-2.5 bg-white px-6 py-4 border-t border-violet-50">
          {(Object.keys(COMP_INFO) as (keyof typeof COMP_INFO)[]).map((key, i) => {
            const info = COMP_INFO[key];
            const num = i + 1;
            return (
              <div key={key} className="rounded-xl border p-2.5" style={{ backgroundColor: info.bg, borderColor: info.cor + '33' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black" style={{ color: info.tc }}>C{num}</span>
                  <Select value={notas[key].toString()} onValueChange={(v) => atualizarNota(key, parseInt(v))}>
                    <SelectTrigger className="h-7 w-14 text-xs border-0 bg-white/70 px-1.5" style={{ color: info.tc }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {opcoesNota.map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="h-1.5 rounded-full bg-white/80">
                  <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${notas[key] / 2}%`, backgroundColor: info.cor }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Layout de duas colunas — redação protagonista */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* ── COLUNA PRINCIPAL: REDAÇÃO ── */}
        <main className="min-w-0 space-y-4">
          {/* Alertas */}
          {redacaoCongelada && (
            <Alert variant="destructive" className="border-cyan-500 bg-cyan-50">
              <AlertTriangle className="h-4 w-4 text-cyan-600" />
              <AlertTitle className="text-cyan-800">Redação Congelada</AlertTitle>
              <AlertDescription className="text-cyan-700">
                O prazo de 7 dias para correção expirou. Esta redação está congelada e não pode ser corrigida até que um administrador a desbloqueie.
              </AlertDescription>
            </Alert>
          )}

          {showDiscrepancia && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl">
              <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">Houve discrepância nesta redação</p>
                <p className="text-sm text-amber-700 mt-1">
                  Após a terceira correção, <strong>sua avaliação não compôs a nota final</strong>. A nota foi calculada com base no par de avaliadores mais próximos.
                </p>
              </div>
            </div>
          )}

          {/* Redação em imagem — ocupa máximo do contêiner */}
          {hasImage && (
            <div className="min-w-0 rounded-2xl border border-violet-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-violet-100 px-5 py-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    {isImagemGerada
                      ? (modoTexto ? 'Redação — texto com marcações' : 'Redação digitalizada')
                      : 'Redação manuscrita'}
                  </h2>
                  {(redacao as any).contagem_palavras ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(redacao as any).contagem_palavras} palavras
                    </p>
                  ) : null}
                </div>
                {/* Toggle imagem / texto — só para digitadas com Jarvis */}
                {hasJarvisAtivo && (
                  <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden text-xs">
                    <button
                      onClick={() => setModoTexto(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${!modoTexto ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <ImageIcon className="w-3 h-3" /> Imagem
                    </button>
                    <button
                      onClick={() => setModoTexto(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${modoTexto ? 'bg-violet-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <FileText className="w-3 h-3" /> Texto
                    </button>
                  </div>
                )}
              </div>

              {/* Modo texto — redação com highlights do Jarvis */}
              {modoTexto && redacao.texto ? (
                <div className="p-6">
                  <p className="text-[11px] text-slate-400 mb-3">Selecione um trecho do texto para criar uma marcação do corretor</p>
                  <div
                    ref={textoCorretorRef}
                    onMouseUp={handleMouseUpTexto}
                    className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 font-serif cursor-text select-text"
                  >
                    {(() => {
                      const visiveis = marcacoesJarvis.filter(
                        m => m.status !== 'ignorada' && m.inicio >= 0 && m.fim <= redacao.texto!.length && m.fim > m.inicio
                      );
                      if (!visiveis.length) return redacao.texto;

                      const sorted = [...visiveis].sort((a, b) => a.inicio - b.inicio);
                      const parts: React.ReactNode[] = [];
                      let cursor = 0;

                      const COMP_HL: Record<string, string> = {
                        c1: 'bg-red-100 text-red-900 border-b-2 border-red-300',
                        c2: 'bg-emerald-100 text-emerald-900 border-b-2 border-emerald-300',
                        c3: 'bg-blue-100 text-blue-900 border-b-2 border-blue-300',
                        c4: 'bg-orange-100 text-orange-900 border-b-2 border-orange-300',
                        c5: 'bg-purple-100 text-purple-900 border-b-2 border-purple-300',
                      };

                      for (const m of sorted) {
                        if (m.inicio > cursor) parts.push(<span key={`t-${cursor}`}>{redacao.texto!.slice(cursor, m.inicio)}</span>);
                        if (m.fim > m.inicio) {
                          const cls = m.status === 'sugerida'
                            ? 'bg-violet-100 text-violet-900 border-b-2 border-dashed border-violet-400 cursor-pointer hover:bg-violet-200'
                            : (COMP_HL[m.competencia] ?? 'bg-yellow-100') + ' cursor-pointer hover:opacity-80';
                          parts.push(
                            <span
                              key={m.id}
                              className={`rounded-sm px-0.5 transition-colors ${cls}`}
                              onClick={() => {
                                if (m.status === 'sugerida') {
                                  setDialogAnotacao({
                                    mode: 'editar',
                                    existingId: m.id,
                                    trecho: m.trecho,
                                    inicio: m.inicio,
                                    fim: m.fim,
                                    paragrafo: m.paragrafo ?? undefined,
                                    competencia: m.competencia,
                                    tipo: m.tipo ?? 'erro',
                                    comentario: m.comentario,
                                    sugestao_reescrita: m.sugestao_reescrita ?? '',
                                  });
                                } else {
                                  setTooltipMarcacao(m);
                                }
                              }}
                              title={m.status === 'sugerida' ? 'Clique para revisar esta sugestão do Jarvis' : m.comentario}
                            >
                              {redacao.texto!.slice(m.inicio, m.fim)}
                            </span>
                          );
                        }
                        cursor = Math.max(cursor, m.fim);
                      }
                      if (cursor < redacao.texto!.length) parts.push(<span key={`t-end`}>{redacao.texto!.slice(cursor)}</span>);
                      return parts;
                    })()}
                  </div>

                  {/* Legenda */}
                  {marcacoesJarvis.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Legenda:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-5 h-2 rounded-sm bg-violet-100 border-b-2 border-dashed border-violet-400" />
                        <span className="text-[10px] text-slate-500">Sugestão pendente</span>
                      </div>
                      {['c1','c2','c3','c4','c5'].map((c, i) => {
                        const colors = ['bg-red-100 border-red-300','bg-emerald-100 border-emerald-300','bg-blue-100 border-blue-300','bg-orange-100 border-orange-300','bg-purple-100 border-purple-300'];
                        return (
                          <div key={c} className="flex items-center gap-1">
                            <span className={`inline-block w-5 h-2 rounded-sm border-b-2 ${colors[i]}`} />
                            <span className="text-[10px] text-slate-500">C{i+1}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <RedacaoAnotacaoVisual
                  ref={anotacaoRef}
                  imagemUrl={imagemUrl!}
                  redacaoId={redacao.id}
                  corretorId={corretorId}
                  ehCorretor1={redacao.eh_corretor_1}
                  ehCorretor2={redacao.eh_corretor_2}
                  statusMinhaCorrecao={redacao.status_minha_correcao}
                  tipoTabela={
                    redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' :
                    redacao.tipo_redacao === 'exercicio' ? 'redacoes_exercicio' :
                    'redacoes_enviadas'
                  }
                  onAnotacoesChange={handleAnotacoesChange}
                />
              )}
            </div>
          )}

          {/* Redação digitada (sem imagem) */}
          {!hasImage && (
            <div className="min-w-0 rounded-2xl border border-violet-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-violet-100 px-5 py-3">
                <h2 className="text-sm font-black text-slate-900">Redação Digitada</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copiarRedacaoDigitada} aria-label="Copiar redação">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowRedacaoExpandida(true)} aria-label="Expandir redação">
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <div className="max-h-[300px] overflow-y-auto p-4 border rounded-xl bg-background prose whitespace-pre-wrap leading-relaxed text-sm">
                  {redacao.texto || 'Texto da redação não disponível'}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── SIDEBAR ── */}
        <aside className="min-w-0 space-y-3">

          {/* 1. Mensagem pedagógica */}
          <div className="rounded-2xl border border-violet-100 bg-white shadow-sm">
            <div className="px-4 py-3 border-b border-violet-50">
              <h3 className="text-sm font-black text-slate-900">Mensagem pedagógica do corretor</h3>
            </div>
            <div className="p-4 space-y-2">
              <textarea
                placeholder="Escreva aqui a mensagem pedagógica para o aluno…"
                value={comentarios.elogios}
                onChange={(e) => atualizarComentario('elogios', e.target.value)}
                className="w-full min-h-[130px] resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refinarElogios}
                  disabled={refineElogiosLoading || !comentarios.elogios.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 border border-purple-300 hover:bg-purple-100 px-2.5 py-1.5 rounded-xl disabled:opacity-50 transition-colors"
                >
                  {refineElogiosLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <JarvisIcon size={12} />}
                  {refineElogiosLoading ? 'Refinando…' : 'Refinar clareza'}
                </button>
                {refineElogiosSugestoes.length > 0 && (
                  <button type="button" onClick={() => setRefineElogiosSugestoes([])} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Ignorar
                  </button>
                )}
              </div>
              {refineElogiosSugestoes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">Sugestões:</p>
                  {refineElogiosSugestoes.map((s, i) => (
                    <button
                      key={i} type="button"
                      onClick={() => { atualizarComentario('elogios', s); setRefineElogiosSugestoes([]); }}
                      className="w-full text-left text-xs p-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Gravar mensagem */}
          <div className="rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="px-4 py-3 border-b border-red-50">
              <h3 className="text-sm font-black text-slate-900">Gravar mensagem</h3>
              <p className="text-xs text-red-500 mt-0.5">Mensagem em áudio para o aluno</p>
            </div>
            <div className="p-4">
              <AudioRecorder
                redacaoId={redacao.id}
                tabela={redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio'}
                onAudioSaved={(url) => setAudioUrl(url)}
                existingAudioUrl={audioUrl}
                ehCorretor1={redacao.eh_corretor_1}
              />
            </div>
          </div>

          {/* 3. Plano de Estudo (PEP) */}
          <div className={`rounded-2xl border bg-white shadow-sm ${marcacoesPEP.length === 0 ? 'border-amber-300' : 'border-green-200'}`}>
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 leading-tight">Plano de Estudo (PEP)</h3>
                <p className={`text-xs mt-0.5 ${marcacoesPEP.length === 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {marcacoesPEP.length === 0 ? 'Preencha antes de finalizar' : `${marcacoesPEP.length} marcação(ões)`}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setShowPEPModal(true)}
                size="sm"
                className={`shrink-0 gap-1.5 text-xs font-semibold ${marcacoesPEP.length === 0 ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' : 'bg-[#3f0776] hover:bg-[#5a1a9e] text-white'}`}
              >
                <BookMarked className="w-3.5 h-3.5" />
                Preencher
              </Button>
            </div>
          </div>

          {/* Sugestão do Jarvis */}
          {redacao.jarvis_precorrecao_id && redacao.jarvis_precorrecao_status === 'corrigida' && (
            <div className="rounded-2xl border border-violet-300 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-sm">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    <h3 className="text-sm font-black text-violet-900 leading-tight">Sugestão do Jarvis</h3>
                  </div>
                  <p className="text-xs text-violet-600 mt-0.5">Pré-correção por IA disponível</p>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowJarvisPanel(true)}
                  size="sm"
                  className="shrink-0 gap-1.5 text-xs font-semibold bg-violet-700 hover:bg-violet-800 text-white"
                >
                  Ver
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* 4. Ações da correção */}
          <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-3">Ações da correção</h3>
            <div className="space-y-2">
              {isImagemGerada && (
                <button
                  onClick={copiarRedacaoDigitada}
                  className="w-full rounded-xl border px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Copiar redação
                </button>
              )}
              <button
                onClick={() => salvarCorrecao('incompleta')}
                disabled={loading || redacaoCongelada}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                Incompleta
              </button>
              <button
                onClick={() => setShowDevolverModal(true)}
                disabled={loading || redacaoCongelada}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Devolver redação
              </button>
              <button
                onClick={() => salvarCorrecao('corrigida')}
                disabled={loading || redacaoCongelada}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold text-white disabled:opacity-50 transition-colors ${marcacoesPEP.length === 0 ? 'bg-slate-400 hover:bg-slate-500 cursor-not-allowed' : 'bg-violet-700 hover:bg-violet-800'}`}
                title={marcacoesPEP.length === 0 ? 'Preencha o PEP antes de finalizar' : undefined}
              >
                {loading ? 'Salvando…' : 'Finalizar correção'}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Modals ─── */}
      <RelatorioPedagogicoModal
        isOpen={showRelatorioModal}
        onClose={() => setShowRelatorioModal(false)}
        value={comentarios.elogios}
        onChange={(value) => atualizarComentario('elogios', value)}
        alunoNome={redacao.nome_aluno}
        fraseTematica={redacao.frase_tematica}
      />

      <TemaModal isOpen={showTemaModal} onClose={() => setShowTemaModal(false)} tema={temaCompleto} />

      <PEPMarcacaoModal
        open={showPEPModal}
        onClose={() => setShowPEPModal(false)}
        redacaoId={redacao.id}
        redacaoTipo={redacao.tipo_redacao === 'simulado' ? 'simulado' : redacao.tipo_redacao === 'exercicio' ? 'exercicio' : 'regular'}
        alunoEmail={(redacao as any).email_aluno ?? ''}
        corretorEmail={corretorEmail}
      />

      {/* Modal de Devolução */}
      <Dialog open={showDevolverModal} onOpenChange={setShowDevolverModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deseja devolver essa redação?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Essa redação será devolvida ao aluno para que ele possa enviá-la novamente.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo</label>
              <TextareaWithSpellcheck
                placeholder="Explique o motivo da devolução"
                value={motivoDevolucao}
                onChange={(e) => setMotivoDevolucao(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowDevolverModal(false); setMotivoDevolucao(""); }} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={devolverRedacao} disabled={loading || !motivoDevolucao.trim()} className="bg-[#E53935] hover:bg-[#D32F2F] text-white">
                {loading ? "Devolvendo..." : "Devolver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Painel lateral — Sugestão do Jarvis */}
      <Sheet open={showJarvisPanel} onOpenChange={setShowJarvisPanel}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0">
          <SheetHeader className="border-b px-6 py-4 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-violet-900">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Sugestão do Jarvis
            </SheetTitle>
          </SheetHeader>

          {loadingJarvis && (
            <div className="flex items-center justify-center flex-1 py-16">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
            </div>
          )}

          {!loadingJarvis && jarvisData && (
            <Tabs defaultValue="analise" className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="shrink-0 mx-6 mt-4 mb-0 grid w-auto grid-cols-2 bg-slate-100">
                <TabsTrigger value="analise" className="text-xs font-semibold">Análise</TabsTrigger>
                <TabsTrigger value="marcacoes" className="text-xs font-semibold" disabled={!redacao.texto}>
                  Marcações
                </TabsTrigger>
              </TabsList>

              {/* Aba: Análise */}
              <TabsContent value="analise" className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                  {/* Notas sugeridas */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Notas sugeridas</p>
                    <div className="grid grid-cols-5 gap-2">
                      {(Object.keys(COMP_INFO) as (keyof typeof COMP_INFO)[]).map((key, i) => {
                        const info = COMP_INFO[key];
                        const nota = jarvisData[`nota_${key}`] ?? jarvisData.correcao_ia?.competencias?.[key]?.nota ?? 0;
                        return (
                          <div key={key} className="rounded-xl border p-2 text-center" style={{ backgroundColor: info.bg, borderColor: info.cor + '33' }}>
                            <p className="text-[10px] font-black" style={{ color: info.tc }}>C{i + 1}</p>
                            <p className="text-lg font-black leading-none mt-1" style={{ color: info.cor }}>{nota}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 p-3 rounded-xl bg-violet-50 border border-violet-200 text-center">
                      <p className="text-xs text-violet-600 font-bold uppercase tracking-wide">Nota total</p>
                      <p className="text-2xl font-black text-violet-800">{jarvisData.nota_total ?? 0}</p>
                    </div>
                  </div>

                  {/* Análise por competência */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Análise por competência</p>
                    <div className="space-y-3">
                      {(Object.keys(COMP_INFO) as (keyof typeof COMP_INFO)[]).map((key, i) => {
                        const info = COMP_INFO[key];
                        const justificativa = jarvisData.correcao_ia?.competencias?.[key]?.justificativa;
                        if (!justificativa) return null;
                        return (
                          <div key={key} className="rounded-xl border p-3" style={{ backgroundColor: info.bg, borderColor: info.cor + '33' }}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs font-black" style={{ color: info.tc }}>C{i + 1}</span>
                              <span className="text-xs text-slate-400">—</span>
                              <span className="text-xs font-semibold text-slate-600">{info.label}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{justificativa}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pontos de atenção */}
                  {jarvisData.correcao_ia?.sugestoes_objetivas?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Pontos de atenção</p>
                      <ul className="space-y-1.5">
                        {(jarvisData.correcao_ia.sugestoes_objetivas as string[]).map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                            <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Versão lapidada */}
                  {jarvisData.correcao_ia?.versao_lapidada && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Versão lapidada</p>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{jarvisData.correcao_ia.versao_lapidada}</p>
                      </div>
                    </div>
                  )}

                  {/* Aviso */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <strong>Atenção:</strong> estas são sugestões da IA e servem de apoio à sua análise. A correção final é de sua responsabilidade.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Aba: Marcações de trecho */}
              <TabsContent value="marcacoes" className="flex-1 overflow-y-auto px-6 py-4">
                {redacao.texto ? (
                  <MarcacoesJarvisPanel
                    redacaoEnviadaId={redacao.id}
                    texto={redacao.texto}
                  />
                ) : (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-sm">Marcações disponíveis apenas para redações digitadas.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de Redação Expandida */}
      <Dialog open={showRedacaoExpandida} onOpenChange={setShowRedacaoExpandida}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Redação — {redacao.nome_aluno}</span>
              <Button variant="ghost" size="sm" onClick={() => setShowRedacaoExpandida(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground"><strong>Tema:</strong> {redacao.frase_tematica}</p>
            <div className="max-h-[55vh] overflow-y-auto p-4 border rounded-xl bg-background whitespace-pre-wrap leading-relaxed text-sm">
              {redacao.texto || 'Texto não disponível'}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={copiarRedacaoDigitada}>
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button onClick={() => setShowRedacaoExpandida(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: detalhe de marcação ao clicar no highlight */}
      <Dialog open={!!tooltipMarcacao} onOpenChange={(open) => !open && setTooltipMarcacao(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
              {tooltipMarcacao && COMP_INFO[tooltipMarcacao.competencia as keyof typeof COMP_INFO] && (
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: COMP_INFO[tooltipMarcacao.competencia as keyof typeof COMP_INFO].bg,
                    color: COMP_INFO[tooltipMarcacao.competencia as keyof typeof COMP_INFO].tc,
                  }}
                >
                  {tooltipMarcacao.competencia.toUpperCase()}
                </span>
              )}
              <span>Marcação de trecho</span>
              {tooltipMarcacao?.tipo && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {TIPO_LABELS_FORM[tooltipMarcacao.tipo] ?? tooltipMarcacao.tipo}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {tooltipMarcacao && (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Trecho</p>
                <p className="text-sm italic text-slate-700">"{tooltipMarcacao.trecho}"</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Comentário</p>
                <p className="text-sm text-slate-800 leading-relaxed">{tooltipMarcacao.comentario}</p>
              </div>
              {tooltipMarcacao.sugestao_reescrita && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-1">Sugestão de reescrita</p>
                  <p className="text-sm italic text-emerald-800">"{tooltipMarcacao.sugestao_reescrita}"</p>
                </div>
              )}
              <p className="text-[10px] text-slate-400">
                Origem: {tooltipMarcacao.origem === 'jarvis' ? 'Jarvis (IA)' : 'Corretor'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog unificado: revisão de sugestão Jarvis (editar) ou nova marcação manual (nova) */}
      <Dialog open={!!dialogAnotacao} onOpenChange={(open) => !open && setDialogAnotacao(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogAnotacao?.mode === 'editar' ? (
                <><Sparkles className="w-4 h-4 text-violet-500" /> Revisar sugestão do Jarvis</>
              ) : 'Nova marcação do corretor'}
            </DialogTitle>
          </DialogHeader>
          {dialogAnotacao && (
            <div className="space-y-4">
              {/* Trecho */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {dialogAnotacao.mode === 'editar' ? 'Trecho marcado pelo Jarvis' : 'Trecho selecionado'}
                  </p>
                  {dialogAnotacao.paragrafo && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">¶{dialogAnotacao.paragrafo}</span>
                  )}
                </div>
                <p className="text-sm italic text-slate-700">"{dialogAnotacao.trecho}"</p>
              </div>

              {/* Competência + Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Competência</label>
                  <Select value={dialogAnotacao.competencia} onValueChange={(v) => setDialogAnotacao(p => p ? { ...p, competencia: v } : null)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="c1">C1 — Norma-padrão</SelectItem>
                      <SelectItem value="c2">C2 — Tema e repertório</SelectItem>
                      <SelectItem value="c3">C3 — Projeto de texto</SelectItem>
                      <SelectItem value="c4">C4 — Coesão</SelectItem>
                      <SelectItem value="c5">C5 — Intervenção</SelectItem>
                      <SelectItem value="pa">PA — Ponto de atenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Tipo</label>
                  <Select value={dialogAnotacao.tipo} onValueChange={(v) => setDialogAnotacao(p => p ? { ...p, tipo: v } : null)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="erro">Erro</SelectItem>
                      <SelectItem value="dica">Dica</SelectItem>
                      <SelectItem value="ponto_de_atencao">Ponto de atenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Comentário */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Comentário *</label>
                <TextareaWithSpellcheck
                  value={dialogAnotacao.comentario}
                  onChange={(e) => setDialogAnotacao(p => p ? { ...p, comentario: e.target.value } : null)}
                  placeholder="Explique o erro ou orientação para o aluno..."
                  className="text-xs min-h-[80px] resize-none"
                  maxLength={300}
                />
                <p className="text-[10px] text-slate-400 text-right mt-0.5">{dialogAnotacao.comentario.length}/300</p>
              </div>

              {/* Sugestão de reescrita */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Sugestão de reescrita <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <TextareaWithSpellcheck
                  value={dialogAnotacao.sugestao_reescrita}
                  onChange={(e) => setDialogAnotacao(p => p ? { ...p, sugestao_reescrita: e.target.value } : null)}
                  placeholder="Como poderia ser reescrito?"
                  className="text-xs min-h-[56px] resize-none"
                  maxLength={200}
                />
              </div>

              {/* Ações */}
              <div className="flex gap-2 items-center pt-1">
                {dialogAnotacao.mode === 'editar' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-red-600 hover:bg-red-50"
                    onClick={() => { ignorarMarcacao(dialogAnotacao.existingId!); setDialogAnotacao(null); }}
                  >
                    <X className="w-3 h-3 mr-1" /> Ignorar
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDialogAnotacao(null)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={!dialogAnotacao.comentario.trim() || isInsertingAnotacao || isSavingMarcacao}
                    onClick={() => {
                      if (dialogAnotacao.mode === 'editar') {
                        confirmarMarcacao(dialogAnotacao.existingId!, {
                          competencia: dialogAnotacao.competencia,
                          tipo: dialogAnotacao.tipo,
                          comentario: dialogAnotacao.comentario.trim(),
                          sugestao_reescrita: dialogAnotacao.sugestao_reescrita.trim() || undefined,
                        });
                      } else {
                        inserirAnotacao({
                          trecho: dialogAnotacao.trecho,
                          inicio: dialogAnotacao.inicio,
                          fim: dialogAnotacao.fim,
                          competencia: dialogAnotacao.competencia,
                          tipo: dialogAnotacao.tipo,
                          comentario: dialogAnotacao.comentario.trim(),
                          sugestao_reescrita: dialogAnotacao.sugestao_reescrita.trim() || undefined,
                        });
                      }
                      setDialogAnotacao(null);
                    }}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    {(isInsertingAnotacao || isSavingMarcacao) && <Loader2 className="w-3 h-3 animate-spin" />}
                    {dialogAnotacao.mode === 'editar' ? 'Confirmar' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
