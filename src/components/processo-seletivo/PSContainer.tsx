import React, { useState } from 'react';
import { useProcessoSeletivoCandidato, useProcessosSeletivosDisponiveis, CandidatoStatus } from '@/hooks/useProcessoSeletivo';
import { PSFormulario } from './PSFormulario';
import { PSAguardandoAnalise } from './PSAguardandoAnalise';
import { PSComunicado } from './PSComunicado';
import { PSReprovado } from './PSReprovado';
import { PSRedacao } from './PSRedacao';
import { PSConcluido } from './PSConcluido';
import { PSListaProcessos } from './PSListaProcessos';
import { Loader2 } from 'lucide-react';

interface PSContainerProps {
  userEmail: string;
  userId: string;
  userName: string;
  turma: string | null;
}

/**
 * Container principal do Processo Seletivo para o aluno.
 * Renderiza a tela apropriada baseada no status do candidato.
 * Suporta múltiplos processos seletivos simultâneos.
 */
export const PSContainer: React.FC<PSContainerProps> = ({
  userEmail,
  userId,
  userName,
  turma
}) => {
  // Estado para armazenar o processo selecionado quando há múltiplos
  const [processoSelecionadoId, setProcessoSelecionadoId] = useState<string | undefined>(undefined);

  // Verificar se há múltiplos processos disponíveis
  const {
    processosDisponiveis,
    processoInscrito,
    isLoading: isLoadingProcessos,
    temMultiplosProcessos
  } = useProcessosSeletivosDisponiveis(userEmail);

  // Determinar qual ID de formulário usar
  // Prioridade: 1) Processo onde já está inscrito, 2) Processo selecionado, 3) Único processo disponível
  const formularioIdEfetivo = processoInscrito?.id || processoSelecionadoId ||
    (processosDisponiveis.length === 1 ? processosDisponiveis[0]?.id : undefined);

  const {
    formulario,
    candidato,
    comunicado,
    etapaFinal,
    redacao,
    resultadoConfig,
    isLoading,
    isLoadingComunicado,
    isLoadingEtapaFinal,
    isLoadingResultado,
    enviarFormulario,
    enviarRedacao,
    isEnviandoFormulario,
    isEnviandoRedacao,
    verificarJanelaEtapaFinal
  } = useProcessoSeletivoCandidato(userEmail, userId, userName, turma, formularioIdEfetivo);

  // Loading inicial para verificar processos
  if (isLoadingProcessos) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando processos seletivos...</p>
      </div>
    );
  }

  // Se há múltiplos processos e o usuário ainda não está inscrito em nenhum e não selecionou um
  if (temMultiplosProcessos && !processoSelecionadoId) {
    return (
      <PSListaProcessos
        processos={processosDisponiveis}
        onSelectProcesso={setProcessoSelecionadoId}
      />
    );
  }

  // Loading state do formulário específico
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando processo seletivo...</p>
      </div>
    );
  }

  // Sem formulário ativo
  if (!formulario) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Processo Seletivo</h2>
        <p className="text-muted-foreground">
          Nenhum processo seletivo ativo no momento. Aguarde novas oportunidades.
        </p>
      </div>
    );
  }

  // Determinar qual tela mostrar baseado no status do candidato
  const status: CandidatoStatus = candidato?.status || 'nao_inscrito';

  switch (status) {
    case 'nao_inscrito':
      // Candidato ainda não se inscreveu - mostrar formulário
      return (
        <PSFormulario
          formulario={formulario}
          onSubmit={enviarFormulario}
          isSubmitting={isEnviandoFormulario}
        />
      );

    case 'formulario_enviado':
      // Aguardando análise do admin
      return (
        <PSAguardandoAnalise
          candidato={candidato!}
          formularioTitulo={formulario.titulo}
        />
      );

    case 'aprovado_etapa2':
      // Aprovado na primeira etapa - mostrar comunicado
      if (isLoadingComunicado) {
        return (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
      }
      return (
        <PSComunicado
          candidato={candidato!}
          comunicado={comunicado}
        />
      );

    case 'reprovado':
      // Reprovado - mostrar mensagem
      return (
        <PSReprovado
          candidato={candidato!}
        />
      );

    case 'etapa_final_liberada':
      // Etapa final liberada - interface de redação
      if (isLoadingEtapaFinal) {
        return (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
      }
      return (
        <PSRedacao
          candidato={candidato!}
          etapaFinal={etapaFinal}
          hasSubmittedRedacao={!!redacao}
        />
      );

    case 'concluido':
      // Processo concluído
      return (
        <PSConcluido
          candidato={candidato!}
          redacao={redacao}
          resultadoConfig={resultadoConfig}
        />
      );

    default:
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            Status desconhecido. Por favor, entre em contato com o suporte.
          </p>
        </div>
      );
  }
};

export default PSContainer;
