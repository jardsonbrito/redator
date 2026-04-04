import { useState, useEffect } from 'react';
import { useJarvisTutoriaSubtabs } from '@/hooks/useJarvisTutoriaSubtabs';
import { TutoriaSubtabContent } from './TutoriaSubtabContent';
import { Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JarvisModo } from '@/hooks/useJarvisModos';

interface TutoriaViewProps {
  modo: JarvisModo;
  userEmail: string;
}

export const TutoriaView = ({ modo, userEmail }: TutoriaViewProps) => {
  const { subtabs, loading } = useJarvisTutoriaSubtabs(modo.id);
  const [subtabAtiva, setSubtabAtiva] = useState<string | null>(null);

  // Seleciona primeira subtab habilitada automaticamente
  useEffect(() => {
    if (subtabs.length > 0 && !subtabAtiva) {
      const primeiraHabilitada = subtabs.find(s => s.habilitada);
      if (primeiraHabilitada) {
        setSubtabAtiva(primeiraHabilitada.nome);
      }
    }
  }, [subtabs, subtabAtiva]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (subtabs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">Nenhuma subtab configurada para este modo</p>
      </div>
    );
  }

  const subtabAtivaObj = subtabs.find(s => s.nome === subtabAtiva);

  return (
    <div className="space-y-4">
      {/* Subtabs horizontais */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {subtabs.map((subtab) => (
          <button
            key={subtab.id}
            onClick={() => subtab.habilitada && setSubtabAtiva(subtab.nome)}
            disabled={!subtab.habilitada}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2",
              subtabAtiva === subtab.nome
                ? "bg-indigo-700 text-white"
                : subtab.habilitada
                ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {subtab.label}
            {!subtab.habilitada && <Lock className="w-3 h-3" />}
          </button>
        ))}
      </div>

      {/* Conteúdo da subtab ativa */}
      {subtabAtivaObj && (
        <TutoriaSubtabContent
          modo={modo}
          subtab={subtabAtivaObj}
          userEmail={userEmail}
        />
      )}
    </div>
  );
};
