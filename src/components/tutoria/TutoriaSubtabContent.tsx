import { useTutoriaSessao } from '@/hooks/useTutoriaSessao';
import { EtapaPreenchimento } from './EtapaPreenchimento';
import { EtapaSugestoes } from './EtapaSugestoes';
import { EtapaValidacao } from './EtapaValidacao';
import { EtapaResultado } from './EtapaResultado';
import { Loader2 } from 'lucide-react';
import type { JarvisModo } from '@/hooks/useJarvisModos';
import type { TutoriaSubtab } from '@/hooks/useJarvisTutoriaSubtabs';

interface TutoriaSubtabContentProps {
  modo: JarvisModo;
  subtab: TutoriaSubtab;
  userEmail: string;
}

export const TutoriaSubtabContent = ({ modo, subtab, userEmail }: TutoriaSubtabContentProps) => {
  const {
    sessao,
    loading,
    updateSessao,
    resetSessao,
    chamarSugestoes,
    chamarValidacao,
    chamarGeracao,
    refreshSessao
  } = useTutoriaSessao(userEmail, modo.id, subtab.nome);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">Erro ao carregar sessão</p>
      </div>
    );
  }

  // Renderiza componente baseado na etapa atual
  if (sessao.etapa_atual === 'preenchimento') {
    return (
      <EtapaPreenchimento
        subtab={subtab}
        sessao={sessao}
        updateSessao={updateSessao}
        chamarSugestoes={chamarSugestoes}
        chamarValidacao={chamarValidacao}
      />
    );
  }

  if (sessao.etapa_atual === 'sugestoes') {
    return (
      <EtapaSugestoes
        subtab={subtab}
        sessao={sessao}
        updateSessao={updateSessao}
        chamarValidacao={chamarValidacao}
      />
    );
  }

  if (sessao.etapa_atual === 'validacao') {
    return (
      <EtapaValidacao
        subtab={subtab}
        sessao={sessao}
        updateSessao={updateSessao}
        chamarGeracao={chamarGeracao}
        refreshSessao={refreshSessao}
      />
    );
  }

  if (sessao.etapa_atual === 'gerado') {
    return (
      <EtapaResultado
        subtab={subtab}
        sessao={sessao}
        resetSessao={resetSessao}
      />
    );
  }

  return null;
};
