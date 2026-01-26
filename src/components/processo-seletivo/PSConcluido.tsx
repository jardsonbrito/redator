import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Trophy, FileText, Calendar, Star, X, AlertTriangle, RotateCcw, Award, Medal, MessageSquare } from 'lucide-react';
import { Candidato, PSRedacao, ResultadoConfig } from '@/hooks/useProcessoSeletivo';
import { useCancelRedacao } from '@/hooks/useCancelRedacao';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PSConcluidoProps {
  candidato: Candidato;
  redacao?: any | null; // Usando any pois agora vem de redacoes_enviadas
  resultadoConfig?: ResultadoConfig | null;
}

export const PSConcluido: React.FC<PSConcluidoProps> = ({
  candidato,
  redacao,
  resultadoConfig
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isReverting, setIsReverting] = React.useState(false);
  const { cancelRedacaoProcessoSeletivo, loading: cancelLoading } = useCancelRedacao({
    onSuccess: () => {
      // Invalidar caches para atualizar a tela
      queryClient.invalidateQueries({ queryKey: ['ps-candidato'] });
      queryClient.invalidateQueries({ queryKey: ['ps-redacao'] });
      queryClient.invalidateQueries({ queryKey: ['processo-seletivo-participacao'] });
    }
  });

  // Verificar se a redação pode ser cancelada (não corrigida)
  const podeCancelar = redacao && !redacao.corrigida && redacao.nota_total === null;

  // Verificar se está em estado inconsistente (concluído mas sem redação)
  const estadoInconsistente = !redacao && candidato?.status === 'concluido';

  const handleCancelarEnvio = async () => {
    if (redacao?.id && candidato?.id) {
      await cancelRedacaoProcessoSeletivo(redacao.id, candidato.email_aluno, candidato.id);
    }
  };

  // Função para voltar para etapa de envio (com ou sem redação)
  const handleVoltarParaEnvio = async () => {
    if (!candidato?.id) return;

    setIsReverting(true);
    try {
      // Se tem redação, fazer soft delete (marcar como deletada)
      if (redacao?.id) {
        const { error: deleteError } = await supabase
          .from('redacoes_enviadas')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', redacao.id);

        if (deleteError) {
          console.error('Erro ao cancelar redação:', deleteError);
          throw new Error('Erro ao cancelar redação');
        }
      }

      // Reverter status do candidato
      const { error: updateError } = await supabase
        .from('ps_candidatos')
        .update({
          status: 'etapa_final_liberada',
          data_conclusao: null
        })
        .eq('id', candidato.id);

      if (updateError) throw updateError;

      // Remover flag de participação
      await supabase
        .from('profiles')
        .update({ participou_processo_seletivo: false })
        .eq('email', candidato.email_aluno);

      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['ps-candidato'] });
      queryClient.invalidateQueries({ queryKey: ['ps-redacao'] });
      queryClient.invalidateQueries({ queryKey: ['processo-seletivo-participacao'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-redacoes'] });

      toast({
        title: "Pronto para reenviar",
        description: "Você pode enviar uma nova redação agora.",
        className: "border-green-200 bg-green-50 text-green-900",
      });

    } catch (error) {
      console.error('Erro ao reverter status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível voltar para a etapa de envio. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsReverting(false);
    }
  };

  // Se resultado foi publicado, mostrar apenas o card de resultado
  if (resultadoConfig?.resultado_publicado) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />

          <CardHeader className="text-center relative">
            <div className="flex justify-center mb-2">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <Award className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl text-green-800">
              Resultado do Processo Seletivo
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 relative">
            {/* Classificação */}
            {candidato.classificacao ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-md">
                  <Trophy className={`h-6 w-6 ${
                    candidato.classificacao === 1 ? 'text-yellow-500' :
                    candidato.classificacao === 2 ? 'text-gray-400' :
                    candidato.classificacao === 3 ? 'text-orange-400' : 'text-green-600'
                  }`} />
                  <span className="text-4xl font-bold text-green-800">
                    {candidato.classificacao}º
                  </span>
                  <span className="text-green-600 font-medium">lugar</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-green-700">Aguardando classificação final</p>
              </div>
            )}

            {/* Nota */}
            {redacao?.nota_total !== null && redacao?.nota_total !== undefined && (
              <div className="text-center">
                <p className="text-sm text-green-600 mb-1">Nota obtida</p>
                <Badge variant="secondary" className="text-2xl font-bold px-4 py-2 bg-white text-green-700">
                  {redacao.nota_total} pontos
                </Badge>
              </div>
            )}

            {/* Bolsa Conquistada */}
            {candidato.bolsa_conquistada && (
              <div className="text-center py-3">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg px-6 py-3 shadow-lg">
                  <Medal className="h-6 w-6" />
                  <div className="text-left">
                    <p className="text-xs opacity-90">Você conquistou</p>
                    <p className="font-bold text-lg">{candidato.bolsa_conquistada}</p>
                  </div>
                  <Badge className="bg-white/20 text-white text-lg">
                    {candidato.percentual_bolsa}%
                  </Badge>
                </div>
              </div>
            )}

            {/* Mensagem Personalizada */}
            {candidato.mensagem_resultado && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800 mb-1">Mensagem para você:</p>
                    <p className="text-green-700 whitespace-pre-wrap">
                      {candidato.mensagem_resultado}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Data de publicação */}
            {resultadoConfig.data_publicacao && (
              <p className="text-center text-xs text-green-600">
                Resultado publicado em: {new Date(resultadoConfig.data_publicacao).toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se resultado NÃO foi publicado, mostrar tela de aguardando
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Card de Conclusão */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200/30 rounded-full translate-y-1/2 -translate-x-1/2" />

        <CardHeader className="text-center relative">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <Trophy className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-green-500 flex items-center justify-center border-4 border-white">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl text-purple-800">
            Processo Concluído!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center relative space-y-4">
          <p className="text-purple-700">
            Parabéns, <strong>{candidato.nome_aluno.split(' ')[0]}</strong>!
            Você completou todas as etapas do processo seletivo.
          </p>

          {candidato.data_conclusao && (
            <div className="flex items-center justify-center gap-2 text-purple-600">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                Concluído em: {new Date(candidato.data_conclusao).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          {/* Botão para reenviar redação (quando há redação não corrigida ou estado inconsistente) */}
          {(podeCancelar || estadoInconsistente) && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    disabled={cancelLoading || isReverting}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {estadoInconsistente ? "Voltar para enviar redação" : "Cancelar e reenviar redação"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      {estadoInconsistente ? "Voltar para etapa de envio" : "Cancelar envio da redação"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      {estadoInconsistente ? (
                        <>
                          <p>Deseja voltar para a etapa de envio da redação?</p>
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-blue-800 text-sm">
                              Parece que houve um problema no envio anterior. Ao confirmar, você poderá
                              enviar sua redação novamente.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p>Tem certeza que deseja cancelar o envio da sua redação do Processo Seletivo?</p>
                          <div className="bg-amber-50 border border-amber-200 rounded p-3">
                            <p className="text-amber-800 text-sm">
                              <strong>Atenção:</strong> Ao cancelar, você voltará para a etapa de envio da redação
                              e poderá enviar uma nova redação <strong>apenas se ainda estiver dentro da janela de tempo</strong>.
                            </p>
                          </div>
                          <p className="text-red-600 text-sm">
                            Esta ação não pode ser desfeita. A redação enviada será removida permanentemente.
                          </p>
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleVoltarParaEnvio}
                      className={estadoInconsistente ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"}
                      disabled={cancelLoading || isReverting}
                    >
                      {isReverting ? "Processando..." : (estadoInconsistente ? "Sim, voltar para envio" : "Sim, cancelar e reenviar")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo da Redação */}
      {redacao && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sua Redação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Enviada em: {new Date(redacao.data_envio).toLocaleString('pt-BR')}
              </span>
              <Badge
                variant={redacao.status === 'avaliada' ? 'default' : 'secondary'}
              >
                {redacao.status === 'avaliada' ? 'Avaliada' : 'Aguardando avaliação'}
              </Badge>
            </div>

            {redacao.status === 'avaliada' && redacao.nota_total !== null && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium text-muted-foreground">Sua Nota</span>
                </div>
                <div className="text-4xl font-bold text-primary">
                  {redacao.nota_total.toFixed(1)}
                </div>
              </div>
            )}

            {redacao.comentario && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Comentário do avaliador:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {redacao.comentario}
                </p>
              </div>
            )}

            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Ver texto da redação
              </summary>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm whitespace-pre-wrap font-mono">
                  {redacao.texto}
                </p>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Informações Finais */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="py-4 space-y-3">
          <h4 className="font-medium text-blue-800">E agora?</h4>
          <p className="text-sm text-blue-700">
            Sua redação foi registrada com sucesso e seguirá para avaliação.
          </p>
          <p className="text-sm text-blue-700">
            Para acompanhar seu desempenho, acesse o card <strong>Minhas Redações</strong>,
            onde você poderá visualizar o texto enviado e, posteriormente, a <strong>pontuação obtida</strong>.
          </p>
          <p className="text-sm text-blue-700">
            Além disso, fique atento(a) às mensagens publicadas no <strong>grupo da sua turma</strong>,
            pois será por esse canal que a equipe do Laboratório do Redator divulgará as informações
            oficiais sobre o resultado do processo seletivo e os contemplados com as bolsas de estudo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSConcluido;
