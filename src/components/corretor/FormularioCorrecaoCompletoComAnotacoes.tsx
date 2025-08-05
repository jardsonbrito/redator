import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { RedacaoAnotacaoVisual } from "./RedacaoAnotacaoVisual";
import { RelatorioPedagogicoModal } from "./RelatorioPedagogicoModal";
import { TemaModal } from "./TemaModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const total = notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5;
    setNotas(prev => ({ ...prev, total }));
  }, [notas.c1, notas.c2, notas.c3, notas.c4, notas.c5]);

  useEffect(() => {
    carregarCorrecaoExistente();
  }, [redacao.id]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onVoltar} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          
        </div>
        <Button
          variant="outline"
          onClick={() => setShowTemaModal(true)}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Ver Tema
        </Button>
      </div>

      {/* Informações do aluno em formato horizontal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div><strong>Aluno:</strong> {redacao.nome_aluno}</div>
        <div><strong>Tipo:</strong> {redacao.tipo_redacao}</div>
        <div><strong>Data:</strong> {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}</div>
        <div><strong>Status:</strong> {redacao.status_minha_correcao}</div>
      </div>

      {/* Tema */}
      <div className="flex items-center gap-4">
        <span><strong>Tema:</strong> {redacao.frase_tematica}</span>
        <Button
          variant="outline"
          onClick={() => setShowTemaModal(true)}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Ver Tema
        </Button>
      </div>

      {/* Vista Pedagógica em formato horizontal */}
      <Card>
        <CardHeader>
          <CardTitle>Vista Pedagógica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              {(['c1', 'c2', 'c3', 'c4', 'c5'] as const).map((competencia, index) => (
                <div key={competencia} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${
                    competencia === 'c1' ? 'bg-red-500' :
                    competencia === 'c2' ? 'bg-green-500' :
                    competencia === 'c3' ? 'bg-blue-500' :
                    competencia === 'c4' ? 'bg-purple-500' : 'bg-orange-500'
                  }`} />
                  <span className="text-sm font-medium">C{index + 1}</span>
                  <Select
                    value={notas[competencia].toString()}
                    onValueChange={(value) => atualizarNota(competencia, parseInt(value))}
                  >
                    <SelectTrigger className="w-20 h-8">
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
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center p-3 bg-purple-100 rounded">
                <div className="text-sm text-muted-foreground">Nota Total</div>
                <div className="text-2xl font-bold text-purple-700">{notas.total}</div>
              </div>
              
              <div className="flex gap-2">
                <AudioRecorder 
                  redacaoId={redacao.id} 
                  tabela={redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : 
                         redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio'}
                  ehCorretor1={redacao.eh_corretor_1}
                  existingAudioUrl={audioUrl}
                  onAudioSaved={setAudioUrl}
                />
                <Button
                  variant="outline"
                  onClick={() => salvarCorrecao('incompleta')}
                  disabled={loading}
                >
                  Salvar Incompleta
                </Button>
                <Button
                  onClick={() => salvarCorrecao('corrigida')}
                  disabled={loading}
                >
                  Finalizar Correção
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redação Digitada */}
      <Card>
        <CardHeader>
          <CardTitle>Redação Digitada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{redacao.texto || 'Texto da redação não disponível'}</p>
        </CardContent>
      </Card>

      {/* Relatório pedagógico de correção */}
      <Card>
        <CardHeader>
          <CardTitle>Relatório pedagógico de correção</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            placeholder="Digite aqui seu relatório pedagógico completo para o aluno..."
            value={comentarios.elogios}
            onChange={(e) => atualizarComentario('elogios', e.target.value)}
            className="w-full min-h-[100px] p-3 border rounded resize-none"
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
        tema={{
          id: 'temp-id',
          frase_tematica: redacao.frase_tematica
        }}
      />
    </div>
  );
};
