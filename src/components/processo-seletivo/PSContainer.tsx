import React from 'react';
import { useProcessoSeletivoCandidato, CandidatoStatus } from '@/hooks/useProcessoSeletivo';
import { PSFormulario } from './PSFormulario';
import { PSAguardandoAnalise } from './PSAguardandoAnalise';
import { PSComunicado } from './PSComunicado';
import { PSReprovado } from './PSReprovado';
import { PSRedacao } from './PSRedacao';
import { PSConcluido } from './PSConcluido';
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
 */
export const PSContainer: React.FC<PSContainerProps> = ({
  userEmail,
  userId,
  userName,
  turma
}) => {
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
  } = useProcessoSeletivoCandidato(userEmail, userId, userName, turma);

  // Loading state
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
