import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Plus,
  FileText,
  Trash2,
  GripVertical,
  Save,
  Settings,
  List
} from 'lucide-react';
import { useProcessoSeletivoAdminComContexto } from '@/contexts/ProcessoSeletivoAdminContext';
import { SecaoComPerguntas, Pergunta, TipoPergunta } from '@/hooks/useProcessoSeletivo';
import { PSPerguntaEditor } from './PSPerguntaEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    isSalvandoFormulario,
    toggleInscricoes,
    isToggleInscricoes
  } = useProcessoSeletivoAdminComContexto();

  const [activeSection, setActiveSection] = useState<string>('config');
  const [showNovoFormulario, setShowNovoFormulario] = useState(false);
  const [novoFormulario, setNovoFormulario] = useState({ titulo: '', descricao: '' });
  const [showNovaSecao, setShowNovaSecao] = useState(false);
  const [novaSecao, setNovaSecao] = useState({ titulo: '', descricao: '' });
  const [editandoPergunta, setEditandoPergunta] = useState<{ secaoId: string; pergunta?: Pergunta } | null>(null);
  const [secaoSelecionada, setSecaoSelecionada] = useState<string | null>(null);

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
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Formulário do Processo Seletivo</h3>
        </div>

        {showNovoFormulario ? (
          <div className="border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do Formulário</Label>
              <Input
                id="titulo"
                value={novoFormulario.titulo}
                onChange={(e) => setNovoFormulario({ ...novoFormulario, titulo: e.target.value })}
                placeholder="Ex: Processo Seletivo 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={novoFormulario.descricao}
                onChange={(e) => setNovoFormulario({ ...novoFormulario, descricao: e.target.value })}
                placeholder="Descrição do processo seletivo..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCriarFormulario} disabled={isSalvandoFormulario} className="bg-[#3F0077] hover:bg-[#662F96]">
                <Save className="h-4 w-4 mr-2" />
                Criar Formulário
              </Button>
              <Button variant="outline" onClick={() => setShowNovoFormulario(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border border-gray-200 rounded-xl">
            <p className="text-muted-foreground mb-4">
              Nenhum formulário ativo encontrado. Crie um novo formulário para começar.
            </p>
            <Button onClick={() => setShowNovoFormulario(true)} className="bg-[#3F0077] hover:bg-[#662F96]">
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Formulário
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Construir chips de navegação dinamicamente
  const navigationChips = [
    { id: 'config', label: 'Configuração', icon: Settings },
    ...formularioAtivo.secoes.map(secao => ({
      id: secao.id,
      label: secao.titulo,
      icon: List,
      count: secao.perguntas.length
    }))
  ];

  const secaoAtual = formularioAtivo.secoes.find(s => s.id === activeSection);

  return (
    <div className="space-y-4">
      {/* Header com Chips de Navegação */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          {navigationChips.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveSection(chip.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 text-white",
                  activeSection === chip.id
                    ? "bg-[#662F96]"
                    : "bg-[#B175FF] hover:bg-[#662F96]"
                )}
              >
                <Icon className="w-4 h-4" />
                {chip.label}
                {'count' in chip && chip.count !== undefined && (
                  <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {chip.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNovaSecao(true)}
            className="border-[#662F96] text-[#662F96] hover:bg-[#662F96] hover:text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Seção
          </Button>
        </div>
      </div>

      {/* Conteúdo baseado na seção ativa */}
      {activeSection === 'config' && (
        <div className="space-y-4">
          {/* Configuração do Formulário */}
          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold">{formularioAtivo.titulo}</h3>
              </div>
              <div className="flex items-center gap-4">
                {/* Toggle de Inscrições */}
                <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
                  <Switch
                    checked={formularioAtivo.inscricoes_abertas}
                    onCheckedChange={(inscricoesAbertas) => toggleInscricoes(inscricoesAbertas)}
                    disabled={isToggleInscricoes}
                  />
                  <span className={cn(
                    "text-sm font-medium",
                    formularioAtivo.inscricoes_abertas ? "text-green-600" : "text-orange-600"
                  )}>
                    {formularioAtivo.inscricoes_abertas ? 'Inscrições Abertas' : 'Inscrições Fechadas'}
                  </span>
                </div>
                {/* Toggle Ativo */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formularioAtivo.ativo}
                    onCheckedChange={(ativo) =>
                      atualizarFormulario({ id: formularioAtivo.id, titulo: formularioAtivo.titulo, ativo })
                    }
                  />
                  <span className="text-sm text-muted-foreground">Ativo</span>
                </div>
              </div>
            </div>
            {formularioAtivo.descricao && (
              <p className="text-muted-foreground text-sm">{formularioAtivo.descricao}</p>
            )}
            {/* Explicação dos toggles */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <p><strong>Inscrições:</strong> Controla se novos candidatos podem se inscrever. Candidatos já inscritos continuam tendo acesso mesmo com inscrições fechadas.</p>
              <p className="mt-1"><strong>Ativo:</strong> Controle geral do formulário. Se desativado, o processo seletivo não aparece para ninguém.</p>
            </div>
          </div>

          {/* Resumo das Seções */}
          <div className="border border-gray-200 rounded-xl p-5">
            <h4 className="font-medium mb-4">Seções do Formulário</h4>
            <div className="space-y-2">
              {formularioAtivo.secoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma seção criada. Clique em "Nova Seção" para começar.
                </p>
              ) : (
                formularioAtivo.secoes.map((secao, index) => (
                  <div
                    key={secao.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => setActiveSection(secao.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{index + 1}. {secao.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        ({secao.perguntas.length} pergunta{secao.perguntas.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Excluir esta seção e todas as perguntas?')) {
                          excluirSecao(secao.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo de uma Seção específica */}
      {secaoAtual && (
        <div className="space-y-4">
          {/* Header da Seção */}
          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{secaoAtual.titulo}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Excluir esta seção e todas as perguntas?')) {
                    excluirSecao(secaoAtual.id);
                    setActiveSection('config');
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {secaoAtual.descricao && (
              <p className="text-sm text-muted-foreground">{secaoAtual.descricao}</p>
            )}
          </div>

          {/* Lista de Perguntas */}
          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Perguntas ({secaoAtual.perguntas.length})</h4>
              <Button
                size="sm"
                onClick={() => setEditandoPergunta({ secaoId: secaoAtual.id })}
                className="bg-[#3F0077] hover:bg-[#662F96]"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-2">
              {secaoAtual.perguntas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma pergunta nesta seção.
                </p>
              ) : (
                secaoAtual.perguntas.map((pergunta, pIndex) => (
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
                      onClick={() => setEditandoPergunta({ secaoId: secaoAtual.id, pergunta })}
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
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Seção */}
      {showNovaSecao && (
        <Dialog open={showNovaSecao} onOpenChange={setShowNovaSecao}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Seção</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo-secao">Título da Seção</Label>
                <Input
                  id="titulo-secao"
                  value={novaSecao.titulo}
                  onChange={(e) => setNovaSecao({ ...novaSecao, titulo: e.target.value })}
                  placeholder="Ex: Dados Pessoais"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao-secao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao-secao"
                  value={novaSecao.descricao}
                  onChange={(e) => setNovaSecao({ ...novaSecao, descricao: e.target.value })}
                  placeholder="Instruções para esta seção..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNovaSecao(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCriarSecao} className="bg-[#3F0077] hover:bg-[#662F96]">
                  <Save className="h-4 w-4 mr-2" />
                  Criar Seção
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
