import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Trophy, FileText, Calendar, Star } from 'lucide-react';
import { Candidato, PSRedacao } from '@/hooks/useProcessoSeletivo';

interface PSConcluidoProps {
  candidato: Candidato;
  redacao?: PSRedacao | null;
}

export const PSConcluido: React.FC<PSConcluidoProps> = ({
  candidato,
  redacao
}) => {
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
        <CardContent className="py-4">
          <h4 className="font-medium text-blue-800 mb-2">E agora?</h4>
          <p className="text-sm text-blue-700">
            Sua participação no processo seletivo foi registrada. Aguarde o contato
            da nossa equipe com os próximos passos. Fique atento ao seu e-mail
            (<strong>{candidato.email_aluno}</strong>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSConcluido;
