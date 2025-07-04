
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface RedacaoEnviada {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  frase_tematica: string;
  redacao_texto: string;
  data_envio: string;
  corrigida: boolean;
  nota_c1?: number;
  nota_c2?: number;
  nota_c3?: number;
  nota_c4?: number;
  nota_c5?: number;
  nota_total?: number;
  comentario_admin?: string;
  status: string;
  tipo_envio: string;
}

export const useRedacoesEnviadas = () => {
  const [redacoes, setRedacoes] = useState<RedacaoEnviada[]>([]);
  const [filteredRedacoes, setFilteredRedacoes] = useState<RedacaoEnviada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchRedacoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("redacoes_enviadas")
        .select("*")
        .eq("tipo_envio", "regular")
        .order("data_envio", { ascending: false });

      if (error) throw error;

      setRedacoes(data || []);
      setFilteredRedacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar redações:", error);
      toast({
        title: "Erro ao carregar redações",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedacoes();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRedacoes(redacoes);
      return;
    }

    const filtered = redacoes.filter(redacao => 
      redacao.nome_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redacao.email_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redacao.turma.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redacao.frase_tematica.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredRedacoes(filtered);
  }, [searchTerm, redacoes]);

  const handleDeleteRedacao = async (redacao: RedacaoEnviada) => {
    try {
      const { error } = await supabase
        .from("redacoes_enviadas")
        .delete()
        .eq("id", redacao.id);

      if (error) throw error;

      toast({
        title: "Redação excluída com sucesso!",
        description: `A redação de ${redacao.nome_aluno} foi removida do sistema.`
      });

      fetchRedacoes();
    } catch (error: any) {
      console.error("Erro ao excluir redação:", error);
      toast({
        title: "Erro ao excluir redação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleCopyRedacao = async (redacao: RedacaoEnviada) => {
    const textToCopy = `Autor: ${redacao.nome_aluno}
Tema: ${redacao.frase_tematica}

Texto:
${redacao.redacao_texto}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Redação copiada com sucesso!",
        description: "O conteúdo foi copiado para a área de transferência."
      });
    } catch (error) {
      console.error("Erro ao copiar redação:", error);
      toast({
        title: "Erro ao copiar redação",
        description: "Não foi possível copiar o conteúdo. Tente novamente.",
        variant: "destructive"
      });
    }
  };

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
