import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { RedacaoExemplarCardPadrao } from "@/components/shared/RedacaoExemplarCardPadrao";
import { BookOpen } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";

const CorretorRedacoesExemplar = () => {

  const { data: redacoesExemplares, isLoading, error } = useQuery({
    queryKey: ['redacoes-exemplares-corretor', 'v2'], // Alterando para forçar refresh
    queryFn: async () => {
      try {
        console.log('🔍 Buscando redações exemplares...');
        
        // Buscar redações exemplares da tabela 'redacoes' (cadastradas pelo administrador)
        const { data, error } = await supabase
          .from('redacoes')
          .select('id, frase_tematica, eixo_tematico, conteudo, data_envio, nota_total, pdf_url, dica_de_escrita, autor, foto_autor')
          .order('data_envio', { ascending: false });

        if (error) {
          console.error('❌ Erro ao buscar redações exemplares:', error);
          throw error;
        }

        console.log('✅ Redações exemplares encontradas:', data?.length || 0);
        
        // Formatar as redações exemplares
        const redacoesFormatadas = (data || []).map(r => ({
          ...r,
          tipo_fonte: 'exemplar',
          frase_tematica: r.frase_tematica || 'Redação Exemplar',
          eixo_tematico: r.eixo_tematico,
          texto: r.conteudo,
          data_envio: r.data_envio,
          nome_aluno: 'Redação Modelo', // Redações exemplares são modelos
          imagem_url: r.pdf_url // Usar pdf_url como imagem
        }));

        console.log('✅ Redações formatadas:', redacoesFormatadas.length);
        return redacoesFormatadas;
      } catch (error) {
        console.error('❌ Erro ao buscar redações exemplares:', error);
        return [];
      }
    }
  });

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exemplares</h1>
            <p className="text-gray-600">Redações modelo cadastradas pelo administrador</p>
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[16/9] bg-gray-200 animate-pulse"></div>
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                  </div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </CorretorLayout>
    );
  }

  if (error) {
    return (
      <CorretorLayout>
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar redações. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exemplares</h1>
            <p className="text-gray-600">Redações modelo cadastradas pelo administrador</p>
          </div>

        {!redacoesExemplares || redacoesExemplares.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma redação exemplar disponível
              </h3>
              <p className="text-gray-500">
                As redações exemplares aparecerão aqui quando cadastradas pelo administrador.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {redacoesExemplares?.map((redacao: any) => (
              <RedacaoExemplarCardPadrao
                key={redacao.id}
                redacao={redacao}
                perfil="corretor"
              />
            ))}
          </div>
        )}

      </div>
    </CorretorLayout>
  );
};

export default CorretorRedacoesExemplar;