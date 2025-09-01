import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnifiedCard, UnifiedCardSkeleton } from "@/components/ui/unified-card";
import { BookOpen, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useState } from "react";
import { resolveExemplarCover } from "@/utils/coverUtils";
import { dicaToHTML } from "@/utils/dicaToHTML";

const CorretorRedacoesExemplar = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<any>(null);

  const { data: redacoesExemplares, isLoading, error } = useQuery({
    queryKey: ['redacoes-exemplares-corretor'],
    queryFn: async () => {
      try {
        console.log('🔍 Buscando redações exemplares...');
        
        // Buscar redações exemplares da tabela 'redacoes' (cadastradas pelo administrador)
        const { data, error } = await supabase
          .from('redacoes')
          .select('id, frase_tematica, eixo_tematico, conteudo, data_envio, nota_total, pdf_url, dica_de_escrita')
          .order('nota_total', { ascending: false });

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
            <h1 className="text-2xl font-bold text-gray-900">Redações Exemplares</h1>
            <p className="text-gray-600">Redações modelo cadastradas pelo administrador</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
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
          <h1 className="text-2xl font-bold text-gray-900">Redações Exemplares</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {redacoesExemplares?.map((redacao: any) => {
              // Usar capa real da redação exemplar
              const coverUrl = resolveExemplarCover(redacao);
              const badges: Array<{ label: string; tone: 'primary' | 'neutral' | 'success' | 'warning' }> = [
                { label: 'Redação Modelo', tone: 'warning' }
              ];
              
              if (redacao.eixo_tematico) {
                badges.push({ label: redacao.eixo_tematico, tone: 'primary' });
              }

              // Parse da data se existir  
              const dataFormatada = redacao.data_envio 
                ? format(new Date(redacao.data_envio), "dd/MM/yyyy", { locale: ptBR })
                : null;

              const meta = [
                { icon: User, text: 'Professor' },
                ...(dataFormatada ? [{ icon: Calendar, text: dataFormatada }] : [])
              ];

              return (
                <UnifiedCard
                  key={redacao.id}
                  variant="corretor"
                  item={{
                    coverUrl,
                    title: redacao.frase_tematica || 'Redação Exemplar',
                    badges,
                    meta,
                    cta: {
                      label: 'Ver Redação',
                      onClick: () => setSelectedRedacao(redacao),
                      ariaLabel: `Ver redação exemplar: ${redacao.frase_tematica}`
                    },
                    ariaLabel: `Redação exemplar: ${redacao.frase_tematica}`
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Modal para visualizar redação */}
        <Dialog open={!!selectedRedacao} onOpenChange={() => setSelectedRedacao(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {selectedRedacao?.frase_tematica}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, 
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema <strong>"{selectedRedacao?.frase_tematica}"</strong>, 
                  apresentando proposta de intervenção que respeite os direitos humanos.
                </p>
              </div>
              
              {/* Texto da redação */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Redação</h4>
                <div className="whitespace-pre-wrap font-serif text-base leading-relaxed text-gray-700 border rounded-lg p-4 bg-gray-50">
                  {selectedRedacao?.texto}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CorretorLayout>
  );
};

export default CorretorRedacoesExemplar;