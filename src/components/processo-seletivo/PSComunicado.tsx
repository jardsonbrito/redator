import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Clock, ExternalLink, PartyPopper } from 'lucide-react';
import { Candidato, Comunicado } from '@/hooks/useProcessoSeletivo';

interface PSComunicadoProps {
  candidato: Candidato;
  comunicado: Comunicado | null;
}

export const PSComunicado: React.FC<PSComunicadoProps> = ({
  candidato,
  comunicado
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Card de Aprovação */}
      <Card className="border-green-200 bg-green-50/50 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Trophy className="h-10 w-10" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            Parabéns, {candidato.nome_aluno.split(' ')[0]}!
          </h2>
          <p className="opacity-90">
            Você foi aprovado na primeira etapa do processo seletivo!
          </p>
        </div>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <PartyPopper className="h-5 w-5" />
            <span className="text-sm">
              Aprovado em: {candidato.data_aprovacao
                ? new Date(candidato.data_aprovacao).toLocaleDateString('pt-BR')
                : 'Data não disponível'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comunicado */}
      {comunicado ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{comunicado.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comunicado.imagem_url && (
              <img
                src={comunicado.imagem_url}
                alt="Imagem do comunicado"
                className="w-full h-48 object-cover rounded-lg"
              />
            )}

            {comunicado.descricao && (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {comunicado.descricao}
                </p>
              </div>
            )}

            {(comunicado.data_evento || comunicado.hora_evento) && (
              <div className="flex flex-wrap gap-4 pt-2">
                {comunicado.data_evento && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(comunicado.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {comunicado.hora_evento && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{comunicado.hora_evento}</span>
                  </div>
                )}
              </div>
            )}

            {comunicado.link_externo && (
              <div className="pt-4">
                <Button asChild>
                  <a href={comunicado.link_externo} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Acessar Link
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Aguarde mais informações sobre as próximas etapas.
              Em breve você receberá um comunicado com os detalhes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="py-4">
          <h4 className="font-medium text-blue-800 mb-2">O que acontece agora?</h4>
          <p className="text-sm text-blue-700">
            Você foi aprovado na etapa de análise do formulário. Aguarde a liberação da
            próxima etapa do processo seletivo. Fique atento a esta página para receber
            as instruções da etapa final.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSComunicado;
