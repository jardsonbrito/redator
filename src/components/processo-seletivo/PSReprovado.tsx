import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, Heart } from 'lucide-react';
import { Candidato } from '@/hooks/useProcessoSeletivo';

interface PSReprovadoProps {
  candidato: Candidato;
}

export const PSReprovado: React.FC<PSReprovadoProps> = ({
  candidato
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-xl text-red-800">
            Resultado do Processo Seletivo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-red-700">
            Olá, <strong>{candidato.nome_aluno.split(' ')[0]}</strong>.
          </p>

          <p className="text-red-700">
            Infelizmente, sua inscrição não foi aprovada neste processo seletivo.
          </p>

          {candidato.motivo_reprovacao && (
            <div className="bg-white rounded-lg p-4 border border-red-200 text-left">
              <h4 className="font-medium text-red-800 mb-2">Observação:</h4>
              <p className="text-sm text-red-700 whitespace-pre-wrap">
                {candidato.motivo_reprovacao}
              </p>
            </div>
          )}

          <div className="pt-6 pb-2">
            <div className="flex justify-center mb-3">
              <Heart className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-sm text-red-600">
              Não desanime! Continue se dedicando aos seus estudos.
              Novas oportunidades surgirão no futuro.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-red-200 text-sm text-muted-foreground">
            <p>
              Se você tiver dúvidas sobre o resultado, entre em contato com nossa equipe
              através dos canais de atendimento.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSReprovado;
