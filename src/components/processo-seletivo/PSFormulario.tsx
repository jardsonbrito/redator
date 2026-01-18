import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Send, AlertCircle, FileText } from 'lucide-react';
import { FormularioCompleto, Pergunta, TipoPergunta, Resposta } from '@/hooks/useProcessoSeletivo';
import { toast } from 'sonner';

interface PSFormularioProps {
  formulario: FormularioCompleto;
  onSubmit: (respostas: Omit<Resposta, 'id' | 'candidato_id'>[]) => void;
  isSubmitting: boolean;
}

interface RespostaLocal {
  pergunta_id: string;
  resposta_texto?: string;
  resposta_opcao?: string;
  resposta_opcoes?: string[];
  aceite_confirmado?: boolean;
}

export const PSFormulario: React.FC<PSFormularioProps> = ({
  formulario,
  onSubmit,
  isSubmitting
}) => {
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>({});
  const [secaoAtual, setSecaoAtual] = useState(0);

  const totalSecoes = formulario.secoes.length;
  const secao = formulario.secoes[secaoAtual];

  const atualizarResposta = (perguntaId: string, dados: Partial<RespostaLocal>) => {
    setRespostas(prev => ({
      ...prev,
      [perguntaId]: {
        ...prev[perguntaId],
        pergunta_id: perguntaId,
        ...dados
      }
    }));
  };

  const validarSecaoAtual = (): boolean => {
    if (!secao) return true;

    for (const pergunta of secao.perguntas) {
      if (!pergunta.obrigatoria) continue;

      const resposta = respostas[pergunta.id];
      if (!resposta) {
        toast.error(`Responda a pergunta: "${pergunta.texto.substring(0, 50)}..."`);
        return false;
      }

      switch (pergunta.tipo) {
        case 'texto_curto':
        case 'paragrafo':
          if (!resposta.resposta_texto?.trim()) {
            toast.error(`Responda a pergunta: "${pergunta.texto.substring(0, 50)}..."`);
            return false;
          }
          break;
        case 'multipla_escolha':
          if (!resposta.resposta_opcao) {
            toast.error(`Selecione uma opção para: "${pergunta.texto.substring(0, 50)}..."`);
            return false;
          }
          break;
        case 'caixas_selecao':
          if (!resposta.resposta_opcoes || resposta.resposta_opcoes.length === 0) {
            toast.error(`Selecione pelo menos uma opção para: "${pergunta.texto.substring(0, 50)}..."`);
            return false;
          }
          break;
        case 'aceite_obrigatorio':
          if (!resposta.aceite_confirmado) {
            toast.error(`Você precisa aceitar: "${pergunta.texto.substring(0, 50)}..."`);
            return false;
          }
          break;
      }
    }

    return true;
  };

  const handleProximo = () => {
    if (!validarSecaoAtual()) return;
    setSecaoAtual(prev => Math.min(prev + 1, totalSecoes - 1));
  };

  const handleAnterior = () => {
    setSecaoAtual(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    if (!validarSecaoAtual()) return;

    // Validar todas as seções
    for (const sec of formulario.secoes) {
      for (const pergunta of sec.perguntas) {
        if (!pergunta.obrigatoria) continue;
        const resposta = respostas[pergunta.id];
        if (!resposta) {
          toast.error('Por favor, preencha todas as perguntas obrigatórias.');
          return;
        }
      }
    }

    // Converter para formato de envio
    const respostasParaEnviar: Omit<Resposta, 'id' | 'candidato_id'>[] = Object.values(respostas).map(r => ({
      pergunta_id: r.pergunta_id,
      resposta_texto: r.resposta_texto || null,
      resposta_opcao: r.resposta_opcao || null,
      resposta_opcoes: r.resposta_opcoes || [],
      aceite_confirmado: r.aceite_confirmado || false
    }));

    onSubmit(respostasParaEnviar);
  };

  const renderPergunta = (pergunta: Pergunta, index: number) => {
    const resposta = respostas[pergunta.id] || {};

    return (
      <div key={pergunta.id} className="space-y-3 p-4 bg-muted/30 rounded-lg">
        <Label className="text-base font-medium">
          {index + 1}. {pergunta.texto}
          {pergunta.obrigatoria && <span className="text-destructive ml-1">*</span>}
        </Label>

        {pergunta.tipo === 'texto_curto' && (
          <Input
            value={resposta.resposta_texto || ''}
            onChange={(e) => atualizarResposta(pergunta.id, { resposta_texto: e.target.value })}
            placeholder="Digite sua resposta..."
          />
        )}

        {pergunta.tipo === 'paragrafo' && (
          <Textarea
            value={resposta.resposta_texto || ''}
            onChange={(e) => atualizarResposta(pergunta.id, { resposta_texto: e.target.value })}
            placeholder="Digite sua resposta..."
            rows={4}
          />
        )}

        {pergunta.tipo === 'multipla_escolha' && (
          <RadioGroup
            value={resposta.resposta_opcao || ''}
            onValueChange={(value) => atualizarResposta(pergunta.id, { resposta_opcao: value })}
          >
            {pergunta.opcoes.map((opcao, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={opcao} id={`${pergunta.id}-${i}`} />
                <Label htmlFor={`${pergunta.id}-${i}`} className="font-normal cursor-pointer">
                  {opcao}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {pergunta.tipo === 'caixas_selecao' && (
          <div className="space-y-2">
            {pergunta.opcoes.map((opcao, i) => {
              const selecionadas = resposta.resposta_opcoes || [];
              const checked = selecionadas.includes(opcao);

              return (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${pergunta.id}-${i}`}
                    checked={checked}
                    onCheckedChange={(isChecked) => {
                      const novasOpcoes = isChecked
                        ? [...selecionadas, opcao]
                        : selecionadas.filter(o => o !== opcao);
                      atualizarResposta(pergunta.id, { resposta_opcoes: novasOpcoes });
                    }}
                  />
                  <Label htmlFor={`${pergunta.id}-${i}`} className="font-normal cursor-pointer">
                    {opcao}
                  </Label>
                </div>
              );
            })}
          </div>
        )}

        {pergunta.tipo === 'aceite_obrigatorio' && (
          <div className="flex items-start space-x-3 p-3 border rounded-lg bg-background">
            <Checkbox
              id={pergunta.id}
              checked={resposta.aceite_confirmado || false}
              onCheckedChange={(checked) =>
                atualizarResposta(pergunta.id, { aceite_confirmado: !!checked })
              }
            />
            <Label htmlFor={pergunta.id} className="font-normal cursor-pointer leading-relaxed">
              {pergunta.texto_aceite || pergunta.texto}
            </Label>
          </div>
        )}
      </div>
    );
  };

  if (!secao) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Formulário sem seções configuradas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header do Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {formulario.titulo}
          </CardTitle>
          {formulario.descricao && (
            <CardDescription>{formulario.descricao}</CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Progresso */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Seção {secaoAtual + 1} de {totalSecoes}</span>
        <div className="flex gap-1">
          {formulario.secoes.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full transition-colors ${
                index === secaoAtual
                  ? 'bg-primary'
                  : index < secaoAtual
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Seção Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{secao.titulo}</CardTitle>
          {secao.descricao && (
            <CardDescription>{secao.descricao}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {secao.perguntas.map((pergunta, index) => renderPergunta(pergunta, index))}
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleAnterior}
          disabled={secaoAtual === 0}
        >
          Anterior
        </Button>

        {secaoAtual < totalSecoes - 1 ? (
          <Button onClick={handleProximo}>
            Próximo
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">...</span>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Formulário
              </>
            )}
          </Button>
        )}
      </div>

      {/* Aviso */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <strong>Atenção:</strong> Após o envio, você não poderá alterar suas respostas.
          Certifique-se de revisar todas as informações antes de enviar.
        </div>
      </div>
    </div>
  );
};

export default PSFormulario;
