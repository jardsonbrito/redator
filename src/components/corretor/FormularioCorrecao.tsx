import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { ArrowLeft, Save, CheckCircle, Download } from "lucide-react";
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
        const secondaryColor = [200, 180, 245]; // hsl(258, 60%, 78%) convertido para RGB
        const accentColor = [153, 102, 204]; // hsl(258, 70%, 55%) convertido para RGB
        
        // Configurar fundo elegante
        pdf.setFillColor(248, 250, 252); // Fundo claro
        pdf.rect(0, 0, 210, 297, 'F');
        
        // Adicionar faixa superior com gradiente simulado
        pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.rect(0, 0, 210, 25, 'F');
        
        // Carregar e adicionar logomarca
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        
        logoImg.onload = () => {
          // Fundo branco/cinza claro
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, 0, 210, 297, 'F');
          
          // Logo redondo no topo esquerdo
          pdf.addImage(logoImg, 'PNG', 20, 15, 25, 25);
          
          // Título ao lado do logo
          pdf.setTextColor(102, 51, 153);
          pdf.setFontSize(20);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Laboratório do Redator', 55, 32);
          
          // Caixa de informações da redação (mesma cor do mockup)
          pdf.setFillColor(200, 180, 245);
          pdf.rect(20, 55, 170, 40, 'F');
          
          // Borda da caixa
          pdf.setDrawColor(102, 51, 153);
          pdf.setLineWidth(1.5);
          pdf.rect(20, 55, 170, 40, 'S');
          
          // Título da seção
          pdf.setTextColor(102, 51, 153);
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Informações da Redação', 25, 68);
          
          // Informações do aluno
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Aluno: ${redacao.nome_aluno}`, 25, 78);
          pdf.text(`Data: ${new Date(redacao.data_envio).toLocaleDateString('pt-BR')}`, 25, 85);
          pdf.text(`Tema: ${redacao.frase_tematica}`, 25, 92);
          
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
              
              // Fundo
              pdf.setFillColor(248, 250, 252);
              pdf.rect(0, 0, pageWidth, pageHeight, 'F');
              
              // Faixa superior
              pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              pdf.rect(0, 0, pageWidth, 25, 'F');
              
              // Logo e título
              pdf.addImage(logoImg, 'PNG', 10, 3, 40, 19);
              pdf.setTextColor(255, 255, 255);
              pdf.setFontSize(16);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Laboratório do Redator', 60, 15);
              
              // Informações em paisagem
              pdf.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
              pdf.rect(15, 35, 267, 25, 'F');
              pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              pdf.setLineWidth(1);
              pdf.rect(15, 35, 267, 25, 'S');
              
              pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Informações da Redação', 20, 45);
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'normal');
              pdf.text(`Aluno: ${redacao.nome_aluno}  |  Data: ${new Date(redacao.data_envio).toLocaleDateString('pt-BR')}  |  Tema: ${redacao.frase_tematica}`, 20, 54);
              
              // Área para imagem em paisagem
              const margin = 15;
              const availableWidth = pageWidth - (margin * 2);
              const availableHeight = pageHeight - 75; // 75 = espaço do cabeçalho
              
              let width, height;
              if (imgAspectRatio > availableWidth / availableHeight) {
                width = availableWidth;
                height = width / imgAspectRatio;
              } else {
                height = availableHeight;
                width = height * imgAspectRatio;
              }
              
              const x = (pageWidth - width) / 2;
              const y = 75;
              
              pdf.addImage(img, 'JPEG', x, y, width, height);
            } else {
              // Layout retrato - área da redação
              const margin = 20;
              const availableWidth = 210 - (margin * 2);
              const availableHeight = 297 - 105 - 20; // 105 = cabeçalho + info, 20 = rodapé
              
              let width, height;
              if (imgAspectRatio > availableWidth / availableHeight) {
                width = availableWidth;
                height = width / imgAspectRatio;
              } else {
                height = availableHeight;
                width = height * imgAspectRatio;
              }
              
              const x = (210 - width) / 2;
              const y = 105;
              
              pdf.addImage(img, 'JPEG', x, y, width, height);
              
              // Rodapé colorido (sem texto)
              pdf.setFillColor(102, 51, 153);
              pdf.rect(0, 277, 210, 20, 'F');
            }
            
            // Download do PDF
            const fileName = `redacao_${redacao.nome_aluno.replace(/\s+/g, '_')}_${redacao.id.substring(0, 8)}.pdf`;
            pdf.save(fileName);
            
            toast({
              title: "PDF gerado com sucesso!",
              description: "A redação foi convertida para PDF e baixada com template personalizado.",
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
        };
        
        logoImg.onerror = () => {
          console.error('Erro ao carregar logo, continuando sem ela');
          // Continuar sem logo se não carregar
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Mesmo processamento da imagem sem logo
            const imgAspectRatio = img.width / img.height;
            const useLandscape = imgAspectRatio > 1.2;
            
            if (useLandscape) {
              pdf = new jsPDF('landscape', 'mm', 'a4');
              const pageWidth = 297;
              const pageHeight = 210;
              
              pdf.setFillColor(248, 250, 252);
              pdf.rect(0, 0, pageWidth, pageHeight, 'F');
              
              pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              pdf.rect(0, 0, pageWidth, 25, 'F');
              
              pdf.setTextColor(255, 255, 255);
              pdf.setFontSize(16);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Laboratório do Redator', 20, 15);
              
              pdf.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
              pdf.rect(15, 35, 267, 25, 'F');
              pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              pdf.setLineWidth(1);
              pdf.rect(15, 35, 267, 25, 'S');
              
              pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Informações da Redação', 20, 45);
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'normal');
              pdf.text(`Aluno: ${redacao.nome_aluno}  |  Data: ${new Date(redacao.data_envio).toLocaleDateString('pt-BR')}  |  Tema: ${redacao.frase_tematica}`, 20, 54);
              
              const margin = 15;
              const availableWidth = pageWidth - (margin * 2);
              const availableHeight = pageHeight - 75;
              
              let width, height;
              if (imgAspectRatio > availableWidth / availableHeight) {
                width = availableWidth;
                height = width / imgAspectRatio;
              } else {
                height = availableHeight;
                width = height * imgAspectRatio;
              }
              
              const x = (pageWidth - width) / 2;
              const y = 75;
              
              pdf.addImage(img, 'JPEG', x, y, width, height);
            } else {
              const margin = 15;
              const availableWidth = 210 - (margin * 2);
              const availableHeight = 297 - 85;
              
              let width, height;
              if (imgAspectRatio > availableWidth / availableHeight) {
                width = availableWidth;
                height = width / imgAspectRatio;
              } else {
                height = availableHeight;
                width = height * imgAspectRatio;
              }
              
              const x = (210 - width) / 2;
              const y = 85;
              
              pdf.addImage(img, 'JPEG', x, y, width, height);
            }
            
            const fileName = `redacao_${redacao.nome_aluno.replace(/\s+/g, '_')}_${redacao.id.substring(0, 8)}.pdf`;
            pdf.save(fileName);
            
            toast({
              title: "PDF gerado com sucesso!",
              description: "A redação foi convertida para PDF e baixada com template personalizado.",
            });
          };
          img.src = manuscritaUrl;
        };
        
        // Carregar logo do projeto
        logoImg.src = '/lovable-uploads/e8f3c7a9-a9bb-43ac-ba3d-e625d15834d8.png';
        
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
        let redacaoAtualQuery;
        
        if (tabela === 'redacoes_enviadas') {
          redacaoAtualQuery = supabase.from('redacoes_enviadas').select('*').eq('id', redacao.id).single();
        } else if (tabela === 'redacoes_simulado') {
          redacaoAtualQuery = supabase.from('redacoes_simulado').select('*').eq('id', redacao.id).single();
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

      toast({
        title: status === 'corrigida' ? "Correção finalizada!" : "Correção salva!",
        description: status === 'corrigida' 
          ? `Redação de ${redacao.nome_aluno} foi corrigida com nota ${notaTotal}/1000.`
          : "Você pode continuar a correção mais tarde.",
      });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Vista Pedagógica - Correção</h1>
      </div>

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
            <div className="p-4 bg-gray-50 rounded-md max-h-96 overflow-y-auto whitespace-pre-wrap">
              {redacao.texto}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Avaliação por Competências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {['c1', 'c2', 'c3', 'c4', 'c5'].map((competencia, index) => (
            <div key={competencia} className="flex items-center gap-4">
              <Label className="w-32">Competência {index + 1}:</Label>
              <Select
                value={notas[competencia as keyof typeof notas].toString()}
                onValueChange={(value) => 
                  setNotas(prev => ({
                    ...prev,
                    [competencia]: parseInt(value)
                  }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opcoesNota.map(nota => (
                    <SelectItem key={nota} value={nota.toString()}>
                      {nota}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">/ 200</span>
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <div className="flex items-center gap-4 text-lg font-semibold">
              <Label>Nota Total:</Label>
              <span className="text-2xl text-primary">{calcularNotaTotal()}/1000</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={() => salvarCorrecao('incompleta')}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Salvando..." : "Salvar como Incompleta"}
        </Button>
        
        <Button
          onClick={() => salvarCorrecao('corrigida')}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {loading ? "Finalizando..." : "Finalizar Correção"}
        </Button>
      </div>
    </div>
  );
};
