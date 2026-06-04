import { useState, useEffect } from 'react';
import { Menu, X, Lock } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useTutorConversas } from '@/hooks/useTutorConversas';
import { useJarvisModeSessoes } from '@/hooks/useJarvisModeSessoes';
import { TutorSidebar } from '@/components/tutor/TutorSidebar';
import { TutorChat } from '@/components/tutor/TutorChat';
import { cn } from '@/lib/utils';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SubtabSimples {
  id:        string;
  nome:      string;
  label:     string;
  habilitada: boolean;
  ordem:     number;
}

const JARVIS_BLOQUEADO_MSG =
  'O Jarvis não está disponível no seu plano atual. Entre em contato pelo WhatsApp (85) 99216-0605 para solicitar a compra de créditos e liberar o uso.';

export default function TutorJarvis() {
  const { studentData }                                   = useStudentAuth();
  const alunoEmail                                        = studentData.email ?? '';
  const { toast }                                         = useToast();

  // Toast quando sessão é registrada automaticamente
  useEffect(() => {
    const handler = () => {
      toast({
        title: '✅ Sessão registrada',
        description: 'Sua síntese foi salva no histórico.',
        className: 'border-green-200 bg-green-50 text-green-900',
      });
    };
    window.addEventListener('jarvis-sessao-registrada', handler);
    return () => window.removeEventListener('jarvis-sessao-registrada', handler);
  }, []);
  const [activeConversationId, setActiveId]               = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen]                     = useState(false);
  const [creditosRestantes, setCreditosRestantes]         = useState<number>(0);

  const { isFeatureEnabled, isLoading: planLoading }      = usePlanFeatures(alunoEmail);
  const jarvisBloqueado                                   = !planLoading && !isFeatureEnabled('jarvis');

  const { conversas, loading, refetch, deletar } = useTutorConversas(alunoEmail);
  const modeInfo = useJarvisModeSessoes(alunoEmail);
  const [subtabs, setSubtabs]                     = useState<SubtabSimples[]>([]);
  const [activeSubtabId, setActiveSubtabId]       = useState<string | null>(null);
  const [activeSubtabLabel, setActiveSubtabLabel] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('jarvis_tutoria_subtabs')
      .select('id, nome, label, habilitada, ordem')
      .eq('habilitada', true)
      .order('ordem')
      .then(({ data }) => { if (data) setSubtabs(data as SubtabSimples[]); });
  }, []);


  const handleSelectConversa = (id: string) => {
    setActiveId(id);
    setActiveSubtabId(null);
    setActiveSubtabLabel(null);
    setSidebarOpen(false);
  };

  const handleNovaConversa = () => {
    setActiveId(null);
    setActiveSubtabId(null);
    setActiveSubtabLabel(null);
    setSidebarOpen(false);
  };

  const handleSelecionarSubtab = (subtabId: string, subtabLabel: string) => {
    setActiveId(null);
    setActiveSubtabId(subtabId);
    setActiveSubtabLabel(subtabLabel);
    setSidebarOpen(false);
  };

  const handleConversationCreated = (novoId: string) => {
    setActiveId(novoId);
    // subtabId já foi enviado na criação — mantém label para exibição, limpa o id pendente
    setActiveSubtabId(null);
    refetch();
  };

  const handleDeletar = async (id: string) => {
    await deletar(id);
    if (activeConversationId === id) setActiveId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <StudentHeader />

      {jarvisBloqueado ? (
        <div className="flex flex-1 items-center justify-center bg-slate-50 px-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <Lock className="w-6 h-6 text-slate-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-700">Jarvis indisponível</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{JARVIS_BLOQUEADO_MSG}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Overlay mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div
            className={cn(
              'absolute md:relative z-30 md:z-auto h-full transition-transform duration-200',
              'md:translate-x-0',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            )}
          >
            <TutorSidebar
              conversas={conversas}
              loading={loading}
              activeConversationId={activeConversationId}
              onSelect={handleSelectConversa}
              onNew={handleNovaConversa}
              onDeletar={handleDeletar}
              creditosRestantes={creditosRestantes}
              subtabs={subtabs.filter(s => s.habilitada)}
              activeSubtabId={activeSubtabId}
              onSelectSubtab={handleSelecionarSubtab}
              modeInfo={modeInfo}
            />
          </div>

          {/* Área principal */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Botão hamburguer — mobile */}
            <button
              className="md:hidden absolute top-3 left-3 z-10 p-2 rounded-lg bg-white border border-slate-200 shadow-sm"
              onClick={() => setSidebarOpen(v => !v)}
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <TutorChat
              alunoEmail={alunoEmail}
              conversationId={activeConversationId}
              onConversationCreated={handleConversationCreated}
              onCreditosUpdate={setCreditosRestantes}
              subtabId={activeSubtabId}
              subtabLabel={activeSubtabLabel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
