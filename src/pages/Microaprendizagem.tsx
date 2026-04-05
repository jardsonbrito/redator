import { useNavigate } from 'react-router-dom';
import { StudentHeader } from '@/components/StudentHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useMicroTopicos } from '@/hooks/useMicroTopicos';
import { MicroTopicCard } from '@/components/shared/MicroTopicCard';

const Microaprendizagem = () => {
  const navigate = useNavigate();
  const { data: topicos = [], isLoading } = useMicroTopicos();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Cabeçalho */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 text-gray-500 hover:text-gray-700 -ml-2"
              onClick={() => navigate('/app')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#3f0776] flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Microaprendizagem</h1>
                <p className="text-sm text-gray-500">Conteúdos rápidos para aprender no seu ritmo</p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-52 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : topicos.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Mais conteúdos em breve</p>
              <p className="text-sm text-gray-400 mt-1">
                Os tópicos de microaprendizagem serão disponibilizados em breve.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {topicos.map((topico, idx) => (
                <MicroTopicCard key={topico.id} topico={topico} index={idx} />
              ))}
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};

export default Microaprendizagem;
