import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { FormularioCompleto, Resposta, TipoPergunta } from '@/hooks/useProcessoSeletivo';

interface PSRespostasViewerProps {
  formulario: FormularioCompleto;
  respostas: Resposta[];
}

export const PSRespostasViewer: React.FC<PSRespostasViewerProps> = ({
  formulario,
  respostas
}) => {
  const getRespostaPorPergunta = (perguntaId: string): Resposta | undefined => {
    return respostas.find(r => r.pergunta_id === perguntaId);
  };

  const renderResposta = (tipo: TipoPergunta, resposta: Resposta | undefined) => {
    if (!resposta) {
      return <span className="text-muted-foreground italic">Sem resposta</span>;
    }

    switch (tipo) {
      case 'texto_curto':
      case 'paragrafo':
        return (
          <p className="text-sm whitespace-pre-wrap">
            {resposta.resposta_texto || <span className="text-muted-foreground italic">Vazio</span>}
          </p>
        );

      case 'multipla_escolha':
        return (
          <Badge variant="secondary">
            {resposta.resposta_opcao || 'Nenhuma opção selecionada'}
          </Badge>
        );

      case 'caixas_selecao':
        const opcoesSelecionadas = resposta.resposta_opcoes || [];
        if (opcoesSelecionadas.length === 0) {
          return <span className="text-muted-foreground italic">Nenhuma opção selecionada</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {opcoesSelecionadas.map((opcao, index) => (
              <Badge key={index} variant="secondary">
                {opcao}
              </Badge>
            ))}
          </div>
        );

      case 'aceite_obrigatorio':
        return resposta.aceite_confirmado ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Aceito</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            <span>Não aceito</span>
          </div>
        );

      default:
        return <span className="text-muted-foreground italic">Tipo desconhecido</span>;
    }
  };

  if (formulario.secoes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Formulário sem seções configuradas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {formulario.secoes.map((secao) => (
        <Card key={secao.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{secao.titulo}</CardTitle>
            {secao.descricao && (
              <p className="text-sm text-muted-foreground">{secao.descricao}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {secao.perguntas.map((pergunta, index) => {
                const resposta = getRespostaPorPergunta(pergunta.id);
                return (
                  <div key={pergunta.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {pergunta.texto}
                          {pergunta.obrigatoria && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </p>
                        {pergunta.tipo === 'aceite_obrigatorio' && pergunta.texto_aceite && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {pergunta.texto_aceite}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-6 bg-muted/50 rounded-lg p-3">
                      {renderResposta(pergunta.tipo, resposta)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PSRespostasViewer;
