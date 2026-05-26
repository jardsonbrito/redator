import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useTutorConversas } from '@/hooks/useTutorConversas';
import { TutorSidebar } from '@/components/tutor/TutorSidebar';
import { TutorChat } from '@/components/tutor/TutorChat';
import { cn } from '@/lib/utils';

export default function TutorJarvis() {
  const { aluno }                                = useStudentAuth();
  const alunoEmail                               = aluno?.email ?? '';
  const [activeConversationId, setActiveId]      = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen]            = useState(false);

  const { conversas, loading, refetch, arquivar } = useTutorConversas(alunoEmail);

  const handleSelectConversa = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  };

  const handleNovaConversa = () => {
    setActiveId(null);
    setSidebarOpen(false);
  };

  const handleConversationCreated = (novoId: string) => {
    setActiveId(novoId);
    refetch();
  };

  const handleArquivar = async (id: string) => {
    await arquivar(id);
    if (activeConversationId === id) setActiveId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <StudentHeader />

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Overlay mobile ───────────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ──────────────────────────────────────────────── */}
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
            onArquivar={handleArquivar}
          />
        </div>

        {/* ── Área principal ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Botão hamburguer — mobile */}
          <button
            className="md:hidden absolute top-3 left-3 z-10 p-2 rounded-lg bg-white border border-gray-200 shadow-sm"
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <TutorChat
            alunoEmail={alunoEmail}
            conversationId={activeConversationId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}
