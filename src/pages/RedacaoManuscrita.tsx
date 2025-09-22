import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudentHeader } from "@/components/StudentHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays, ArrowLeft, Download, FileText } from "lucide-react";
import { RedacaoAnotacaoVisual } from "@/components/corretor/RedacaoAnotacaoVisual";
import { AudioPlayerAluno } from "@/components/AudioPlayerAluno";
import { ModalDevolucaoRedacao } from "@/components/ModalDevolucaoRedacao";
import { useToast } from "@/hooks/use-toast";
import { downloadRedacaoManuscritaCorrigida } from "@/utils/redacaoDownload";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useBreadcrumbs, usePageTitle } from "@/hooks/useBreadcrumbs";

interface Redacao {
  id: string;
  original_id?: string; // Para simulados que têm ID modificado
  frase_tematica: string;
  redacao_manuscrita_url: string | null;
  data_envio: string;
  data_correcao?: string | null;
  corrigida: boolean;
  tipo_envio: string;
  status: string;
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
  nota_total?: number | null;
  justificativa_devolucao?: string | null;
  email_aluno?: string | null;
  // Relatórios/áudios
  corretor_numero?: number;
  corretor_id_real?: string; // ID real do corretor para buscar anotações
  audio_url?: string | null;
  audio_url_corretor_1?: string | null;
  audio_url_corretor_2?: string | null;
  // Relatório pedagógico (texto)
  elogios_pontos_atencao_corretor_1?: string | null;
  elogios_pontos_atencao_corretor_2?: string | null;
  comentario_admin?: string | null;
}

