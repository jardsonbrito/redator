import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface Alternativa {
  id: string;
  texto: string;
  correta: boolean;
  justificativa: string;
  ordem: number;
}

export interface Questao {
  id: string;
  enunciado: string;
  tentativas_max: number;
  ordem: number;
  alternativas: Alternativa[];
}

interface MicroQuizBuilderProps {
  questoes: Questao[];
  onChange: (questoes: Questao[]) => void;
}

const gerarId = () => `local_${Math.random().toString(36).slice(2)}`;

const novaAlternativa = (ordem: number): Alternativa => ({
  id: gerarId(),
  texto: '',
  correta: false,
  justificativa: '',
  ordem,
});

const novaQuestao = (ordem: number): Questao => ({
  id: gerarId(),
  enunciado: '',
  tentativas_max: 3,
  ordem,
  alternativas: [novaAlternativa(0), novaAlternativa(1), novaAlternativa(2), novaAlternativa(3)],
});

export const MicroQuizBuilder = ({ questoes, onChange }: MicroQuizBuilderProps) => {
  const [expandida, setExpandida] = useState<string | null>(questoes[0]?.id ?? null);

  const adicionarQuestao = () => {
    const nova = novaQuestao(questoes.length);
    onChange([...questoes, nova]);
    setExpandida(nova.id);
  };

  const removerQuestao = (id: string) => {
    onChange(questoes.filter(q => q.id !== id));
  };

  const atualizarQuestao = (id: string, campo: Partial<Questao>) => {
    onChange(questoes.map(q => q.id === id ? { ...q, ...campo } : q));
  };

  const adicionarAlternativa = (questaoId: string) => {
    onChange(questoes.map(q => {
      if (q.id !== questaoId) return q;
      return {
        ...q,
        alternativas: [...q.alternativas, novaAlternativa(q.alternativas.length)],
      };
    }));
  };

  const removerAlternativa = (questaoId: string, altId: string) => {
    onChange(questoes.map(q => {
      if (q.id !== questaoId) return q;
      return {
        ...q,
        alternativas: q.alternativas.filter(a => a.id !== altId),
      };
    }));
  };

  const atualizarAlternativa = (questaoId: string, altId: string, campo: Partial<Alternativa>) => {
    onChange(questoes.map(q => {
      if (q.id !== questaoId) return q;
      return {
        ...q,
        alternativas: q.alternativas.map(a => a.id === altId ? { ...a, ...campo } : a),
      };
    }));
  };

  const marcarCorreta = (questaoId: string, altId: string) => {
    // Comportamento de rádio: desmarca todas e marca apenas a escolhida
    onChange(questoes.map(q => {
      if (q.id !== questaoId) return q;
      return {
        ...q,
        alternativas: q.alternativas.map(a => ({ ...a, correta: a.id === altId })),
      };
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-gray-700">
          Questões do Quiz
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={adicionarQuestao}>
          <Plus className="w-4 h-4 mr-1" />
          Nova Questão
        </Button>
      </div>

      {questoes.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Nenhuma questão adicionada ainda.
        </p>
      )}

      {questoes.map((questao, qi) => (
        <Card key={questao.id} className="border border-gray-200">
          <CardHeader
            className="py-3 px-4 cursor-pointer flex flex-row items-center gap-2"
            onClick={() => setExpandida(expandida === questao.id ? null : questao.id)}
          >
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <span className="text-sm font-medium flex-1 truncate">
              {questao.enunciado || `Questão ${qi + 1}`}
            </span>
            <Badge variant="outline" className="text-xs shrink-0">
              {questao.alternativas.filter(a => a.correta).length} correta(s)
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-red-400 hover:text-red-600"
              onClick={(e) => { e.stopPropagation(); removerQuestao(questao.id); }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </CardHeader>

          {expandida === questao.id && (
            <CardContent className="space-y-4 pt-0 px-4 pb-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Enunciado</Label>
                <Textarea
                  value={questao.enunciado}
                  onChange={e => atualizarQuestao(questao.id, { enunciado: e.target.value })}
                  placeholder="Digite a pergunta..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-xs text-gray-600 whitespace-nowrap">
                  Tentativas máximas
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={questao.tentativas_max}
                  onChange={e => atualizarQuestao(questao.id, { tentativas_max: Number(e.target.value) })}
                  className="w-20 text-sm h-8"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-600">Alternativas</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => adicionarAlternativa(questao.id)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {questao.alternativas.map((alt, ai) => (
                  <div
                    key={alt.id}
                    className={`border rounded-lg p-3 space-y-2 transition-colors ${alt.correta ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => marcarCorreta(questao.id, alt.id)}
                        className={`mt-1 shrink-0 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border transition-colors ${
                          alt.correta
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-white text-gray-400 border-gray-200 hover:border-green-400 hover:text-green-600'
                        }`}
                        title="Marcar como resposta correta"
                      >
                        <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${alt.correta ? 'border-white' : 'border-current'}`}>
                          {alt.correta && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        Correta
                      </button>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={alt.texto}
                          onChange={e => atualizarAlternativa(questao.id, alt.id, { texto: e.target.value })}
                          placeholder={`Alternativa ${String.fromCharCode(65 + ai)}`}
                          className="text-sm h-8"
                        />
                        <Input
                          value={alt.justificativa}
                          onChange={e => atualizarAlternativa(questao.id, alt.id, { justificativa: e.target.value })}
                          placeholder="Justificativa (opcional, exibida após responder)"
                          className="text-xs h-7 text-gray-500"
                        />
                      </div>
                      {questao.alternativas.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-red-300 hover:text-red-500"
                          onClick={() => removerAlternativa(questao.id, alt.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
