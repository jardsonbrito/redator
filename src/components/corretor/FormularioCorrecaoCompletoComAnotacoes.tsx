import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Copy, Maximize2, X, AlertTriangle, Info, BookMarked, Loader2 } from "lucide-react";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
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

  // Ref para RedacaoAnotacaoVisual — permite triggerLimparTodasAnotacoes
  const anotacaoRef = useRef<RedacaoAnotacaoVisualRef>(null);

  const { data: marcacoesPEP = [], refetch: refetchMarcacoesPEP } = useMarcacoesRedacao(redacao.id);
  const { toast } = useToast();

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

      {/* Layout de duas colunas */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

        {/* Coluna principal: Redação */}
        <div className="space-y-4">
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

          {/* Card da Redação em Imagem */}
          {hasImage && (
            <Card className="w-full overflow-hidden shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {isImagemGerada ? 'Redação digitalizada' : 'Redação manuscrita'}
                    </CardTitle>
                    {(redacao as any).contagem_palavras ? (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {(redacao as any).contagem_palavras} palavras
                      </p>
                    ) : null}
                  </div>
                  {isImagemGerada && (
                    <Button variant="outline" size="sm" onClick={copiarRedacaoDigitada}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar redação
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 m-0">
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
              </CardContent>
            </Card>
          )}

          {/* Redação digitada (sem imagem) */}
          {!hasImage && (
            <Card className="card">
              <CardHeader className="card__header">
                <CardTitle>Redação Digitada</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={copiarRedacaoDigitada} className="icon-btn" aria-label="Copiar redação">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setShowRedacaoExpandida(true)} className="icon-btn" aria-label="Expandir redação">
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto p-4 border rounded-xl bg-background prose whitespace-pre-wrap leading-relaxed text-sm">
                  {redacao.texto || 'Texto da redação não disponível'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">

          {/* Plano de Estudo (PEP) */}
          <Card className={`shadow-sm ${marcacoesPEP.length === 0 ? 'border-amber-300' : 'border-green-200'}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-800">Plano de Estudo (PEP)</p>
                  {marcacoesPEP.length === 0 && (
                    <p className="text-xs text-amber-600 mt-0.5">⚠ Preencha antes de finalizar</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => setShowPEPModal(true)}
                  size="sm"
                  className={`gap-1.5 text-xs font-semibold ${marcacoesPEP.length === 0 ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' : 'bg-[#3f0776] hover:bg-[#5a1a9e] text-white'}`}
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  {marcacoesPEP.length > 0 ? `PEP (${marcacoesPEP.length})` : 'Preencher PEP'}
                </Button>
              </div>

              {/* Áudio */}
              <div className="pt-1 border-t">
                <p className="text-xs font-semibold text-slate-500 mb-2">Gravar mensagem para o aluno</p>
                <AudioRecorder
                  redacaoId={redacao.id}
                  tabela={redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio'}
                  onAudioSaved={(url) => setAudioUrl(url)}
                  existingAudioUrl={audioUrl}
                  ehCorretor1={redacao.eh_corretor_1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ações da correção */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Ações da correção</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {isImagemGerada && (
                <button
                  onClick={copiarRedacaoDigitada}
                  className="w-full rounded-xl border px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Copiar redação
                </button>
              )}
              {totalAnotacoes > 0 && (
                <button
                  onClick={() => anotacaoRef.current?.triggerLimparTodasAnotacoes()}
                  className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  disabled={redacaoCongelada}
                >
                  Limpar todas as marcações
                </button>
              )}
            </CardContent>
          </Card>

          {/* Comentários por competência */}
          {totalAnotacoes > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  Comentários por competência
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{totalAnotacoes}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {PILLS_INFO.map(({ key, label, cor }) => {
                    const count = anotacoesCounts[key] || 0;
                    if (count === 0) return null;
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{ backgroundColor: cor + '18', color: cor, border: `1px solid ${cor}44` }}
                      >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cor }} />
                        {label} ({count})
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mensagem pedagógica do corretor */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Mensagem pedagógica do corretor</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <textarea
                placeholder="Escreva aqui a mensagem pedagógica para o aluno…"
                value={comentarios.elogios}
                onChange={(e) => atualizarComentario('elogios', e.target.value)}
                className="w-full min-h-[140px] resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={refinarElogios}
                  disabled={refineElogiosLoading || !comentarios.elogios.trim()}
                  className="flex items-center gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-200 hover:border-purple-500 hover:text-purple-900"
                >
                  {refineElogiosLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <JarvisIcon size={14} />}
                  {refineElogiosLoading ? 'Refinando…' : 'Refinar clareza'}
                </Button>
                {refineElogiosSugestoes.length > 0 && (
                  <button type="button" onClick={() => setRefineElogiosSugestoes([])} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Ignorar
                  </button>
                )}
              </div>
              {refineElogiosSugestoes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-700">Sugestões — clique para usar:</p>
                  {refineElogiosSugestoes.map((s, i) => (
                    <button
                      key={i} type="button"
                      onClick={() => { atualizarComentario('elogios', s); setRefineElogiosSugestoes([]); }}
                      className="w-full text-left text-sm p-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Finalização */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Finalização</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <button
                onClick={() => salvarCorrecao('incompleta')}
                disabled={loading || redacaoCongelada}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-left text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                Incompleta
              </button>
              <button
                onClick={() => setShowDevolverModal(true)}
                disabled={loading || redacaoCongelada}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Devolver redação
              </button>
              <button
                onClick={() => salvarCorrecao('corrigida')}
                disabled={loading || redacaoCongelada}
                className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold text-white disabled:opacity-50 transition-colors ${marcacoesPEP.length === 0 ? 'bg-slate-400 hover:bg-slate-500 cursor-not-allowed' : 'bg-violet-700 hover:bg-violet-800'}`}
                title={marcacoesPEP.length === 0 ? 'Preencha o Plano de Estudo (PEP) antes de finalizar' : undefined}
              >
                {loading ? 'Salvando…' : 'Finalizar correção'}
              </button>
            </CardContent>
          </Card>
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
    </div>
  );
};
