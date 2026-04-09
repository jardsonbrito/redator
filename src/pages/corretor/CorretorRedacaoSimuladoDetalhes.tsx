import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { RedacaoEnviadaCard } from "@/components/RedacaoEnviadaCard";

const CorretorRedacaoSimuladoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedCorretor, setSelectedCorretor] = useState<number>(1);

  const { data: redacoesProcessadas, isLoading, error } = useQuery({
    queryKey: ["corretor-redacao-simulado-detalhes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redacoes_simulado")
        .select("*, simulados(frase_tematica, titulo)")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Buscar nomes dos corretores
      const idsCorretores: string[] = [];
      if (data.corretor_id_1) idsCorretores.push(data.corretor_id_1);
      if (data.corretor_id_2) idsCorretores.push(data.corretor_id_2);

      let nomesCorretores: Record<string, string> = {};
      if (idsCorretores.length > 0) {
        const { data: corretores } = await supabase
          .from("corretores")
          .select("id, nome_completo")
          .in("id", idsCorretores);
        if (corretores) {
          nomesCorretores = corretores.reduce((acc, c) => {
            acc[c.id] = c.nome_completo;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const fraseTematica = data.simulados?.frase_tematica || "Simulado";
      const baseFields = {
        original_id: data.id,
        frase_tematica: fraseTematica,
        redacao_texto: data.texto || "",
        redacao_manuscrita_url: data.redacao_manuscrita_url,
        redacao_imagem_gerada_url: data.redacao_imagem_gerada_url,
        data_envio: data.data_envio,
        nome_aluno: data.nome_aluno,
        email_aluno: data.email_aluno,
        turma: data.turma,
        tipo_envio: "simulado" as const,
        corrigida: !!data.corrigida,
        data_correcao: data.data_correcao,
        corretor_id_1: data.corretor_id_1,
        corretor_id_2: data.corretor_id_2,
        c1_corretor_1: data.c1_corretor_1,
        c2_corretor_1: data.c2_corretor_1,
        c3_corretor_1: data.c3_corretor_1,
        c4_corretor_1: data.c4_corretor_1,
        c5_corretor_1: data.c5_corretor_1,
        c1_corretor_2: data.c1_corretor_2,
        c2_corretor_2: data.c2_corretor_2,
        c3_corretor_2: data.c3_corretor_2,
        c4_corretor_2: data.c4_corretor_2,
        c5_corretor_2: data.c5_corretor_2,
        comentario_c1_corretor_1: data.comentario_c1_corretor_1,
        comentario_c2_corretor_1: data.comentario_c2_corretor_1,
        comentario_c3_corretor_1: data.comentario_c3_corretor_1,
        comentario_c4_corretor_1: data.comentario_c4_corretor_1,
        comentario_c5_corretor_1: data.comentario_c5_corretor_1,
        elogios_pontos_atencao_corretor_1: data.elogios_pontos_atencao_corretor_1,
        comentario_c1_corretor_2: data.comentario_c1_corretor_2,
        comentario_c2_corretor_2: data.comentario_c2_corretor_2,
        comentario_c3_corretor_2: data.comentario_c3_corretor_2,
        comentario_c4_corretor_2: data.comentario_c4_corretor_2,
        comentario_c5_corretor_2: data.comentario_c5_corretor_2,
        elogios_pontos_atencao_corretor_2: data.elogios_pontos_atencao_corretor_2,
        correcao_arquivo_url_corretor_1: data.correcao_arquivo_url_corretor_1,
        correcao_arquivo_url_corretor_2: data.correcao_arquivo_url_corretor_2,
        audio_url_corretor_1: data.audio_url_corretor_1,
        audio_url_corretor_2: data.audio_url_corretor_2,
      };

      const list = [];

      if (data.corretor_id_1) {
        list.push({
          ...baseFields,
          id: `${data.id}-corretor1`,
          status: data.status_corretor_1 === "corrigida" ? "corrigida" : "aguardando",
          corretor: nomesCorretores[data.corretor_id_1] || "Corretor 1",
          corretor_numero: 1,
          corretor_id_real: data.corretor_id_1,
          nota_c1: data.c1_corretor_1,
          nota_c2: data.c2_corretor_1,
          nota_c3: data.c3_corretor_1,
          nota_c4: data.c4_corretor_1,
          nota_c5: data.c5_corretor_1,
          nota_total: data.nota_final_corretor_1,
          audio_url: data.audio_url_corretor_1,
        });
      }

      if (data.corretor_id_2) {
        list.push({
          ...baseFields,
          id: `${data.id}-corretor2`,
          status: data.status_corretor_2 === "corrigida" ? "corrigida" : "aguardando",
          corretor: nomesCorretores[data.corretor_id_2] || "Corretor 2",
          corretor_numero: 2,
          corretor_id_real: data.corretor_id_2,
          nota_c1: data.c1_corretor_2,
          nota_c2: data.c2_corretor_2,
          nota_c3: data.c3_corretor_2,
          nota_c4: data.c4_corretor_2,
          nota_c5: data.c5_corretor_2,
          nota_total: data.nota_final_corretor_2,
          audio_url: data.audio_url_corretor_2,
        });
      }

      return list;
    },
  });

  const goBack = () => navigate(-1);
  const redacaoAtual = redacoesProcessadas?.find((r) => r.corretor_numero === selectedCorretor);
  const temMultiplos = (redacoesProcessadas?.length ?? 0) > 1;

  return (
    <CorretorLayout>
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {isLoading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Carregando redação...
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              Erro ao carregar redação.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && redacoesProcessadas && (
          <>
            {temMultiplos && (
              <div className="flex gap-2">
                {redacoesProcessadas.map((r) => (
                  <Button
                    key={r.corretor_numero}
                    variant={selectedCorretor === r.corretor_numero ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCorretor(r.corretor_numero!)}
                  >
                    {r.corretor || `Corretor ${r.corretor_numero}`}
                  </Button>
                ))}
              </div>
            )}

            {redacaoAtual && (
              <RedacaoEnviadaCard redacao={redacaoAtual as any} />
            )}
          </>
        )}
      </div>
    </CorretorLayout>
  );
};

export default CorretorRedacaoSimuladoDetalhes;
