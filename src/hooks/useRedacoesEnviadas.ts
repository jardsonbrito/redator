
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
  corretor_id_1: string | null;
  corretor_id_2: string | null;
  corretor_nome_1?: string;
  corretor_nome_2?: string;
  // Propriedades específicas do corretor 1
  c1_corretor_1: number | null;
  c2_corretor_1: number | null;
  c3_corretor_1: number | null;
  c4_corretor_1: number | null;
  c5_corretor_1: number | null;
  nota_final_corretor_1: number | null;
  status_corretor_1: string | null;
  comentario_c1_corretor_1: string | null;
  comentario_c2_corretor_1: string | null;
  comentario_c3_corretor_1: string | null;
  comentario_c4_corretor_1: string | null;
  comentario_c5_corretor_1: string | null;
  elogios_pontos_atencao_corretor_1: string | null;
  // Propriedades específicas do corretor 2
  c1_corretor_2: number | null;
  c2_corretor_2: number | null;
  c3_corretor_2: number | null;
  c4_corretor_2: number | null;
  c5_corretor_2: number | null;
  nota_final_corretor_2: number | null;
  status_corretor_2: string | null;
  comentario_c1_corretor_2: string | null;
  comentario_c2_corretor_2: string | null;
  comentario_c3_corretor_2: string | null;
  comentario_c4_corretor_2: string | null;
  comentario_c5_corretor_2: string | null;
  elogios_pontos_atencao_corretor_2: string | null;
}

export const useRedacoesEnviadas = (filtroStatus?: string) => {
  const [redacoes, setRedacoes] = useState<RedacaoEnviada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchRedacoes();
  }, [filtroStatus]);

  const fetchRedacoes = async () => {
    try {
      console.log('Buscando redações enviadas por alunos...');
      
      // Buscar redações enviadas com todos os campos necessários
      let query = supabase
        .from("redacoes_enviadas")
        .select(`
          id,
          nome_aluno,
          email_aluno,
          turma,
          frase_tematica,
          redacao_texto,
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
          corretor_id_1,
          corretor_id_2,
          c1_corretor_1,
          c2_corretor_1,
          c3_corretor_1,
          c4_corretor_1,
          c5_corretor_1,
          nota_final_corretor_1,
          status_corretor_1,
          comentario_c1_corretor_1,
          comentario_c2_corretor_1,
          comentario_c3_corretor_1,
          comentario_c4_corretor_1,
          comentario_c5_corretor_1,
          elogios_pontos_atencao_corretor_1,
          c1_corretor_2,
          c2_corretor_2,
          c3_corretor_2,
          c4_corretor_2,
          c5_corretor_2,
          nota_final_corretor_2,
          status_corretor_2,
          comentario_c1_corretor_2,
          comentario_c2_corretor_2,
          comentario_c3_corretor_2,
          comentario_c4_corretor_2,
          comentario_c5_corretor_2,
          elogios_pontos_atencao_corretor_2
        `)
        .order("data_envio", { ascending: false });

      // Aplicar filtros baseados no status solicitado
      if (filtroStatus === 'pendentes') {
        query = query.eq('corrigida', false);
      } else if (filtroStatus === 'corrigidas') {
        query = query.eq('corrigida', true);
      }

      const { data: redacoesData, error } = await query;

      if (error) {
        console.error('Erro ao buscar redações enviadas:', error);
        throw error;
      }

      console.log(`Encontradas ${redacoesData?.length || 0} redações enviadas`);

      // Buscar informações dos corretores
      let redacoesComCorretores: RedacaoEnviada[] = [];
      
      if (redacoesData && redacoesData.length > 0) {
        // Coletar IDs únicos dos corretores
        const corretorIds = new Set<string>();
        redacoesData.forEach(redacao => {
          if (redacao.corretor_id_1) corretorIds.add(redacao.corretor_id_1);
          if (redacao.corretor_id_2) corretorIds.add(redacao.corretor_id_2);
        });

        let corretoresMap = new Map();
        
        if (corretorIds.size > 0) {
          const { data: corretoresData } = await supabase
            .from('corretores')
            .select('id, nome_completo')
            .in('id', Array.from(corretorIds));

          if (corretoresData) {
            corretoresData.forEach(corretor => {
              corretoresMap.set(corretor.id, corretor.nome_completo);
            });
          }
        }

        // Combinar dados
        redacoesComCorretores = redacoesData.map(redacao => ({
          ...redacao,
          corretor_nome_1: redacao.corretor_id_1 ? corretoresMap.get(redacao.corretor_id_1) : null,
          corretor_nome_2: redacao.corretor_id_2 ? corretoresMap.get(redacao.corretor_id_2) : null,
        }));
      }

      console.log('Redações processadas com dados dos corretores:', redacoesComCorretores.length);
      setRedacoes(redacoesComCorretores);
    } catch (error: any) {
      console.error("Erro ao buscar redações enviadas:", error);
      toast({
        title: "Erro ao carregar redações",
        description: "Não foi possível carregar as redações enviadas.",
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
    const corretorInfo = redacao.corretor_nome_1 ? `\nCorretor: ${redacao.corretor_nome_1}` : '';
    const text = `Aluno: ${redacao.nome_aluno}\nE-mail: ${redacao.email_aluno}\nTurma: ${redacao.turma}\nTema: ${redacao.frase_tematica}${corretorInfo}\n\nTexto:\n${redacao.redacao_texto}`;
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
