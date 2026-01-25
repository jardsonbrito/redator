import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProcessoSeletivoAdmin } from '@/hooks/useProcessoSeletivoAdmin';

interface ProcessoSeletivoAdminContextType {
  processoSelecionadoId: string | undefined;
  setProcessoSelecionadoId: (id: string | undefined) => void;
}

const ProcessoSeletivoAdminContext = createContext<ProcessoSeletivoAdminContextType | null>(null);

interface ProcessoSeletivoAdminProviderProps {
  children: ReactNode;
}

export const ProcessoSeletivoAdminProvider: React.FC<ProcessoSeletivoAdminProviderProps> = ({ children }) => {
  const [processoSelecionadoId, setProcessoSelecionadoId] = useState<string | undefined>(undefined);

  return (
    <ProcessoSeletivoAdminContext.Provider value={{ processoSelecionadoId, setProcessoSelecionadoId }}>
      {children}
    </ProcessoSeletivoAdminContext.Provider>
  );
};

export const useProcessoSeletivoAdminContext = () => {
  const context = useContext(ProcessoSeletivoAdminContext);
  if (!context) {
    // Se não estiver dentro do provider, retorna undefined (comportamento padrão do hook)
    return { processoSelecionadoId: undefined, setProcessoSelecionadoId: () => {} };
  }
  return context;
};

/**
 * Hook wrapper que usa o contexto para obter o ID do processo selecionado.
 * Use este hook nos componentes filhos para garantir que todos usem o mesmo processo.
 */
export const useProcessoSeletivoAdminComContexto = () => {
  const { processoSelecionadoId } = useProcessoSeletivoAdminContext();
  return useProcessoSeletivoAdmin(processoSelecionadoId);
};
