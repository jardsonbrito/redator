
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RedacaoEnviada {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  frase_tematica: string;
  redacao_texto: string;
  redacao_manuscrita_url: string | null;
  data_envio: string;
  corrigida: boolean;
  nota_total: number | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  comentario_admin: string | null;
  data_correcao: string | null;
  status: string;
  tipo_envio: string;
  // Campos de congelamento
  congelada?: boolean;
  data_congelamento?: string;
  descongelada_por?: string;
  data_descongelamento?: string;
  // New corrector fields
  c1_corretor_1: number | null;
  c2_corretor_1: number | null;
  c3_corretor_1: number | null;
  c4_corretor_1: number | null;
  c5_corretor_1: number | null;
  nota_final_corretor_1: number | null;
  status_corretor_1: string | null;
  c1_corretor_2: number | null;
  c2_corretor_2: number | null;
  c3_corretor_2: number | null;
  c4_corretor_2: number | null;
  c5_corretor_2: number | null;
  nota_final_corretor_2: number | null;
  status_corretor_2: string | null;
  corretor_id_1: string | null;
  corretor_id_2: string | null;
  corretor_1: { nome_completo: string } | null;
  corretor_2: { nome_completo: string } | null;
}

export const useRedacoesEnviadas = () => {
  const [redacoes, setRedacoes] = useState<RedacaoEnviada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchRedacoes();
  }, []);

  const fetchRedacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("redacoes_enviadas")
        .select(`
          id,
          nome_aluno,
          email_aluno,
          turma,
          frase_tematica,
          redacao_texto,
          redacao_manuscrita_url,
          data_envio,
          corrigida,
          nota_total,
          nota_c1,
          nota_c2,
          nota_c3,
          nota_c4,
          nota_c5,
          comentario_admin,
          data_correcao,
          status,
          tipo_envio,
          congelada,
          data_congelamento,
          descongelada_por,
          data_descongelamento,
          c1_corretor_1,
          c2_corretor_1,
          c3_corretor_1,
          c4_corretor_1,
          c5_corretor_1,
          nota_final_corretor_1,
          status_corretor_1,
          c1_corretor_2,
          c2_corretor_2,
          c3_corretor_2,
          c4_corretor_2,
          c5_corretor_2,
          nota_final_corretor_2,
          status_corretor_2,
          corretor_id_1,
          corretor_id_2,
          corretor_1:corretores!corretor_id_1(nome_completo),
          corretor_2:corretores!corretor_id_2(nome_completo)
        `)
        .order("data_envio", { ascending: false });

      if (error) throw error;

      // Resolver nomes de alunos quando o nome_aluno for genérico ("Aluno")
      const redacoesComNomeGenerico = (data || []).filter(
        r => !r.nome_aluno || r.nome_aluno.trim() === "Aluno" || r.nome_aluno.trim() === ""
      );

      // Buscar todos os nomes em uma única query
      let nomesMap: Record<string, string> = {};
      if (redacoesComNomeGenerico.length > 0) {
        const emails = [...new Set(redacoesComNomeGenerico.map(r => r.email_aluno))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("email, nome")
          .in("email", emails)
          .eq("user_type", "aluno");

        if (profilesData) {
          nomesMap = profilesData.reduce((acc, p) => {
            if (p.email && p.nome) acc[p.email] = p.nome;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Aplicar os nomes resolvidos
      const redacoesProcessadas = (data || []).map(redacao => {
        if (!redacao.nome_aluno || redacao.nome_aluno.trim() === "Aluno" || redacao.nome_aluno.trim() === "") {
          const nomeResolvido = nomesMap[redacao.email_aluno];
          if (nomeResolvido) {
            return { ...redacao, nome_aluno: nomeResolvido };
          }
        }
        return redacao;
      });

      setRedacoes(redacoesProcessadas);
    } catch (error: any) {
      console.error("Erro ao buscar redações:", error);
      toast({
        title: "Erro ao carregar redações",
        description: "Não foi possível carregar as redações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRedacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from("redacoes_enviadas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Redação excluída",
        description: "A redação foi excluída com sucesso."
      });

      fetchRedacoes();
    } catch (error: any) {
      console.error("Erro ao excluir redação:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a redação.",
        variant: "destructive"
      });
    }
  };

  const handleCopyRedacao = (redacao: RedacaoEnviada) => {
    const text = `Aluno: ${redacao.nome_aluno}\nE-mail: ${redacao.email_aluno}\nTurma: ${redacao.turma}\nTema: ${redacao.frase_tematica}\n\nTexto:\n${redacao.redacao_texto}${redacao.redacao_manuscrita_url ? `\n\nRedação Manuscrita: ${redacao.redacao_manuscrita_url}` : ''}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Redação copiada!",
      description: "O texto da redação foi copiado para a área de transferência."
    });
  };

  const filteredRedacoes = redacoes.filter(redacao =>
    redacao.nome_aluno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redacao.email_aluno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redacao.turma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redacao.frase_tematica?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    redacoes: filteredRedacoes,
    loading,
    searchTerm,
    setSearchTerm,
    fetchRedacoes,
    handleDeleteRedacao,
    handleCopyRedacao
  };
};
