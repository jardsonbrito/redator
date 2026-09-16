import { useNavigate, useParams } from 'react-router-dom';
import { StudentHeader } from '@/components/StudentHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useMicroItens } from '@/hooks/useMicroItens';
import { useMicroProgresso } from '@/hooks/useMicroProgresso';
import { MicroItemCard } from '@/components/shared/MicroItemCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProgressoStatus } from '@/hooks/useMicroProgresso';

const MicroaprendizagemTopico = () => {
  const { topicoId } = useParams<{ topicoId: string }>();
  const navigate = useNavigate();

  const { data: itens = [], isLoading: loadingItens } = useMicroItens(topicoId!);

  // Buscar dados do tópico
  const { data: topico } = useQuery({
    queryKey: ['micro-topico', topicoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('micro_topicos')
        .select('*')
        .eq('id', topicoId)
        .single();
      return data;
    },
    enabled: !!topicoId,
  });

  const itemIds = itens.map(i => i.id);
  const { data: progressos = [] } = useMicroProgresso(itemIds);

  const getStatus = (itemId: string): ProgressoStatus => {
    const p = progressos.find(pr => pr.item_id === itemId);
    return (p?.status as ProgressoStatus) ?? 'nao_iniciado';
  };

  const concluidos = progressos.filter(p => p.status === 'concluido').length;
  const pct = itens.length > 0 ? Math.round((concluidos / itens.length) * 100) : 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Navegação */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 text-gray-500 hover:text-gray-700 -ml-2"
              onClick={() => navigate('/microaprendizagem')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Microaprendizagem
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#3f0776] flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">
                  {topico?.titulo ?? 'Carregando...'}
                </h1>
                {topico?.descricao && (
                  <p className="text-sm text-gray-500">{topico.descricao}</p>
                )}
              </div>
            </div>

            {/* Barra de progresso do tópico */}
            {itens.length > 0 && (
              <div className="mt-4 p-3 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">{concluidos} de {itens.length} concluídos</span>
                  <span className="text-xs font-semibold text-[#3f0776]">{pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3f0776] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lista de itens */}
          {loadingItens ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-44 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : itens.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Mais conteúdos em breve</p>
              <p className="text-sm text-gray-400 mt-1">
                Este tópico ainda não possui conteúdos disponíveis para o seu plano.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {itens.map(item => (
                <MicroItemCard
                  key={item.id}
                  item={item}
                  topicoId={topicoId!}
                  status={getStatus(item.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};

export default MicroaprendizagemTopico;
