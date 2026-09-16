import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';
import { Pergunta, TipoPergunta } from '@/hooks/useProcessoSeletivo';

interface PSPerguntaEditorProps {
  pergunta?: Pergunta;
  onSave: (dados: {
    texto: string;
    tipo: TipoPergunta;
    obrigatoria: boolean;
    opcoes?: string[];
    texto_aceite?: string;
  }) => void;
  onCancel: () => void;
}

const TIPOS_PERGUNTA: { value: TipoPergunta; label: string; descricao: string }[] = [
  { value: 'texto_curto', label: 'Texto curto', descricao: 'Uma linha de texto' },
  { value: 'paragrafo', label: 'Parágrafo', descricao: 'Múltiplas linhas de texto' },
  { value: 'multipla_escolha', label: 'Múltipla escolha', descricao: 'Selecionar uma opção' },
  { value: 'caixas_selecao', label: 'Caixas de seleção', descricao: 'Selecionar várias opções' },
  { value: 'aceite_obrigatorio', label: 'Aceite obrigatório', descricao: 'Checkbox de concordância' },
];

export const PSPerguntaEditor: React.FC<PSPerguntaEditorProps> = ({
  pergunta,
  onSave,
  onCancel
}) => {
  const [texto, setTexto] = useState(pergunta?.texto || '');
  const [tipo, setTipo] = useState<TipoPergunta>(pergunta?.tipo || 'texto_curto');
  const [obrigatoria, setObrigatoria] = useState(pergunta?.obrigatoria ?? true);
  const [opcoes, setOpcoes] = useState<string[]>(pergunta?.opcoes || ['']);
  const [textoAceite, setTextoAceite] = useState(pergunta?.texto_aceite || '');

  const precisaOpcoes = tipo === 'multipla_escolha' || tipo === 'caixas_selecao';
  const ehAceite = tipo === 'aceite_obrigatorio';

  const handleAddOpcao = () => {
    setOpcoes([...opcoes, '']);
  };

  const handleRemoveOpcao = (index: number) => {
    if (opcoes.length <= 1) return;
    setOpcoes(opcoes.filter((_, i) => i !== index));
  };

  const handleOpcaoChange = (index: number, value: string) => {
    const novasOpcoes = [...opcoes];
    novasOpcoes[index] = value;
    setOpcoes(novasOpcoes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;

    const dados: {
      texto: string;
      tipo: TipoPergunta;
      obrigatoria: boolean;
      opcoes?: string[];
      texto_aceite?: string;
    } = {
      texto: texto.trim(),
      tipo,
      obrigatoria
    };

    if (precisaOpcoes) {
      dados.opcoes = opcoes.filter(o => o.trim());
    }

    if (ehAceite && textoAceite.trim()) {
      dados.texto_aceite = textoAceite.trim();
    }

    onSave(dados);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="texto">Texto da Pergunta *</Label>
        <Textarea
          id="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite a pergunta..."
          rows={2}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo de Resposta</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoPergunta)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_PERGUNTA.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div>
                    <span className="font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {t.descricao}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Switch
            id="obrigatoria"
            checked={obrigatoria}
            onCheckedChange={setObrigatoria}
          />
          <Label htmlFor="obrigatoria">Resposta obrigatória</Label>
        </div>
      </div>

      {/* Opções para múltipla escolha e caixas de seleção */}
      {precisaOpcoes && (
        <div className="space-y-2">
          <Label>Opções</Label>
          {opcoes.map((opcao, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={opcao}
                onChange={(e) => handleOpcaoChange(index, e.target.value)}
                placeholder={`Opção ${index + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOpcao(index)}
                disabled={opcoes.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={handleAddOpcao}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Opção
          </Button>
        </div>
      )}

      {/* Texto de aceite */}
      {ehAceite && (
        <div>
          <Label htmlFor="textoAceite">Texto do Aceite</Label>
          <Textarea
            id="textoAceite"
            value={textoAceite}
            onChange={(e) => setTextoAceite(e.target.value)}
            placeholder="Ex: Li e concordo com os termos e condições do processo seletivo."
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Este texto será exibido ao lado do checkbox que o candidato deve marcar.
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!texto.trim()}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Pergunta
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default PSPerguntaEditor;
