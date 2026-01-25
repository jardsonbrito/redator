import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ChevronDown,
  Plus,
  Check,
  Users,
  Calendar,
  Archive,
  ArchiveRestore,
  Loader2,
  Save,
  Link,
  Copy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Formulario } from '@/hooks/useProcessoSeletivo';

interface ProcessoComContagem extends Formulario {
  totalCandidatos?: number;
}

interface PSProcessoSelectorProps {
  formularios: Formulario[];
  formularioSelecionadoId: string | undefined;
  onSelectFormulario: (id: string) => void;
  onCriarFormulario: (titulo: string, descricao?: string) => Promise<Formulario | undefined>;
  onArquivarFormulario?: (id: string) => void;
  onDesarquivarFormulario?: (id: string) => void;
  isLoading?: boolean;
  isCriando?: boolean;
  candidatosPorFormulario?: Record<string, number>;
}

export const PSProcessoSelector: React.FC<PSProcessoSelectorProps> = ({
  formularios,
  formularioSelecionadoId,
  onSelectFormulario,
  onCriarFormulario,
  onArquivarFormulario,
  onDesarquivarFormulario,
  isLoading = false,
  isCriando = false,
  candidatosPorFormulario = {}
}) => {
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [novoProcesso, setNovoProcesso] = useState({ titulo: '', descricao: '' });
  const [showConfirmarArquivar, setShowConfirmarArquivar] = useState<string | null>(null);

  const formularioSelecionado = formularios.find(f => f.id === formularioSelecionadoId);

  const handleCriarProcesso = async () => {
    if (!novoProcesso.titulo.trim()) return;

    try {
      const novoFormulario = await onCriarFormulario(
        novoProcesso.titulo,
        novoProcesso.descricao || undefined
      );

      // Selecionar o novo processo automaticamente
      if (novoFormulario?.id) {
        onSelectFormulario(novoFormulario.id);
      }

      setNovoProcesso({ titulo: '', descricao: '' });
      setShowNovoProcesso(false);
    } catch (error) {
      console.error('Erro ao criar processo:', error);
    }
  };

  const handleArquivar = (id: string) => {
    if (onArquivarFormulario) {
      onArquivarFormulario(id);
    }
    setShowConfirmarArquivar(null);
  };

  const getStatusBadge = (formulario: Formulario) => {
    if (!formulario.ativo) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Arquivado</Badge>;
    }
    if (formulario.inscricoes_abertas) {
      return <Badge className="bg-green-100 text-green-700">Inscrições Abertas</Badge>;
    }
    return <Badge variant="outline" className="text-orange-600 border-orange-300">Inscrições Fechadas</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando processos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de Processo */}
      <div className="flex flex-wrap items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[280px] justify-between h-auto py-2 px-3"
            >
              <div className="flex flex-col items-start">
                <span className="text-xs text-muted-foreground">Processo Seletivo</span>
                <span className="font-medium">
                  {formularioSelecionado?.titulo || 'Selecione um processo'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[320px]">
            {formularios.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhum processo seletivo criado
              </div>
            ) : (
              formularios.map((formulario) => {
                const qtdCandidatos = candidatosPorFormulario[formulario.id] || 0;
                return (
                  <DropdownMenuItem
                    key={formulario.id}
                    onClick={() => onSelectFormulario(formulario.id)}
                    className="flex items-start gap-3 py-3 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {formulario.id === formularioSelecionadoId && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <span className={cn(
                          "font-medium truncate",
                          formulario.id === formularioSelecionadoId && "text-primary"
                        )}>
                          {formulario.titulo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(formulario)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {qtdCandidatos} candidato{qtdCandidatos !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowNovoProcesso(true)}
              className="text-primary cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Processo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status do processo selecionado */}
        {formularioSelecionado && (
          <div className="flex flex-wrap items-center gap-3">
            {getStatusBadge(formularioSelecionado)}
            {formularioSelecionado.turma_processo && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {formularioSelecionado.turma_processo}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              {candidatosPorFormulario[formularioSelecionado.id] || 0} candidatos
            </span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(formularioSelecionado.criado_em).toLocaleDateString('pt-BR')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const link = `${window.location.origin}/processo-seletivo/inscricao/${formularioSelecionado.id}`;
                navigator.clipboard.writeText(link);
                toast.success('Link de inscrição copiado!');
              }}
              className="text-[#3F0077] border-[#3F0077]/30 hover:bg-[#3F0077]/10"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copiar Link
            </Button>
            {onArquivarFormulario && formularioSelecionado.ativo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmarArquivar(formularioSelecionado.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Archive className="h-4 w-4 mr-1" />
                Arquivar
              </Button>
            )}
            {onDesarquivarFormulario && !formularioSelecionado.ativo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDesarquivarFormulario(formularioSelecionado.id)}
                className="text-muted-foreground hover:text-green-600"
              >
                <ArchiveRestore className="h-4 w-4 mr-1" />
                Reativar
              </Button>
            )}
          </div>
        )}

        {/* Botão de criar novo (quando não há processos) */}
        {formularios.length === 0 && (
          <Button
            onClick={() => setShowNovoProcesso(true)}
            className="bg-[#3F0077] hover:bg-[#662F96]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Processo
          </Button>
        )}
      </div>

      {/* Modal para criar novo processo */}
      <Dialog open={showNovoProcesso} onOpenChange={setShowNovoProcesso}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Processo Seletivo</DialogTitle>
            <DialogDescription>
              Crie um novo processo seletivo. Você poderá configurar seções e perguntas depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo-processo">Título do Processo</Label>
              <Input
                id="titulo-processo"
                value={novoProcesso.titulo}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, titulo: e.target.value })}
                placeholder="Ex: Processo Seletivo 2025.2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao-processo">Descrição (opcional)</Label>
              <Textarea
                id="descricao-processo"
                value={novoProcesso.descricao}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, descricao: e.target.value })}
                placeholder="Descrição do processo seletivo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoProcesso(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarProcesso}
              disabled={!novoProcesso.titulo.trim() || isCriando}
              className="bg-[#3F0077] hover:bg-[#662F96]"
            >
              {isCriando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Criar Processo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para arquivar */}
      <Dialog open={!!showConfirmarArquivar} onOpenChange={() => setShowConfirmarArquivar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar Processo Seletivo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja arquivar este processo? Os dados serão mantidos, mas o processo não aparecerá mais para candidatos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmarArquivar(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => showConfirmarArquivar && handleArquivar(showConfirmarArquivar)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSProcessoSelector;
