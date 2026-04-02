import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { ArrowLeft, Save, CheckCircle, Download, Info } from "lucide-react";
import jsPDF from 'jspdf';

interface FormularioCorrecaoProps {
  redacao: RedacaoCorretor;
  corretorEmail: string;
  onVoltar: () => void;
  onSucesso: () => void;
}

export const FormularioCorrecao = ({ redacao, corretorEmail, onVoltar, onSucesso }: FormularioCorrecaoProps) => {
  const [notas, setNotas] = useState({
    c1: 0,
    c2: 0,
    c3: 0,
    c4: 0,
    c5: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingCorrecao, setLoadingCorrecao] = useState(true);
  const [manuscritaUrl, setManuscritaUrl] = useState<string | null>(null);
  const [parUtilizado, setParUtilizado] = useState<string | null>(null);
  const [redacaoFinalizada, setRedacaoFinalizada] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarCorrecaoExistente();
  }, [redacao.id, corretorEmail]);

  const carregarCorrecaoExistente = async () => {
    try {
      const tabela = `redacoes_${redacao.tipo_redacao === 'regular' ? 'enviadas' : redacao.tipo_redacao}`;
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';

      let query;
      
      if (tabela === 'redacoes_enviadas') {
        query = supabase.from('redacoes_enviadas').select('*').eq('id', redacao.id).single();
      } else if (tabela === 'redacoes_simulado') {
        query = supabase.from('redacoes_simulado').select('*').eq('id', redacao.id).single();
      } else {
        query = supabase.from('redacoes_exercicio').select('*').eq('id', redacao.id).single();
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setNotas({
          c1: data[`c1_${prefixo}`] || 0,
          c2: data[`c2_${prefixo}`] || 0,
          c3: data[`c3_${prefixo}`] || 0,
          c4: data[`c4_${prefixo}`] || 0,
          c5: data[`c5_${prefixo}`] || 0,
        });
        setManuscritaUrl(data.redacao_manuscrita_url || null);
        if (tabela === 'redacoes_simulado') {
          setParUtilizado(data.par_utilizado || null);
          setRedacaoFinalizada(data.corrigida || false);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar correção:", error);
    } finally {
      setLoadingCorrecao(false);
    }
  };

  const handleDownloadManuscrita = async () => {
    if (!manuscritaUrl) return;

    try {
      // Verificar se é uma imagem (JPEG/PNG)
      const isImage = manuscritaUrl.toLowerCase().match(/\.(jpeg|jpg|png)$/);
      
      if (isImage) {
        // Gerar PDF da imagem com template personalizado
        let pdf = new jsPDF();
        
        // Cores da paleta do projeto
        const primaryColor = [102, 51, 153]; // hsl(258, 84%, 29%) convertido para RGB
        
        // Carregar e processar a imagem da redação
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // Calcular se deve usar orientação paisagem
          const imgAspectRatio = img.width / img.height;
          const useLandscape = imgAspectRatio > 1.2;
          
          if (useLandscape) {
            // Recriar PDF em paisagem
            pdf = new jsPDF('landscape', 'mm', 'a4');
            
            // Refazer o layout para paisagem
            const pageWidth = 297;
            const pageHeight = 210;
            
            // Fundo branco limpo
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Título "Laboratório do Redator" centralizado
            pdf.setTextColor(102, 51, 153);
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Laboratório do Redator', pageWidth / 2, 25, { align: 'center' });
            
            // Título "Informações da Redação"
            pdf.setTextColor(102, 51, 153);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Informações da Redação', 15, 45);
            
            // Informações do aluno diretamente na página
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Aluno: ${redacao.nome_aluno}`, 15, 57);
            pdf.text(`Data: ${new Date(redacao.data_envio).toLocaleDateString('pt-BR')}`, 15, 65);
            pdf.text(`Tema: ${redacao.frase_tematica}`, 15, 73);
            
            // Área para imagem em paisagem
            const margin = 15;
            const availableWidth = pageWidth - (margin * 2);
            const availableHeight = pageHeight - 85; // 85 = espaço do cabeçalho
            
            let width, height;
            if (imgAspectRatio > availableWidth / availableHeight) {
              width = availableWidth;
              height = width / imgAspectRatio;
            } else {
              height = availableHeight;
              width = height * imgAspectRatio;
            }
            
            const x = (pageWidth - width) / 2;
            const y = 85;
            
            pdf.addImage(img, 'JPEG', x, y, width, height);
            
            // Rodapé colorido (sem texto)
            pdf.setFillColor(102, 51, 153);
            pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');
            
          } else {
            // Layout retrato
            // Fundo branco limpo
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, 210, 297, 'F');
            
            // Título "Laboratório do Redator" centralizado
            pdf.setTextColor(102, 51, 153);
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Laboratório do Redator', 105, 25, { align: 'center' });
            
            // Título "Informações da Redação"
            pdf.setTextColor(102, 51, 153);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Informações da Redação', 15, 45);
            
            // Informações do aluno diretamente na página
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Aluno: ${redacao.nome_aluno}`, 15, 57);
            pdf.text(`Data: ${new Date(redacao.data_envio).toLocaleDateString('pt-BR')}`, 15, 65);
            pdf.text(`Tema: ${redacao.frase_tematica}`, 15, 73);
            
            // Área para imagem
            const margin = 15;
            const availableWidth = 210 - (margin * 2);
            const availableHeight = 297 - 85 - 25; // 85 = cabeçalho + info, 25 = rodapé
            
            let width, height;
            if (imgAspectRatio > availableWidth / availableHeight) {
              width = availableWidth;
              height = width / imgAspectRatio;
            } else {
              height = availableHeight;
              width = height * imgAspectRatio;
            }
            
            // Centralizar a imagem
            const x = (210 - width) / 2;
            const y = 85;
            
            pdf.addImage(img, 'JPEG', x, y, width, height);
            
            // Rodapé colorido (sem texto)
            pdf.setFillColor(102, 51, 153);
            pdf.rect(0, 272, 210, 25, 'F');
          }
          
          // Download do PDF
          const fileName = `redacao_${redacao.nome_aluno.replace(/\s+/g, '_')}_${redacao.id.substring(0, 8)}.pdf`;
          pdf.save(fileName);
          
          toast({
            title: "PDF gerado com sucesso!",
            description: "A redação foi convertida para PDF e baixada.",
          });
        };
        
        img.onerror = () => {
          console.error('Erro ao carregar imagem da redação');
          toast({
            title: "Erro ao gerar PDF",
            description: "Não foi possível carregar a imagem. Baixando arquivo original.",
            variant: "destructive"
          });
          window.open(manuscritaUrl, '_blank');
        };
        
        img.src = manuscritaUrl;
        
      } else {
        // Se não for imagem, baixar arquivo original
        window.open(manuscritaUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro. Baixando arquivo original.",
        variant: "destructive"
      });
      window.open(manuscritaUrl, '_blank');
    }
  };

  const calcularNotaTotal = () => {
    return notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5;
  };

  const salvarCorrecao = async (status: 'incompleta' | 'corrigida') => {
    setLoading(true);

    try {
      const tabela = `redacoes_${redacao.tipo_redacao === 'regular' ? 'enviadas' : redacao.tipo_redacao}`;
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';
      const notaTotal = calcularNotaTotal();
      let motivoNaoFinalizado: 'aguardando_outro' | 'divergencia' | null = null;

      const updateData: any = {
        [`c1_${prefixo}`]: notas.c1,
        [`c2_${prefixo}`]: notas.c2,
        [`c3_${prefixo}`]: notas.c3,
        [`c4_${prefixo}`]: notas.c4,
        [`c5_${prefixo}`]: notas.c5,
        [`nota_final_${prefixo}`]: notaTotal,
        [`status_${prefixo}`]: status,
      };

      if (status === 'corrigida') {
        if (tabela === 'redacoes_simulado') {
          // Para simulado: verifica se o outro corretor já tem notas.
          // Se sim, checa divergência com as notas que estão sendo salvas agora.
          // Se não houver divergência, finaliza direto (corrigida=true).
          const { data: redacaoAtual } = await supabase
            .from('redacoes_simulado')
            .select('*')
            .eq('id', redacao.id)
            .single();

          if (redacaoAtual) {
            const outroCorretor = redacao.eh_corretor_1 ? 'corretor_2' : 'corretor_1';
            // Exige que o outro corretor também tenha finalizado (clicado "Finalizar"),
            // não apenas salvo como rascunho (incompleta).
            const outroFinalizou = redacaoAtual[`status_${outroCorretor}`] === 'corrigida';

            if (outroFinalizou) {
              // Monta o estado atualizado com as novas notas para checar divergência
              const { verificarDivergencia } = await import('@/utils/simuladoDivergencia');
              const redacaoComNovasNotas = {
                ...redacaoAtual,
                [`c1_${prefixo}`]: notas.c1,
                [`c2_${prefixo}`]: notas.c2,
                [`c3_${prefixo}`]: notas.c3,
                [`c4_${prefixo}`]: notas.c4,
                [`c5_${prefixo}`]: notas.c5,
                [`nota_final_${prefixo}`]: notaTotal,
              };

              const div = verificarDivergencia(redacaoComNovasNotas);

              if (div && !div.temDivergencia) {
                // Ambos finalizaram e sem divergência → libera nota ao aluno (Opção A)
                updateData.corrigida = true;
                updateData.data_correcao = new Date().toISOString();
              } else if (div && div.temDivergencia) {
                // Discrepância detectada → encaminha para terceira correção pelo admin
                updateData.status_terceira_correcao = 'pendente';
                motivoNaoFinalizado = 'divergencia';
              }
            } else {
              // O outro corretor ainda não finalizou → aguardando
              motivoNaoFinalizado = 'aguardando_outro';
            }
            // Se o outro ainda não finalizou, apenas salva esta correção como 'corrigida'
            // (marcando que este corretor terminou sua parte). O aluno não vê a nota ainda.
          }
        } else {
          // Redações regulares e exercícios: comportamento original
          let redacaoAtualQuery;

          if (tabela === 'redacoes_enviadas') {
            redacaoAtualQuery = supabase.from('redacoes_enviadas').select('*').eq('id', redacao.id).single();
          } else {
            redacaoAtualQuery = supabase.from('redacoes_exercicio').select('*').eq('id', redacao.id).single();
          }

          const { data: redacaoAtual } = await redacaoAtualQuery;

          if (redacaoAtual) {
            const outroCorretor = redacao.eh_corretor_1 ? 'corretor_2' : 'corretor_1';
            const outroCorretorFinalizou = redacaoAtual[`status_${outroCorretor}`] === 'corrigida';

            if (!redacaoAtual[`corretor_id_${outroCorretor === 'corretor_1' ? '1' : '2'}`] || outroCorretorFinalizou) {
              updateData.corrigida = true;
              updateData.data_correcao = new Date().toISOString();
            }
          }
        }
      }

      let updateQuery;
      
      if (tabela === 'redacoes_enviadas') {
        updateQuery = supabase.from('redacoes_enviadas').update(updateData).eq('id', redacao.id);
      } else if (tabela === 'redacoes_simulado') {
        updateQuery = supabase.from('redacoes_simulado').update(updateData).eq('id', redacao.id);
      } else {
        updateQuery = supabase.from('redacoes_exercicio').update(updateData).eq('id', redacao.id);
      }

      const { error } = await updateQuery;

      if (error) throw error;

      const foiConcluida = updateData.corrigida === true;

      const toastConfig = (() => {
        if (foiConcluida) {
          return {
            title: "Correção finalizada!",
            description: `Redação de ${redacao.nome_aluno} finalizada com nota ${notaTotal}/1000. Nota liberada ao aluno.`,
            variant: 'default' as const,
          };
        }
        if (motivoNaoFinalizado === 'divergencia') {
          return {
            title: "Notas salvas — discrepância detectada",
            description: "Há discrepância entre as avaliações dos dois corretores. A redação será encaminhada para terceira correção pelo coordenador. O aluno não verá a nota até a conclusão desse processo.",
            variant: 'destructive' as const,
          };
        }
        if (motivoNaoFinalizado === 'aguardando_outro') {
          return {
            title: "Sua parte está concluída!",
            description: "Correção salva. A nota só será liberada ao aluno quando o outro corretor também finalizar. Se não houver discrepância, a liberação será automática.",
            variant: 'default' as const,
          };
        }
        return {
          title: "Correção salva!",
          description: "Você pode continuar a correção mais tarde.",
          variant: 'default' as const,
        };
      })();

      toast(toastConfig);

      onSucesso();
    } catch (error: any) {
      console.error("Erro ao salvar correção:", error);
      toast({
        title: "Erro ao salvar correção",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const opcoesNota = [0, 40, 80, 120, 160, 200];

  if (loadingCorrecao) {
    return <div>Carregando correção...</div>;
  }

  // Aviso: nota deste corretor não compôs o par final
  const notaNaoUtilizada =
    redacaoFinalizada &&
    parUtilizado != null &&
    ((redacao.eh_corretor_1 && parUtilizado === '2_admin') ||
     (!redacao.eh_corretor_1 && parUtilizado === '1_admin'));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Vista Pedagógica - Correção</h1>
      </div>

      {notaNaoUtilizada && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Houve discrepância nesta redação</p>
            <p className="text-sm text-amber-700 mt-1">
              Após a terceira correção realizada pela coordenação, <strong>sua avaliação não compôs a nota final</strong>. A nota oficial do aluno foi calculada com base no par de avaliadores mais próximos.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações da Redação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Aluno:</strong> {redacao.nome_aluno}</div>
          <div><strong>Tipo:</strong> {redacao.tipo_redacao}</div>
          <div className="col-span-2"><strong>Tema:</strong> {redacao.frase_tematica}</div>
          <div><strong>Data:</strong> {new Date(redacao.data_envio).toLocaleString('pt-BR')}</div>
          <div><strong>Status:</strong> {redacao.status_minha_correcao}</div>
        </CardContent>
      </Card>

      {manuscritaUrl ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Redação Manuscrita
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadManuscrita}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar Redação Manuscrita
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
              {manuscritaUrl?.toLowerCase().includes('.pdf') || manuscritaUrl?.includes('application/pdf') ? (
                <div className="w-full">
                  <object 
                    data={manuscritaUrl}
                    type="application/pdf"
                    width="100%"
                    height="300"
                    className="w-full rounded-md"
                  >
                    <div className="flex flex-col items-center justify-center h-60 p-4 bg-white rounded-md">
                      <div className="text-4xl mb-2">📄</div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">PDF da Redação</h4>
                      <a 
                        href={manuscritaUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                      >
                        Abrir PDF
                      </a>
                    </div>
                  </object>
                </div>
              ) : (
                <img 
                  src={manuscritaUrl} 
                  alt="Redação manuscrita" 
                  className="w-full h-auto rounded-md cursor-zoom-in"
                  onClick={() => window.open(manuscritaUrl, '_blank')}
                />
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Texto da Redação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-md max-h-96 overflow-y-auto prose whitespace-pre-line">
              {redacao.texto}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vista Pedagógica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {/* Todas as competências, botão gravar áudio e nota em uma única linha */}
          <div className="flex items-center gap-2 justify-between">
            {/* Competências C1-C5 compactas */}
            <div className="flex items-center gap-1">
              {(['c1', 'c2', 'c3', 'c4', 'c5'] as const).map((competencia, index) => (
                <div key={competencia} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    competencia === 'c1' ? 'bg-red-500' :
                    competencia === 'c2' ? 'bg-green-500' :
                    competencia === 'c3' ? 'bg-blue-500' :
                    competencia === 'c4' ? 'bg-orange-500' : 'bg-purple-500'
                  }`} />
                  <span className="text-xs font-medium">C{index + 1}</span>
                  <Select
                    value={notas[competencia].toString()}
                    onValueChange={(value) => 
                      setNotas(prev => ({
                        ...prev,
                        [competencia]: parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
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
            
            {/* Botão gravar áudio e nota */}
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex items-center gap-2 text-xs" disabled>
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                Gravar áudio
              </Button>
              
              <div className="bg-muted rounded-lg p-2 text-center min-w-[60px]">
                <div className="text-lg font-bold">{calcularNotaTotal()}</div>
                <div className="text-xs text-muted-foreground">Nota</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-4 justify-between">
        <Button
          variant="outline"
          onClick={() => salvarCorrecao('incompleta')}
          disabled={loading}
          className="flex-1"
        >
          Incompleta
        </Button>
        
        <Button
          variant="outline"
          disabled
          className="flex-1"
        >
          Devolver redação
        </Button>
        
        <Button
          onClick={() => salvarCorrecao('corrigida')}
          disabled={loading}
          className="flex-1 bg-purple-600 hover:bg-purple-700"
        >
          Finalizar correção
        </Button>
      </div>
    </div>
  );
};
