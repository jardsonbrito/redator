import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, FileText } from 'lucide-react';
import { Candidato } from '@/hooks/useProcessoSeletivo';

interface PSAguardandoAnaliseProps {
  candidato: Candidato;
  formularioTitulo: string;
}

export const PSAguardandoAnalise: React.FC<PSAguardandoAnaliseProps> = ({
  candidato,
  formularioTitulo
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-10 w-10 text-yellow-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center border-2 border-white">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl text-yellow-800">
            Formulário Enviado!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-yellow-700">
            Seu formulário para o <strong>{formularioTitulo}</strong> foi enviado com sucesso
            e está aguardando análise.
          </p>

          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-3 text-left">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{candidato.nome_aluno}</p>
                <p className="text-xs text-muted-foreground">{candidato.email_aluno}</p>
              </div>
            </div>
            {candidato.data_inscricao && (
              <p className="text-xs text-muted-foreground mt-2">
                Enviado em: {new Date(candidato.data_inscricao).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          <div className="pt-4">
            <h4 className="font-medium text-yellow-800 mb-2">Próximos passos:</h4>
            <ol className="text-sm text-yellow-700 text-left space-y-2">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-yellow-200 text-yellow-800 text-xs flex items-center justify-center font-medium">
                  1
                </span>
                <span>Nossa equipe analisará seu formulário</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-yellow-200 text-yellow-800 text-xs flex items-center justify-center font-medium">
                  2
                </span>
                <span>Você receberá o resultado aqui mesmo nesta página</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-yellow-200 text-yellow-800 text-xs flex items-center justify-center font-medium">
                  3
                </span>
                <span>Se aprovado, terá acesso às próximas etapas</span>
              </li>
            </ol>
          </div>

          <p className="text-xs text-yellow-600 pt-4">
            Volte a esta página para verificar o status da sua inscrição.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSAguardandoAnalise;
