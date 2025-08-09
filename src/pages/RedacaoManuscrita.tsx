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

interface Redacao {
  id: string;
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

  const { data: redacao, isLoading } = useQuery({
    queryKey: ["redacao-manuscrita", id],
    enabled: !!id,
    queryFn: async (): Promise<Redacao | null> => {
      const { data, error } = await supabase
        .from("redacoes_enviadas")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return (data as unknown) as Redacao;
    },
  });

  // Obter dados do aluno do localStorage
  const studentDataStr = localStorage.getItem('alunoData');
  const studentData = studentDataStr ? JSON.parse(studentDataStr) : null;

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
              {[1,2,3,4,5].map((c) => (
                <div key={c} className="text-center">
                  <div className="bg-white border border-primary/20 rounded-lg p-3">
                    <div className="text-xs text-primary/80 font-medium mb-1">C{c}</div>
                    <div className="text-lg font-bold text-primary">{(redacao as any)?.[`nota_c${c}`] ?? '-'}</div>
                  </div>
                </div>
              ))}
              <div className="text-center">
                <div className="bg-primary text-white rounded-lg p-3">
                  <div className="text-xs font-medium mb-1">Média Final</div>
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
                redacaoId={redacao.id}
                corretorId="aluno-readonly"
                readonly
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
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" /> Baixar (PDF/Imagem)
            </Button>
          </div>
        </div>

        {/* Modal de devolução */}
        {redacao && showModalDevolucao && studentData?.email && (
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
            emailAluno={studentData.email}
            corretorNome="Corretor"
          />
        )}
      </main>
    </div>
  );
}
