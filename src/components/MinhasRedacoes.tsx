
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RedacaoEnviadaCard } from "./RedacaoEnviadaCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

type RedacaoEnviada = {
  id: string;
  frase_tematica: string;
  redacao_texto: string;
  data_envio: string;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  nota_total: number | null;
  comentario_admin: string | null;
  corrigida: boolean;
  data_correcao: string | null;
};

export const MinhasRedacoes = () => {
  const { data: redacoes, isLoading, error } = useQuery({
    queryKey: ['redacoes-enviadas'],
    queryFn: async () => {
      console.log('Buscando redações enviadas pelo usuário...');
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .order('data_envio', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar redações enviadas:', error);
        throw error;
      }
      
      console.log('Redações enviadas encontradas:', data);
      return data as RedacaoEnviada[] || [];
    },
    refetchInterval: 30000, // Refetch a cada 30 segundos para pegar atualizações
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-accent mx-auto mb-4"></div>
        <p className="text-redator-accent">Carregando suas redações...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="text-center py-8">
          <p className="text-red-600">Erro ao carregar suas redações. Tente novamente.</p>
        </CardContent>
      </Card>
    );
  }

  if (!redacoes || redacoes.length === 0) {
    return (
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <FileText className="w-5 h-5" />
            Suas Redações
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-redator-accent mb-4">Você ainda não enviou nenhuma redação.</p>
          <p className="text-sm text-redator-accent/70">
            Acesse a seção "Envie sua Redação" para começar a praticar!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-redator-primary" />
        <h2 className="text-2xl font-bold text-redator-primary">
          Suas Redações ({redacoes.length})
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {redacoes.map((redacao) => (
          <RedacaoEnviadaCard key={redacao.id} redacao={redacao} />
        ))}
      </div>
    </div>
  );
};
