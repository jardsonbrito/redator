import { lazy, Suspense, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentHeader } from '@/components/StudentHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMicroItem } from '@/hooks/useMicroItens';
import { useMicroProgressoItem, useMicroProgressoMutation } from '@/hooks/useMicroProgresso';
import { MicroProgressBadge } from '@/components/microaprendizagem/progress/MicroProgressBadge';

// Viewers com lazy loading
const VideoViewer      = lazy(() => import('@/components/microaprendizagem/viewers/VideoViewer').then(m => ({ default: m.VideoViewer })));
const AudioPlayer      = lazy(() => import('@/components/microaprendizagem/viewers/AudioPlayer').then(m => ({ default: m.AudioPlayer })));
const PodcastViewer    = lazy(() => import('@/components/microaprendizagem/viewers/PodcastViewer').then(m => ({ default: m.PodcastViewer })));
const PdfViewer        = lazy(() => import('@/components/microaprendizagem/viewers/PdfViewer').then(m => ({ default: m.PdfViewer })));
const InfographicViewer= lazy(() => import('@/components/microaprendizagem/viewers/InfographicViewer').then(m => ({ default: m.InfographicViewer })));
const CardPostItViewer = lazy(() => import('@/components/microaprendizagem/viewers/CardPostItViewer').then(m => ({ default: m.CardPostItViewer })));
const QuizViewer       = lazy(() => import('@/components/microaprendizagem/viewers/QuizViewer').then(m => ({ default: m.QuizViewer })));
const FlashcardViewer  = lazy(() => import('@/components/microaprendizagem/viewers/FlashcardViewer').then(m => ({ default: m.FlashcardViewer })));

const TIPO_LABEL: Record<string, string> = {
  video: '🎥 Vídeo',
  audio: '🎙️ Áudio',
  podcast: '🎧 Podcast',
  microtexto: '📄 Microtexto',
  infografico: '🖼️ Infográfico',
  card: '📌 Card',
  quiz: '❓ Quiz',
  flashcard: '🃏 Flashcard',
};

const ViewerSkeleton = () => (
  <div className="w-full h-64 bg-gray-100 rounded-xl animate-pulse" />
);

const MicroaprendizagemItem = () => {
  const { topicoId, itemId } = useParams<{ topicoId: string; itemId: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useMicroItem(itemId!);
  const { data: progresso } = useMicroProgressoItem(itemId!);
  const { marcarEmAndamento, marcarConcluido, registrarAcesso } = useMicroProgressoMutation();

  const status = progresso?.status ?? 'nao_iniciado';

  // Registrar acesso ao entrar na página
  useEffect(() => {
    if (itemId) registrarAcesso(itemId);
  }, [itemId]);

  // Marcar como em_andamento ao abrir (exceto quiz — ele controla o próprio estado)
  useEffect(() => {
    if (item && item.tipo !== 'quiz' && status === 'nao_iniciado') {
      marcarEmAndamento.mutate(item.id);
    }
  }, [item?.id, item?.tipo, status]);

  const handleConcluir = () => {
    if (item) marcarConcluido.mutate(item.id);
  };

  const renderViewer = () => {
    if (!item) return null;

    switch (item.tipo) {
      case 'video':
        return (
          <VideoViewer
            url={item.conteudo_url ?? ''}
            onPlay={() => marcarEmAndamento.mutate(item.id)}
          />
        );
      case 'audio':
        return (
          <AudioPlayer
            storagePath={item.conteudo_storage_path ?? undefined}
            url={item.conteudo_url ?? undefined}
            onPlay={() => marcarEmAndamento.mutate(item.id)}
          />
        );
      case 'podcast':
        return (
          <PodcastViewer
            url={item.conteudo_url ?? ''}
            onPlay={() => marcarEmAndamento.mutate(item.id)}
          />
        );
      case 'microtexto':
        return (
          <PdfViewer
            storagePath={item.conteudo_storage_path ?? ''}
            bucket="micro-pdfs"
            onOpen={() => marcarEmAndamento.mutate(item.id)}
          />
        );
      case 'infografico':
        return (
          <InfographicViewer
            storagePath={item.conteudo_storage_path ?? ''}
            onOpen={() => marcarEmAndamento.mutate(item.id)}
          />
        );
      case 'card':
        return (
          <CardPostItViewer
            titulo={item.titulo}
            texto={item.conteudo_texto ?? ''}
          />
        );
      case 'quiz':
        return (
          <QuizViewer
            itemId={item.id}
            notaMaxima={item.nota_maxima}
            onConcluido={() => marcarConcluido.mutate(item.id)}
          />
        );
      case 'flashcard':
        return (
          <FlashcardViewer
            storagePath={item.conteudo_storage_path ?? ''}
            onOpen={() => marcarEmAndamento.mutate(item.id)}
          />
        );
      default:
        return <p className="text-sm text-gray-400">Tipo de conteúdo não suportado.</p>;
    }
  };

  const mostrarBotaoConcluir = item && item.tipo !== 'quiz';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Navegação */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
              <button
                onClick={() => navigate('/microaprendizagem')}
                className="hover:text-[#3f0776] transition-colors"
              >
                Microaprendizagem
              </button>
              <span>/</span>
              <button
                onClick={() => navigate(`/microaprendizagem/${topicoId}`)}
                className="hover:text-[#3f0776] transition-colors"
              >
                Tópico
              </button>
              <span>/</span>
              <span className="text-gray-600 font-medium truncate max-w-xs">
                {item?.titulo ?? 'Carregando...'}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 -ml-2 mb-4"
              onClick={() => navigate(`/microaprendizagem/${topicoId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar ao tópico
            </Button>

            {item && (
              <div className="flex items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-gray-900">{item.titulo}</h1>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {TIPO_LABEL[item.tipo]}
                    </span>
                    <MicroProgressBadge status={status} size="md" />
                  </div>
                  {item.descricao_curta && (
                    <p className="text-sm text-gray-500 mt-1">{item.descricao_curta}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Viewer */}
          {isLoading ? (
            <ViewerSkeleton />
          ) : (
            <Suspense fallback={<ViewerSkeleton />}>
              {renderViewer()}
            </Suspense>
          )}

          {/* Botão de conclusão (rodapé fixo) */}
          {mostrarBotaoConcluir && (
            <div className="mt-6 flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2">
                <MicroProgressBadge status={status} size="md" />
                <span className="text-sm text-gray-600">
                  {status === 'concluido'
                    ? 'Você concluiu este conteúdo'
                    : status === 'em_andamento'
                    ? 'Em andamento'
                    : 'Não iniciado'}
                </span>
              </div>
              {status !== 'concluido' ? (
                <Button
                  className="bg-[#3f0776] hover:bg-[#643293]"
                  disabled={marcarConcluido.isPending}
                  onClick={handleConcluir}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marcar como concluído
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Concluído
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};

// Retorna URL pública para áudio (o bucket é público)
function getPublicUrl(item: { conteudo_storage_path: string | null; conteudo_url: string | null }): string {
  if (item.conteudo_url) return item.conteudo_url;
  if (!item.conteudo_storage_path) return '';
  const { data } = supabase.storage.from('micro-audio').getPublicUrl(item.conteudo_storage_path);
  return data.publicUrl;
}

export default MicroaprendizagemItem;
