import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedCard, UnifiedCardSkeleton } from "@/components/ui/unified-card";
import { GraduationCap, Play, FileText } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { resolveAulaCover } from "@/utils/coverUtils";
import { AulaGravadaCardPadrao } from "@/components/shared/AulaGravadaCardPadrao";

const CorretorAulas = () => {
  const { data: aulas, isLoading, error } = useQuery({
    queryKey: ['aulas-corretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select(`
          *,
          modulos(nome)
        `)
        .eq('ativo', true)
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(aula => ({
        ...aula,
        modulo: aula.modulos?.nome || ''
      }));
    }
  });

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aulas</h1>
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
          <p className="text-red-600">Erro ao carregar aulas. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  // Não agrupar mais por módulo, renderizar diretamente
  const aulasOrdenadas = aulas || [];

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aulas</h1>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {aulasOrdenadas.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Nenhuma aula disponível
                </h3>
                <p className="text-gray-500">
                  As aulas aparecerão aqui quando forem publicadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            aulasOrdenadas.map((aula) => (
              <AulaGravadaCardPadrao
                key={aula.id}
                aula={aula}
                perfil="corretor"
                actions={{
                  onAssistir: () => window.open(aula.link_conteudo, '_blank'),
                  onBaixarPdf: aula.pdf_url ? () => window.open(aula.pdf_url, '_blank') : undefined,
                }}
              />
            ))
          )}
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorAulas;