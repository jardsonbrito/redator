import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, ChevronRight, Users } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useInteracoesAtivas } from '@/hooks/useInteratividade';
import { useMinhasRespostas } from '@/hooks/useInteratividade';

const Interatividade = () => {
  const navigate = useNavigate();
  const { data: interacoes = [], isLoading } = useInteracoesAtivas();
  const ids = interacoes.map(i => i.id);
  const { data: minhasRespostas = [] } = useMinhasRespostas(ids);

  const jaRespondeu = (interacaoId: string) =>
    minhasRespostas.some(r => r.interacao_id === interacaoId);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 pb-24">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Cabeçalho */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#3f0776] flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Interatividade</h1>
                <p className="text-sm text-gray-500">Enquetes e atividades abertas para você</p>
              </div>
            </div>
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" />
              ))}
            </div>
          ) : interacoes.length === 0 ? (
            <div className="text-center py-20">
              <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhuma interação disponível</p>
              <p className="text-sm text-gray-400 mt-1">
                Fique de olho! Em breve novas enquetes serão publicadas aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {interacoes.map(item => {
                const respondida = jaRespondeu(item.id);
                return (
                  <button
                    key={item.id}
                    className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-violet-200 transition-all"
                    onClick={() => navigate(`/interatividade/${item.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        respondida ? 'bg-green-100' : 'bg-violet-100'
                      }`}>
                        {respondida
                          ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                          : <ClipboardList className="w-5 h-5 text-violet-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-gray-900 text-sm truncate">
                            {item.titulo}
                          </h2>
                          {respondida && (
                            <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50 shrink-0">
                              Participação registrada
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{item.pergunta}</p>
                        {item.descricao && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.descricao}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};

export default Interatividade;
