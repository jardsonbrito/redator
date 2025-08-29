import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, X, Copy, Maximize2, Pause, Package, Check } from "lucide-react";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { RedacaoAnotacaoVisual } from "./RedacaoAnotacaoVisual";
import { RelatorioPedagogicoModal } from "./RelatorioPedagogicoModal";
import { TemaModal } from "./TemaModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder } from "./AudioRecorder";

interface FormularioCorrecaoCompletoComAnotacoesProps {
  redacao: RedacaoCorretor;
  corretorEmail: string;
  onVoltar: () => void;
  onSucesso: () => void;
  onRefreshList: () => void;
}

interface NotasCorrecao {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  total: number;
}

interface ComentariosCorrecao {
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
  elogios: string;
}

const opcoesNota = [0, 40, 80, 120, 160, 200];

export const FormularioCorrecaoCompletoComAnotacoes = ({
  redacao,
  corretorEmail,
  onVoltar,
  onSucesso,
  onRefreshList
}: FormularioCorrecaoCompletoComAnotacoesProps) => {
  const [notas, setNotas] = useState<NotasCorrecao>({
    c1: 0,
    c2: 0,
    c3: 0,
    c4: 0,
    c5: 0,
    total: 0
  });

  const [comentarios, setComentarios] = useState<ComentariosCorrecao>({
    c1: "",
    c2: "",
    c3: "",
    c4: "",
    c5: "",
    elogios: ""
  });

  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [showTemaModal, setShowTemaModal] = useState(false);
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [showRedacaoExpandida, setShowRedacaoExpandida] = useState(false);
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [temaCompleto, setTemaCompleto] = useState<any>(null);
  const [corretorId, setCorretorId] = useState<string>('');
  const { toast } = useToast();

  // Buscar ID do corretor ao carregar
  useEffect(() => {
    const buscarCorretorId = async () => {
      try {
        const { data, error } = await supabase
          .from('corretores')
          .select('id')
          .eq('email', corretorEmail)
          .eq('ativo', true)
          .single();

        if (error) {
          console.error('Erro ao buscar corretor:', error);
          return;
        }

        if (data?.id) {
          setCorretorId(data.id);
          console.log('ID do corretor encontrado:', data.id);
        }
      } catch (error) {
        console.error('Erro ao buscar ID do corretor:', error);
      }
    };

    if (corretorEmail) {
      buscarCorretorId();
    }
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
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .eq('frase_tematica', redacao.frase_tematica)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar tema:', error);
        return;
      }

      if (data) {
        setTemaCompleto(data);
      } else {
        // Se não encontrou tema oficial, é um tema livre
        setTemaCompleto({
          id: null,
          frase_tematica: redacao.frase_tematica
        });
      }
    } catch (error) {
      console.error('Erro ao buscar tema completo:', error);
    }
  };

  const carregarCorrecaoExistente = async () => {
    try {
      let data, error;
      
      if (redacao.tipo_redacao === 'regular') {
        const result = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('id', redacao.id)
          .single();
        data = result.data;
        error = result.error;
      } else if (redacao.tipo_redacao === 'simulado') {
        const result = await supabase
          .from('redacoes_simulado')
          .select('*')
          .eq('id', redacao.id)
          .single();
        data = result.data;
        error = result.error;
      } else if (redacao.tipo_redacao === 'exercicio') {
        const result = await supabase
          .from('redacoes_exercicio')
          .select('*')
          .eq('id', redacao.id)
          .single();
        data = result.data;
        error = result.error;
      } else {
        return;
      }

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

      setComentarios({
        c1: data[`comentario_c1_${prefixo}`] || "",
        c2: data[`comentario_c2_${prefixo}`] || "",
        c3: data[`comentario_c3_${prefixo}`] || "",
        c4: data[`comentario_c4_${prefixo}`] || "",
        c5: data[`comentario_c5_${prefixo}`] || "",
        elogios: data[`elogios_pontos_atencao_${prefixo}`] || ""
      });

      setAudioUrl(data[`audio_url_${prefixo}`] || null);

    } catch (error) {
      console.error('Erro ao carregar correção:', error);
    }
  };

  const salvarCorrecao = useCallback(async (status: 'incompleta' | 'corrigida') => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('salvar_correcao_corretor', {
        redacao_id: redacao.id,
        tabela_nome: redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' :
                     redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 
                     'redacoes_exercicio',
        eh_corretor_1: redacao.eh_corretor_1,
        c1_nota: notas.c1,
        c2_nota: notas.c2,
        c3_nota: notas.c3,
        c4_nota: notas.c4,
        c5_nota: notas.c5,
        nota_final: notas.total,
        status_correcao: status,
        comentario_c1: comentarios.c1,
        comentario_c2: comentarios.c2,
        comentario_c3: comentarios.c3,
        comentario_c4: comentarios.c4,
        comentario_c5: comentarios.c5,
        elogios_pontos: comentarios.elogios
      });

      if (error) throw error;

      console.log('🔍 Status da correção:', status);
      console.log('🔍 Dados para email:', { 
        redacao_id: redacao.id,
        student_email: redacao.email_aluno,
        student_name: redacao.nome_aluno,
        status 
      });

      // Enviar email de notificação se a correção foi finalizada
      if (status === 'corrigida') {
        try {
          console.log('📧 Enviando email de notificação...');
          
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-correction-email', {
            body: {
              redacao_id: redacao.id,
              student_email: redacao.email_aluno,
              student_name: redacao.nome_aluno,
              tema_titulo: redacao.frase_tematica || 'Tema sem título',
              tipo_envio: redacao.tipo_redacao || 'Regular',
              corretor_nome: corretorEmail,
              nota: notas.total
            }
          });

          console.log('📧 Resultado do email:', { emailData, emailError });

          if (emailError) {
            console.error('⚠️ Erro ao enviar email:', emailError);
          } else {
            console.log('📧 Email de correção enviado com sucesso!');
          }
        } catch (emailError) {
          console.error('⚠️ Falha no envio do email:', emailError);
        }
      } else {
        console.log('📧 Email não enviado - status não é "corrigida"');
      }

      toast({
        title: status === 'corrigida' ? "Correção finalizada!" : "Correção salva!",
        description: status === 'corrigida' ? 
          "A correção foi finalizada e está disponível para o aluno." :
          "Você pode continuar a correção depois."
      });

      onRefreshList();
      
      if (status === 'corrigida') {
        onSucesso();
      }

    } catch (error: any) {
      console.error('Erro ao salvar correção:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a correção.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [redacao, notas, comentarios, toast, onSucesso, onRefreshList]);

  const atualizarNota = (competencia: keyof Omit<NotasCorrecao, 'total'>, valor: number) => {
    setNotas(prev => ({
      ...prev,
      [competencia]: valor
    }));
  };

  const atualizarComentario = (competencia: keyof ComentariosCorrecao, valor: string) => {
    setComentarios(prev => ({
      ...prev,
      [competencia]: valor
    }));
  };

  const devolverRedacao = useCallback(async () => {
    if (!motivoDevolucao.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, explique o motivo da devolução.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const tabelaNome = redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' :
                        redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 
                        'redacoes_exercicio';
      
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';
      
      const updateData: any = {
        [`status_${prefixo}`]: 'devolvida'
      };

      if (redacao.tipo_redacao === 'regular') {
        updateData.status = 'devolvida';
      }

      // Preencher relatório pedagógico com mensagem de devolução
      updateData[`elogios_pontos_atencao_${prefixo}`] = `Sua redação foi devolvida pelo corretor com a seguinte justificativa:\n\n${motivoDevolucao}`;

      const { error } = await supabase
        .from(tabelaNome)
        .update(updateData)
        .eq('id', redacao.id);

      if (error) throw error;

      toast({
        title: "Redação devolvida",
        description: "A redação foi devolvida ao aluno."
      });

      setShowDevolverModal(false);
      setMotivoDevolucao("");
      onRefreshList();
      onSucesso();

    } catch (error: any) {
      console.error('Erro ao devolver redação:', error);
      toast({
        title: "Erro ao devolver",
        description: error.message || "Não foi possível devolver a redação.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [redacao, motivoDevolucao, toast, onRefreshList, onSucesso]);

  // Função para copiar redação digitada
  const copiarRedacaoDigitada = () => {
    const textoFormatado = `Nome do Aluno: ${redacao.nome_aluno}\n\nFrase Temática: ${redacao.frase_tematica}\n\nTexto da Redação:\n${redacao.texto || 'Texto não disponível'}`;
    
    navigator.clipboard.writeText(textoFormatado).then(() => {
      toast({
        title: "Copiado!",
        description: "Redação digitada copiada para a área de transferência."
      });
    }).catch(() => {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto.",
        variant: "destructive"
      });
    });
  };

  // Função para copiar relatório pedagógico
  const copiarRelatorioPedagogico = () => {
    const relatorioCompleto = `Nome do Aluno: ${redacao.nome_aluno}\n\nFrase Temática: ${redacao.frase_tematica}\n\nRelatório Pedagógico:\n${comentarios.elogios || 'Nenhum relatório escrito ainda.'}`;
    
    navigator.clipboard.writeText(relatorioCompleto).then(() => {
      toast({
        title: "Copiado!",
        description: "Relatório pedagógico copiado para a área de transferência."
      });
    }).catch(() => {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o relatório.",
        variant: "destructive"
      });
    });
  };

  // Função para formatar texto com quebras de linha
  const formatarTextoComParagrafos = (texto: string) => {
    return texto.split('\n').map((paragrafo, index) => (
      <p key={index} className="mb-2 last:mb-0">
        {paragrafo || '\u00A0'}
      </p>
    ));
  };

  return (
    <div className="container-corretor space-y-4">
      <div className="flex items-start">
        <Button variant="outline" onClick={onVoltar} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      {/* Cabeçalho do painel */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{new Date(redacao.data_envio).toLocaleDateString('pt-BR')}</span>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowTemaModal(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Ver Tema
        </Button>
      </div>

      {/* Informações do aluno */}
      <div className="space-y-2 text-sm">
        <div><strong>Aluno:</strong> {redacao.nome_aluno}</div>
        <div><strong>Tema:</strong> {redacao.frase_tematica}</div>
      </div>

      {/* Vista Pedagógica */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Vista Pedagógica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grid de competências - Duas linhas */}
          <div className="space-y-4">
            {/* Primeira linha: C1, C2, C3 */}
            <div className="grid grid-cols-3 gap-4">
              {(['c1', 'c2', 'c3'] as const).map((competencia, index) => (
                <div key={competencia} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    competencia === 'c1' ? 'bg-red-500' :
                    competencia === 'c2' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-sm font-medium">C{index + 1}</span>
                  <Select
                    value={notas[competencia].toString()}
                    onValueChange={(value) => atualizarNota(competencia, parseInt(value))}
                  >
                    <SelectTrigger className="h-8 w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {opcoesNota.map(nota => (
                        <SelectItem key={nota} value={nota.toString()}>
                          {nota}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            {/* Segunda linha: C4, C5 e Nota Total */}
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* C4 */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0 bg-orange-500" />
                <span className="text-sm font-medium">C4</span>
                <Select
                  value={notas.c4.toString()}
                  onValueChange={(value) => atualizarNota('c4', parseInt(value))}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {opcoesNota.map(nota => (
                      <SelectItem key={nota} value={nota.toString()}>
                        {nota}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* C5 */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0 bg-purple-500" />
                <span className="text-sm font-medium">C5</span>
                <Select
                  value={notas.c5.toString()}
                  onValueChange={(value) => atualizarNota('c5', parseInt(value))}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {opcoesNota.map(nota => (
                      <SelectItem key={nota} value={nota.toString()}>
                        {nota}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Nota Total */}
              <div className="bg-muted/50 rounded-lg p-3 text-center shadow-sm">
                <div className="text-xs text-muted-foreground">Nota</div>
                <div className="text-2xl font-bold">{notas.total}</div>
              </div>
            </div>
          </div>
          
          {/* Audio Player */}
          <div className="mt-4">
            <AudioRecorder 
              redacaoId={redacao.id} 
              tabela={redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : 
                     redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio'}
              ehCorretor1={redacao.eh_corretor_1}
              existingAudioUrl={audioUrl}
              onAudioSaved={setAudioUrl}
            />
          </div>
          
          {/* Botões de Ação - Uma linha */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => salvarCorrecao('incompleta')}
              disabled={loading}
              className="flex items-center gap-2 h-10 px-4"
            >
              <Pause className="w-4 h-4" />
              <span className="hidden sm:inline">Incompleta</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDevolverModal(true)}
              disabled={loading}
              className="flex items-center gap-2 h-10 px-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Devolver Redação</span>
            </Button>
            <Button
              onClick={() => salvarCorrecao('corrigida')}
              disabled={loading}
              className="flex items-center gap-2 h-10 px-4 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Finalizar Correção</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Redação Manuscrita - Exibe quando há URL de imagem */}
      {redacao.redacao_manuscrita_url && (
        <Card>
          <CardHeader>
            <CardTitle>Redação Manuscrita</CardTitle>
          </CardHeader>
          <CardContent>
            <RedacaoAnotacaoVisual
              imagemUrl={redacao.redacao_manuscrita_url}
              redacaoId={redacao.id}
              corretorId={corretorId}
            />
          </CardContent>
        </Card>
      )}

      {/* Redação Digitada (não exibir quando há manuscrita) */}
      {!redacao.redacao_manuscrita_url && (
        <Card className="card">
          <CardHeader className="card__header">
            <CardTitle>Redação Digitada</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copiarRedacaoDigitada}
                className="icon-btn"
                aria-label="Copiar redação"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRedacaoExpandida(true)}
                className="icon-btn"
                aria-label="Expandir redação"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[200px] overflow-y-auto p-4 border rounded-lg bg-background prose whitespace-pre-line leading-relaxed">
              {redacao.texto || 'Texto da redação não disponível'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório Pedagógico de Correção */}
      <Card className="card">
        <CardHeader className="card__header">
          <CardTitle>Relatório Pedagógico de Correção</CardTitle>
          <Button
            variant="outline"
            onClick={copiarRelatorioPedagogico}
            className="icon-btn"
            aria-label="Copiar relatório"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <textarea
            placeholder="Escreva aqui o relatório pedagógico de correção…"
            value={comentarios.elogios}
            onChange={(e) => atualizarComentario('elogios', e.target.value)}
            className="textarea min-h-[240px] resize-none"
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <RelatorioPedagogicoModal
        isOpen={showRelatorioModal}
        onClose={() => setShowRelatorioModal(false)}
        value={comentarios.elogios}
        onChange={(value) => atualizarComentario('elogios', value)}
        alunoNome={redacao.nome_aluno}
        fraseTematica={redacao.frase_tematica}
      />

      <TemaModal
        isOpen={showTemaModal}
        onClose={() => setShowTemaModal(false)}
        tema={temaCompleto}
      />

      {/* Modal de Devolução */}
      <Dialog open={showDevolverModal} onOpenChange={setShowDevolverModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Deseja devolver essa redação?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Essa redação será devolvida ao aluno para que ele possa enviá-la novamente.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Motivo
              </label>
              <Textarea
                placeholder="Explique o motivo da devolução"
                value={motivoDevolucao}
                onChange={(e) => setMotivoDevolucao(e.target.value)}
                className="min-h-[100px] resize-none"
                required
              />
            </div>
            
            <div className="flex flex-wrap justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDevolverModal(false);
                  setMotivoDevolucao("");
                }}
                disabled={loading}
                className="min-w-[100px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={devolverRedacao}
                disabled={loading || !motivoDevolucao.trim()}
                className="bg-[#E53935] hover:bg-[#D32F2F] text-white min-w-[120px]"
              >
                {loading ? "Devolvendo..." : "DEVOLVER"}
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
              <span>Redação Digitada - {redacao.nome_aluno}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRedacaoExpandida(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <strong>Tema:</strong> {redacao.frase_tematica}
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4 border rounded-lg bg-background prose whitespace-pre-line leading-relaxed">
              {redacao.texto || 'Texto da redação não disponível'}
            </div>
            
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={copiarRedacaoDigitada}
                className="flex items-center gap-2 min-w-[120px]"
              >
                <Copy className="w-4 h-4" />
                Copiar Redação
              </Button>
              <Button
                onClick={() => setShowRedacaoExpandida(false)}
                className="min-w-[80px]"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
