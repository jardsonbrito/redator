import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { ArrowLeft, Save, CheckCircle, Download, Upload, Edit } from "lucide-react";

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
    c1: 0,
    c2: 0,
    c3: 0,
    c4: 0,
    c5: 0,
  });
  
  const [comentarios, setComentarios] = useState({
    c1: "",
    c2: "",
    c3: "",
    c4: "",
    c5: "",
  });
  
  const [elogiosEPontosAtencao, setElogiosEPontosAtencao] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCorrecao, setLoadingCorrecao] = useState(true);
  const [manuscritaUrl, setManuscritaUrl] = useState<string | null>(null);
  const [correcaoArquivo, setCorrecaoArquivo] = useState<File | null>(null);
  const [correcaoUrl, setCorrecaoUrl] = useState<string | null>(null);
  const [uploadingCorrecao, setUploadingCorrecao] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
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
          c1: data[`c1_${prefixo}`] || 0,
          c2: data[`c2_${prefixo}`] || 0,
          c3: data[`c3_${prefixo}`] || 0,
          c4: data[`c4_${prefixo}`] || 0,
          c5: data[`c5_${prefixo}`] || 0,
        });
        
        setComentarios({
          c1: data[`comentario_c1_${prefixo}`] || "",
          c2: data[`comentario_c2_${prefixo}`] || "",
          c3: data[`comentario_c3_${prefixo}`] || "",
          c4: data[`comentario_c4_${prefixo}`] || "",
          c5: data[`comentario_c5_${prefixo}`] || "",
        });
        
        setElogiosEPontosAtencao(data[`elogios_pontos_atencao_${prefixo}`] || "");
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
        comentario_c1: comentarios.c1.trim(),
        comentario_c2: comentarios.c2.trim(),
        comentario_c3: comentarios.c3.trim(),
        comentario_c4: comentarios.c4.trim(),
        comentario_c5: comentarios.c5.trim(),
        elogios_pontos: elogiosEPontosAtencao.trim()
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
    <div className="space-y-6">
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

      {/* Informações compactas no topo */}
      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
        <div><strong>Aluno:</strong> {redacao.nome_aluno}</div>
        <div><strong>Tipo:</strong> {redacao.tipo_redacao}</div>
        <div><strong>Data:</strong> {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}</div>
        <div><strong>Status:</strong> {redacao.status_minha_correcao}</div>
        <div className="flex gap-2">
          {manuscritaUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadManuscrita}
              className="flex items-center gap-1 text-xs"
            >
              <Download className="w-3 h-3" />
              Baixar Redação
            </Button>
          )}
        </div>
      </div>

      {/* Tema em linha separada */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <strong>Tema:</strong> {redacao.frase_tematica}
      </div>

      {/* Redação - Exibição expandida sem scroll interno */}
      {manuscritaUrl ? (
        <div className="w-full">
          <img 
            src={manuscritaUrl} 
            alt="Redação manuscrita" 
            className="w-full h-auto rounded-md shadow-lg"
          />
        </div>
      ) : (
        <div className="p-6 bg-gray-50 rounded-md whitespace-pre-wrap text-sm leading-relaxed">
          {redacao.texto}
        </div>
      )}

      {/* Upload de Correção */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Correção Externa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setCorrecaoArquivo(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Button
              onClick={handleUploadCorrecao}
              disabled={!correcaoArquivo || uploadingCorrecao}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploadingCorrecao ? "Enviando..." : "Subir Correção"}
            </Button>
          </div>
          {correcaoUrl && (
            <div className="text-sm text-green-600">
              ✓ Correção enviada com sucesso! O aluno poderá baixá-la em seu painel.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avaliação Simplificada */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliação por Competências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {['c1', 'c2', 'c3', 'c4', 'c5'].map((competencia, index) => (
            <div key={competencia} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-4 mb-3">
                <Label className="w-24 font-semibold text-base">C{index + 1}:</Label>
                <Select
                  value={notas[competencia as keyof typeof notas].toString()}
                  onValueChange={(value) => 
                    setNotas(prev => ({
                      ...prev,
                      [competencia]: parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger className="w-24">
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
              
              <div>
                <Textarea
                  value={comentarios[competencia as keyof typeof comentarios]}
                  onChange={(e) => 
                    setComentarios(prev => ({
                      ...prev,
                      [competencia]: e.target.value
                    }))
                  }
                  placeholder={`Comentário para competência ${index + 1}...`}
                  rows={2}
                />
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center gap-4 text-lg font-semibold">
              <Label>Nota Total:</Label>
              <span className="text-2xl text-primary">{calcularNotaTotal()}/1000</span>
            </div>
            
            <div>
              <Label className="text-base font-medium">Elogios e pontos de atenção</Label>
              <Textarea
                value={elogiosEPontosAtencao}
                onChange={(e) => setElogiosEPontosAtencao(e.target.value)}
                placeholder="Escreva aqui elogios gerais e pontos que merecem atenção especial..."
                className="mt-2"
                rows={4}
              />
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
          {loading ? "Finalizando..." : "Salvar Correção Completa"}
        </Button>
      </div>
    </div>
  );
};
