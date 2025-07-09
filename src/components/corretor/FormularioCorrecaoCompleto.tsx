import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";

import { ArrowLeft, Save, CheckCircle, Download, Upload, Edit, FileText } from "lucide-react";

interface FormularioCorrecaoCompletoProps {
  redacao: RedacaoCorretor;
  corretorEmail: string;
  onVoltar: () => void;
  onSucesso: () => void;
  onRefreshList?: () => void;
}

export const FormularioCorrecaoCompleto = ({ 
  redacao, 
  corretorEmail, 
  onVoltar, 
  onSucesso,
  onRefreshList 
}: FormularioCorrecaoCompletoProps) => {
  const [notas, setNotas] = useState({
    c1: 200,
    c2: 200,
    c3: 200,
    c4: 200,
    c5: 200,
  });
  
  const [relatorioPedagogico, setRelatorioPedagogico] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCorrecao, setLoadingCorrecao] = useState(true);
  const [manuscritaUrl, setManuscritaUrl] = useState<string | null>(null);
  const [correcaoArquivo, setCorrecaoArquivo] = useState<File | null>(null);
  const [correcaoUrl, setCorrecaoUrl] = useState<string | null>(null);
  const [uploadingCorrecao, setUploadingCorrecao] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Inicializar manuscrita URL da redação original
    setManuscritaUrl(redacao.redacao_manuscrita_url || null);
    carregarCorrecaoExistente();
  }, [redacao.id, corretorEmail, redacao.redacao_manuscrita_url]);

  const carregarCorrecaoExistente = async () => {
    try {
      const tabela = `redacoes_${redacao.tipo_redacao === 'regular' ? 'enviadas' : redacao.tipo_redacao}`;
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';

      let query;
      
      if (tabela === 'redacoes_enviadas') {
        query = supabase.from('redacoes_enviadas').select('*').eq('id', redacao.id).maybeSingle();
      } else if (tabela === 'redacoes_simulado') {
        query = supabase.from('redacoes_simulado').select('*').eq('id', redacao.id).maybeSingle();
      } else {
        query = supabase.from('redacoes_exercicio').select('*').eq('id', redacao.id).maybeSingle();
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setNotas({
          c1: data[`c1_${prefixo}`] || 200,
          c2: data[`c2_${prefixo}`] || 200,
          c3: data[`c3_${prefixo}`] || 200,
          c4: data[`c4_${prefixo}`] || 200,
          c5: data[`c5_${prefixo}`] || 200,
        });
        
        setRelatorioPedagogico(data[`elogios_pontos_atencao_${prefixo}`] || "");
        setManuscritaUrl(data.redacao_manuscrita_url || null);
        setCorrecaoUrl(data[`correcao_arquivo_url_${prefixo}`] || null);
        
        // Verificar se há correção salva para habilitar modo de edição
        if (data[`status_${prefixo}`] === 'incompleta' || data[`status_${prefixo}`] === 'corrigida') {
          setModoEdicao(true);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar correção:", error);
    } finally {
      setLoadingCorrecao(false);
    }
  };

  const handleDownloadManuscrita = () => {
    if (manuscritaUrl) {
      window.open(manuscritaUrl, '_blank');
    }
  };

  const handleUploadCorrecao = async () => {
    if (!correcaoArquivo) return;

    setUploadingCorrecao(true);
    try {
      const fileExt = correcaoArquivo.name.split('.').pop();
      const fileName = `correcao_${redacao.id}_${Date.now()}.${fileExt}`;
      const filePath = `redacoes-correcoes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('redacoes-manuscritas')
        .upload(filePath, correcaoArquivo);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('redacoes-manuscritas')
        .getPublicUrl(filePath);

      setCorrecaoUrl(urlData.publicUrl);

      // Salvar URL na base de dados
      const tabela = redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : 
                    redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio';
      const prefixo = redacao.eh_corretor_1 ? 'corretor_1' : 'corretor_2';
      
      const updateData = {
        [`correcao_arquivo_url_${prefixo}`]: urlData.publicUrl
      };

      if (tabela === 'redacoes_enviadas') {
        await supabase.from('redacoes_enviadas').update(updateData).eq('id', redacao.id);
      } else if (tabela === 'redacoes_simulado') {
        await supabase.from('redacoes_simulado').update(updateData).eq('id', redacao.id);
      } else {
        await supabase.from('redacoes_exercicio').update(updateData).eq('id', redacao.id);
      }

      toast({
        title: "Correção enviada!",
        description: "Arquivo de correção foi enviado com sucesso.",
      });

      setCorrecaoArquivo(null);
    } catch (error: any) {
      console.error("Erro ao enviar correção:", error);
      toast({
        title: "Erro ao enviar correção",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setUploadingCorrecao(false);
    }
  };

  const calcularNotaTotal = () => {
    return notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5;
  };

  const salvarCorrecao = async (status: 'incompleta' | 'corrigida') => {
    setLoading(true);
    
    try {
      const tabela = redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : 
                    redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio';
      const notaTotal = calcularNotaTotal();

      console.log('Salvando correção via função RPC:', { 
        redacaoId: redacao.id,
        tabela,
        corretorEmail,
        ehCorretor1: redacao.eh_corretor_1,
        ehCorretor2: redacao.eh_corretor_2,
        statusAntes: status,
        notas,
        notaTotal
      });

      // Usar a função RPC para salvar correção de forma segura
      const { data, error } = await supabase.rpc('salvar_correcao_corretor', {
        redacao_id: redacao.id,
        tabela_nome: tabela,
        eh_corretor_1: redacao.eh_corretor_1,
        c1_nota: notas.c1,
        c2_nota: notas.c2,
        c3_nota: notas.c3,
        c4_nota: notas.c4,
        c5_nota: notas.c5,
        nota_final: notaTotal,
        status_correcao: status,
        comentario_c1: "",
        comentario_c2: "",
        comentario_c3: "",
        comentario_c4: "",
        comentario_c5: "",
        elogios_pontos: relatorioPedagogico.trim()
      });
      
      console.log('Resultado da função RPC:', { data, error, redacaoId: redacao.id });

      if (error) {
        console.error('Erro na função RPC:', error);
        throw error;
      }

      toast({
        title: status === 'corrigida' ? "Correção finalizada!" : "Correção salva!",
        description: status === 'corrigida' 
          ? `Redação de ${redacao.nome_aluno} foi corrigida com nota ${notaTotal}/1000.`
          : "Você pode continuar a correção mais tarde.",
      });

      // Aguardar um pouco para garantir que o trigger executou
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onRefreshList) {
        await onRefreshList();
      }

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold">Correção de Redação</h1>
        </div>
        
        {modoEdicao && (
          <Button variant="outline" onClick={() => setModoEdicao(!modoEdicao)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar Correção
          </Button>
        )}
      </div>

      {/* Informações compactas com Botões de Ação integrados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div><strong>Aluno:</strong> {redacao.nome_aluno}</div>
          <div><strong>Tipo:</strong> {redacao.tipo_redacao}</div>
          <div><strong>Data:</strong> {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}</div>
          <div><strong>Status:</strong> {redacao.status_minha_correcao}</div>
        </div>
        
        {/* Botões de Ação integrados */}
        <div className="flex gap-2 justify-end items-center">
          {manuscritaUrl && (
            <Button variant="outline" size="sm" onClick={handleDownloadManuscrita}>
              <Download className="w-4 h-4 mr-1" />
              Baixar
            </Button>
          )}
          <Dialog open={modalUploadAberto} onOpenChange={setModalUploadAberto}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                Subir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload de Correção Externa</DialogTitle>
                <DialogDescription>
                  Envie um arquivo com sua correção externa (PDF, DOC, imagens, etc.)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="correcao-upload">Selecionar arquivo de correção</Label>
                  <Input
                    id="correcao-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => setCorrecaoArquivo(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos aceitos: PDF, DOC, DOCX, JPG, JPEG, PNG
                  </p>
                </div>
                {correcaoUrl && (
                  <div className="text-xs text-green-600">
                    ✓ Correção enviada com sucesso!
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setModalUploadAberto(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={async () => {
                      await handleUploadCorrecao();
                      setModalUploadAberto(false);
                    }} 
                    disabled={!correcaoArquivo || uploadingCorrecao}
                  >
                    {uploadingCorrecao ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => salvarCorrecao('incompleta')} disabled={loading}>
            <Save className="w-4 h-4 mr-1" />
            Incompleta
          </Button>
          <Button size="sm" onClick={() => salvarCorrecao('corrigida')} disabled={loading}>
            <CheckCircle className="w-4 h-4 mr-1" />
            Completa
          </Button>
        </div>
      </div>

      {/* Tema */}
      <div className="p-3 bg-primary/5 rounded-lg">
        <strong>Tema:</strong> {redacao.frase_tematica}
      </div>

      {/* Layout principal: Redação + Vista Pedagógica */}
      <div className="flex gap-4 items-start">
        {/* Redação - 80-85% da tela */}
        <div className="flex-1 max-w-[85%]">
          {manuscritaUrl ? (
            <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-200">
              {manuscritaUrl.toLowerCase().includes('.pdf') || manuscritaUrl.includes('application/pdf') ? (
                <div className="w-full">
                  <object 
                    data={manuscritaUrl}
                    type="application/pdf"
                    width="100%"
                    height="85vh"
                    className="w-full"
                  >
                    <div className="flex flex-col items-center justify-center h-96 p-8 bg-gray-50">
                      <div className="text-6xl mb-4">📄</div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        PDF da Redação
                      </h3>
                      <a 
                        href={manuscritaUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        📥 Abrir PDF em nova aba
                      </a>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        Clique para visualizar o PDF em uma nova aba
                      </p>
                    </div>
                  </object>
                </div>
              ) : (
                <img 
                  src={manuscritaUrl} 
                  alt="Redação manuscrita" 
                  className="w-full h-auto object-contain cursor-zoom-in"
                  style={{ maxHeight: '85vh', minHeight: '400px' }}
                  onClick={() => window.open(manuscritaUrl, '_blank')}
                  onError={(e) => {
                    console.error('Erro ao carregar redação manuscrita:', e);
                    e.currentTarget.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.innerHTML = `
                      <div class="flex flex-col items-center justify-center h-96 p-8 bg-gray-50">
                        <div class="text-6xl mb-4">❌</div>
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">Erro ao carregar redação</h3>
                        <p class="text-sm text-gray-600 text-center">Não foi possível exibir a redação manuscrita</p>
                      </div>
                    `;
                    e.currentTarget.parentNode?.appendChild(errorDiv);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 border">
              <div className="prose prose-base max-w-none">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-800">
                  {redacao.texto}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Vista Pedagógica - 15-20% da tela */}
        <div className="w-64 min-w-64">
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vista Pedagógica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['c1', 'c2', 'c3', 'c4', 'c5'].map((competencia, index) => {
                const cores = ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f97316'];
                const corCompetencia = cores[index];
                
                return (
                  <div key={competencia} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: corCompetencia }}
                        />
                        <Label className="text-sm font-medium">C{index + 1}</Label>
                      </div>
                      <Select
                        value={notas[competencia as keyof typeof notas].toString()}
                        onValueChange={(value) => 
                          setNotas(prev => ({
                            ...prev,
                            [competencia]: parseInt(value)
                          }))
                        }
                      >
                        <SelectTrigger className="w-16 h-7 text-xs">
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
                      <span className="text-xs text-gray-500">/200</span>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-3 border-t space-y-3">
                <div className="text-center">
                  <Label className="text-sm font-medium">Nota Total</Label>
                  <div className="text-lg font-bold text-primary">{calcularNotaTotal()}/1000</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Relatório pedagógico de correção */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Relatório pedagógico de correção</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={relatorioPedagogico}
            onChange={(e) => setRelatorioPedagogico(e.target.value)}
            placeholder="Digite aqui seu relatório pedagógico completo para o aluno..."
            rows={6}
            className="w-full resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
};