export default function RedacaoManuscrita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { toast } = useToast();
  const [showModalDevolucao, setShowModalDevolucao] = useState(false);
  const { studentData } = useStudentAuth();
  
  // Configurar breadcrumbs e título
  useBreadcrumbs([
    { label: 'Início', href: '/app' },
    { label: 'Minhas Redações', href: '/minhas-redacoes' },
    { label: 'Detalhes da Redação' }
  ]);
  
  usePageTitle('Redação Manuscrita');

  const { data: redacao, isLoading } = useQuery({
    queryKey: ["redacao-manuscrita", id],
    enabled: !!id,
    queryFn: async (): Promise<Redacao | null> => {
      // Verificar se é um ID de simulado (se termina com -corretor1 ou -corretor2)
      const isSimuladoId = id?.includes('-corretor');
      let originalId = id;
      let corretorNumero = null;
      
      if (isSimuladoId) {
        // Extrair ID original e número do corretor
        if (id?.endsWith('-corretor1')) {
          originalId = id.replace('-corretor1', '');
          corretorNumero = 1;
        } else if (id?.endsWith('-corretor2')) {
          originalId = id.replace('-corretor2', '');
          corretorNumero = 2;
        }
        
        // Buscar em redacoes_simulado
        const { data, error } = await supabase
          .from("redacoes_simulado")
          .select("*, simulados(frase_tematica)")
          .eq("id", originalId)
          .single();
          
        if (error) throw error;
        
        // Mapear dados do simulado para estrutura esperada
        console.log('🔍 DEBUG - Dados do simulado do banco:', data);
        console.log('🔍 DEBUG - Corretor número:', corretorNumero);
        
        const notasCalculadas = {
          nota_c1: corretorNumero === 1 ? data.c1_corretor_1 : data.c1_corretor_2,
          nota_c2: corretorNumero === 1 ? data.c2_corretor_1 : data.c2_corretor_2,
          nota_c3: corretorNumero === 1 ? data.c3_corretor_1 : data.c3_corretor_2,
          nota_c4: corretorNumero === 1 ? data.c4_corretor_1 : data.c4_corretor_2,
          nota_c5: corretorNumero === 1 ? data.c5_corretor_1 : data.c5_corretor_2,
          nota_total: corretorNumero === 1 ? data.nota_final_corretor_1 : data.nota_final_corretor_2,
        };
        
        console.log('🔍 DEBUG - Notas calculadas:', notasCalculadas);
        
        return {
          ...data,
          status: 'corrigida', // Adicionar status obrigatório
          original_id: originalId, // Manter ID original para buscar anotações
          frase_tematica: data.simulados?.frase_tematica || 'Simulado',
          redacao_manuscrita_url: data.redacao_manuscrita_url,
          tipo_envio: 'simulado',
          corretor_numero: corretorNumero,
          // Mapear notas baseado no corretor
          ...notasCalculadas,
          // Mapear comentários/áudios baseado no corretor
          elogios_pontos_atencao_corretor_1: corretorNumero === 1 ? data.elogios_pontos_atencao_corretor_1 : null,
          elogios_pontos_atencao_corretor_2: corretorNumero === 2 ? data.elogios_pontos_atencao_corretor_2 : null,
          audio_url: corretorNumero === 1 ? data.audio_url_corretor_1 : data.audio_url_corretor_2,
          audio_url_corretor_1: data.audio_url_corretor_1,
          audio_url_corretor_2: data.audio_url_corretor_2,
          // IDs reais dos corretores para buscar anotações
          corretor_id_real: corretorNumero === 1 ? data.corretor_id_1 : data.corretor_id_2
        } as Redacao;
      } else {
        // Buscar em redacoes_enviadas (lógica original)
        const { data, error } = await supabase
          .from("redacoes_enviadas")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        
        // Mapear corretor_id_real para redações regulares
        return {
          ...data,
          corretor_id_real: data.corretor_id_1 || data.corretor_id_2
        } as Redacao;
      }
    },
  });


  useEffect(() => {
    if (redacao?.frase_tematica) {
      document.title = `${redacao.frase_tematica} | Correção Manuscrita`;
    }
    
    // Verificar se é redação devolvida e mostrar modal
    if (redacao?.status === 'devolvida' && redacao?.justificativa_devolucao) {
      setShowModalDevolucao(true);
    }
  }, [redacao?.frase_tematica, redacao?.status]);

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/minhas-redacoes");
    }
  };

  const handleDownload = async () => {
    if (!redacao) return;
    try {
      await downloadRedacaoManuscritaCorrigida(redacao as any);
    } catch (e) {
      toast({ title: "Falha no download", variant: "destructive" });
    }
  };

  const TipoEnvioBadge = ({ tipo }: { tipo: string }) => {
    const map: Record<string, string> = {
      regular: "bg-blue-100 text-blue-800",
      simulado: "bg-orange-100 text-orange-800",
      exercicio: "bg-purple-100 text-purple-800",
      visitante: "bg-gray-100 text-gray-800",
      manuscrita: "bg-blue-100 text-blue-800",
    };
    const labelMap: Record<string, string> = {
      regular: "Regular",
      simulado: "Simulado",
      exercicio: "Exercício",
      visitante: "Avulsa",
      manuscrita: "Regular",
    };
    return (
      <Badge className={map[tipo] || map.regular}>{labelMap[tipo] || tipo}</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      <StudentHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={goBack} aria-label="Voltar">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>

        {/* Bloco 1 – Metadados */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-primary leading-snug">
              {redacao?.frase_tematica || "Redação Manuscrita"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm">
            <TipoEnvioBadge tipo={redacao?.tipo_envio || "regular"} />
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span>Enviado: {redacao?.data_envio && new Date(redacao.data_envio).toLocaleString("pt-BR")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 2 – Status/Notas */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            {redacao?.corrigida && redacao?.data_correcao && (
              <div className="flex items-center gap-2 text-sm text-primary/80">
                <Clock className="w-4 h-4" />
                Corrigido em: {new Date(redacao.data_correcao).toLocaleString("pt-BR")}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[1,2,3,4,5].map((c) => {
                const notaValue = (redacao as any)?.[`nota_c${c}`];
                console.log(`🔍 DEBUG - Nota C${c}:`, notaValue, 'Redação:', redacao);
                return (
                  <div key={c} className="text-center">
                    <div className="bg-white border border-primary/20 rounded-lg p-3">
                      <div className="text-xs text-primary/80 font-medium mb-1">C{c}</div>
                      <div className="text-lg font-bold text-primary">{notaValue ?? '-'}</div>
                    </div>
                  </div>
                );
              })}
              <div className="text-center">
                <div className="bg-primary text-white rounded-lg p-3">
                  <div className="text-xs font-medium mb-1">Nota</div>
                  <div className="text-lg font-bold">{redacao?.nota_total ?? '-'}</div>
                </div>
              </div>
            </div>

            {/* Player de áudio no mesmo slot da digitada (abaixo das notas) */}
            {(() => {
              if (!redacao) return null;
              const preferred = redacao.corretor_numero === 1
                ? redacao.audio_url_corretor_1
                : redacao.corretor_numero === 2
                  ? redacao.audio_url_corretor_2
                  : null;
              const audioUrl = preferred || redacao.audio_url_corretor_1 || redacao.audio_url_corretor_2 || redacao.audio_url;
              if (!audioUrl) return null;
              return (
                <div className="pt-4 mt-4 border-t border-primary/20">
                  <AudioPlayerAluno audioUrl={audioUrl} corretorNome="Corretor" isStudentView />
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Bloco 3 – Imagem + anotações (visualização, sem seletor) */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <FileText className="w-5 h-5" /> Redação Manuscrita
            </CardTitle>
          </CardHeader>
          <CardContent>
            {redacao?.redacao_manuscrita_url ? (
              <RedacaoAnotacaoVisual
                imagemUrl={redacao.redacao_manuscrita_url}
                redacaoId={redacao.original_id || redacao.id}
                corretorId={redacao.corretor_id_real || "aluno-readonly"}
                readonly
                tipoTabela={redacao.tipo_envio === 'simulado' ? 'redacoes_simulado' : 
                           redacao.tipo_envio === 'exercicio' ? 'redacoes_exercicio' : 
                           'redacoes_enviadas'}
                statusMinhaCorrecao="corrigida"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Imagem não disponível.</p>
            )}
          </CardContent>
        </Card>

        {/* Bloco 4 – Relatório pedagógico (apenas texto, como na digitada) */}
        {redacao && (() => {
          const relatorio = (redacao.elogios_pontos_atencao_corretor_1?.trim() || redacao.elogios_pontos_atencao_corretor_2?.trim() || redacao.comentario_admin?.trim() || "");
          if (!relatorio) return null;
          return (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  Relatório pedagógico de correção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border border-primary/20 rounded-lg p-4">
                  <p className="text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {relatorio}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Sticky footer para mobile */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 border-t md:hidden">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={goBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            {studentData?.userType !== 'aluno' && (
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" /> Baixar (PDF/Imagem)
              </Button>
            )}
          </div>
        </div>

        {/* Modal de devolução */}
        {redacao && showModalDevolucao && (studentData?.email || localStorage.getItem('alunoData')) && (
          <ModalDevolucaoRedacao
            isOpen={showModalDevolucao}
            onClose={() => setShowModalDevolucao(false)}
            redacao={{
              id: redacao.id,
              frase_tematica: redacao.frase_tematica,
              tabela_origem: redacao.tipo_envio === 'simulado' ? 'redacoes_simulado' : 
                           redacao.tipo_envio === 'exercicio' ? 'redacoes_exercicio' : 
                           'redacoes_enviadas',
              justificativa_devolucao: redacao.justificativa_devolucao || 'Motivo não especificado',
              data_envio: redacao.data_envio
            }}
            emailAluno={studentData?.email || JSON.parse(localStorage.getItem('alunoData') || '{}').email}
            corretorNome="Corretor"
          />
        )}
      </main>
    </div>
  );
}
