import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  FileText,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import { useProcessoSeletivoAdmin } from '@/hooks/useProcessoSeletivoAdmin';
import { SecaoComPerguntas, Pergunta, TipoPergunta } from '@/hooks/useProcessoSeletivo';
import { PSSecaoEditor } from './PSSecaoEditor';
import { PSPerguntaEditor } from './PSPerguntaEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const PSFormBuilder: React.FC = () => {
  const {
    formularioAtivo,
    isLoadingFormularioAtivo,
    criarFormulario,
    atualizarFormulario,
    criarSecao,
    atualizarSecao,
    excluirSecao,
    criarPergunta,
    atualizarPergunta,
    excluirPergunta,
    isSalvandoFormulario
  } = useProcessoSeletivoAdmin();

  const [showNovoFormulario, setShowNovoFormulario] = useState(false);
  const [novoFormulario, setNovoFormulario] = useState({ titulo: '', descricao: '' });
  const [secaoExpandida, setSecaoExpandida] = useState<string | null>(null);
  const [showNovaSecao, setShowNovaSecao] = useState(false);
  const [novaSecao, setNovaSecao] = useState({ titulo: '', descricao: '' });
  const [editandoPergunta, setEditandoPergunta] = useState<{ secaoId: string; pergunta?: Pergunta } | null>(null);

  const handleCriarFormulario = () => {
    if (!novoFormulario.titulo.trim()) return;
    criarFormulario({
      titulo: novoFormulario.titulo,
      descricao: novoFormulario.descricao || undefined,
      ativo: true
    });
    setNovoFormulario({ titulo: '', descricao: '' });
    setShowNovoFormulario(false);
  };

  const handleCriarSecao = () => {
    if (!novaSecao.titulo.trim() || !formularioAtivo?.id) return;
    criarSecao({
      formularioId: formularioAtivo.id,
      titulo: novaSecao.titulo,
      descricao: novaSecao.descricao || undefined
    });
    setNovaSecao({ titulo: '', descricao: '' });
    setShowNovaSecao(false);
  };

  const handleSalvarPergunta = (dados: {
    texto: string;
    tipo: TipoPergunta;
    obrigatoria: boolean;
    opcoes?: string[];
    texto_aceite?: string;
  }) => {
    if (!editandoPergunta) return;

    if (editandoPergunta.pergunta) {
      atualizarPergunta({
        id: editandoPergunta.pergunta.id,
        ...dados
      });
    } else {
      criarPergunta({
        secaoId: editandoPergunta.secaoId,
        ...dados
      });
    }
    setEditandoPergunta(null);
  };

  if (isLoadingFormularioAtivo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não há formulário ativo, mostrar opção de criar
  if (!formularioAtivo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formulário do Processo Seletivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showNovoFormulario ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título do Formulário</Label>
                <Input
                  id="titulo"
                  value={novoFormulario.titulo}
                  onChange={(e) => setNovoFormulario({ ...novoFormulario, titulo: e.target.value })}
                  placeholder="Ex: Processo Seletivo 2025"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  value={novoFormulario.descricao}
                  onChange={(e) => setNovoFormulario({ ...novoFormulario, descricao: e.target.value })}
                  placeholder="Descrição do processo seletivo..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCriarFormulario} disabled={isSalvandoFormulario}>
                  <Save className="h-4 w-4 mr-2" />
                  Criar Formulário
                </Button>
                <Button variant="outline" onClick={() => setShowNovoFormulario(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhum formulário ativo encontrado. Crie um novo formulário para começar.
              </p>
              <Button onClick={() => setShowNovoFormulario(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Formulário
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {formularioAtivo.titulo}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formularioAtivo.ativo}
                onCheckedChange={(ativo) =>
                  atualizarFormulario({ id: formularioAtivo.id, titulo: formularioAtivo.titulo, ativo })
                }
              />
              <span className="text-sm text-muted-foreground">Ativo</span>
            </div>
          </CardTitle>
        </CardHeader>
        {formularioAtivo.descricao && (
          <CardContent>
            <p className="text-muted-foreground">{formularioAtivo.descricao}</p>
          </CardContent>
        )}
      </Card>

      {/* Lista de Seções */}
      <div className="space-y-3">
        {formularioAtivo.secoes.map((secao, index) => (
          <Card key={secao.id} className="border-l-4 border-l-primary">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 text-left flex-1"
                  onClick={() => setSecaoExpandida(secaoExpandida === secao.id ? null : secao.id)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{secao.titulo}</span>
                  <span className="text-sm text-muted-foreground">
                    ({secao.perguntas.length} pergunta{secao.perguntas.length !== 1 ? 's' : ''})
                  </span>
                  {secaoExpandida === secao.id ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Excluir esta seção e todas as perguntas?')) {
                      excluirSecao(secao.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>

            {secaoExpandida === secao.id && (
              <CardContent className="pt-0">
                {secao.descricao && (
                  <p className="text-sm text-muted-foreground mb-4">{secao.descricao}</p>
                )}

                {/* Lista de Perguntas */}
                <div className="space-y-2 mb-4">
                  {secao.perguntas.map((pergunta, pIndex) => (
                    <div
                      key={pergunta.id}
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {pIndex + 1}. {pergunta.texto}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getTipoPerguntaLabel(pergunta.tipo)}
                          {pergunta.obrigatoria && ' • Obrigatória'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditandoPergunta({ secaoId: secao.id, pergunta })}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Excluir esta pergunta?')) {
                            excluirPergunta(pergunta.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditandoPergunta({ secaoId: secao.id })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Pergunta
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Botão Adicionar Seção */}
      {showNovaSecao ? (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label htmlFor="titulo-secao">Título da Seção</Label>
              <Input
                id="titulo-secao"
                value={novaSecao.titulo}
                onChange={(e) => setNovaSecao({ ...novaSecao, titulo: e.target.value })}
                placeholder="Ex: Dados Pessoais"
              />
            </div>
            <div>
              <Label htmlFor="descricao-secao">Descrição (opcional)</Label>
              <Textarea
                id="descricao-secao"
                value={novaSecao.descricao}
                onChange={(e) => setNovaSecao({ ...novaSecao, descricao: e.target.value })}
                placeholder="Instruções para esta seção..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCriarSecao}>
                <Save className="h-4 w-4 mr-2" />
                Criar Seção
              </Button>
              <Button variant="outline" onClick={() => setShowNovaSecao(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowNovaSecao(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Seção
        </Button>
      )}

      {/* Modal de Edição de Pergunta */}
      {editandoPergunta && (
        <Dialog open={!!editandoPergunta} onOpenChange={() => setEditandoPergunta(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editandoPergunta.pergunta ? 'Editar Pergunta' : 'Nova Pergunta'}
              </DialogTitle>
            </DialogHeader>
            <PSPerguntaEditor
              pergunta={editandoPergunta.pergunta}
              onSave={handleSalvarPergunta}
              onCancel={() => setEditandoPergunta(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

function getTipoPerguntaLabel(tipo: TipoPergunta): string {
  const labels: Record<TipoPergunta, string> = {
    texto_curto: 'Texto curto',
    paragrafo: 'Parágrafo',
    multipla_escolha: 'Múltipla escolha',
    caixas_selecao: 'Caixas de seleção',
    aceite_obrigatorio: 'Aceite obrigatório'
  };
  return labels[tipo] || tipo;
}

export default PSFormBuilder;
