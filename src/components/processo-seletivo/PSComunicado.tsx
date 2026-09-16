import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ExternalLink } from 'lucide-react';
import { Candidato, Comunicado } from '@/hooks/useProcessoSeletivo';

interface PSComunicadoProps {
  candidato: Candidato;
  comunicado: Comunicado | null;
}

export const PSComunicado: React.FC<PSComunicadoProps> = ({
  candidato,
  comunicado
}) => {
  const primeiroNome = candidato.nome_aluno.split(' ')[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Bloco Institucional */}
      <Card className="border-green-200 bg-green-50/50 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Trophy className="h-10 w-10" />
            </div>
          </div>
          <p className="text-sm uppercase tracking-wider opacity-80 mb-2">
            Processo Seletivo
          </p>
          <h1 className="text-2xl font-bold">
            Bolsas de Estudo
          </h1>
        </div>
      </Card>

      {/* Mensagem Fixa de Parabéns */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold text-center mb-4">
            Parabéns, {primeiroNome}!
          </h2>
          <p className="text-center text-muted-foreground">
            Agora só resta a última etapa: participação na produção de uma redação,
            em data e horário que serão informados.
          </p>
        </CardContent>
      </Card>

      {/* Comunicado Dinâmico */}
      {comunicado && (comunicado.titulo || comunicado.descricao || comunicado.link_externo) ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {comunicado.titulo && (
              <h3 className="text-lg font-semibold text-center">
                {comunicado.titulo}
              </h3>
            )}

            {comunicado.descricao && (
              <p className="text-center text-muted-foreground whitespace-pre-wrap">
                {comunicado.descricao}
              </p>
            )}

            {comunicado.link_externo && (
              <div className="flex justify-center pt-2">
                <Button asChild size="lg">
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
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PSComunicado;
