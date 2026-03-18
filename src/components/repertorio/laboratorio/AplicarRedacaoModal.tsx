import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LaboratorioAula, LaboratorioContexto, LABORATORIO_CONTEXTO_KEY } from '@/hooks/useRepertorioLaboratorio';
import { PenLine, Search, BookText, ChevronRight, Loader2 } from 'lucide-react';

interface Tema {
  id: string;
  frase_tematica: string;
  eixo_tematico?: string | null;
}

interface AplicarRedacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aula: LaboratorioAula;
}

export function AplicarRedacaoModal({ open, onOpenChange, aula }: AplicarRedacaoModalProps) {
  const navigate = useNavigate();
  const [buscaTema, setBuscaTema] = useState('');
  const [temaSelecionado, setTemaSelecionado] = useState<Tema | null>(null);

  const { data: temas = [], isLoading: isLoadingTemas } = useQuery({
    queryKey: ['temas-laboratorio-autocomplete'],
    queryFn: async (): Promise<Tema[]> => {
      const { data, error } = await supabase
        .from('temas')
        .select('id, frase_tematica, eixo_tematico')
        .eq('status', 'publicado')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Tema[];
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const temasFiltrados = useMemo(() => {
    if (!buscaTema.trim()) return temas.slice(0, 8);
    const termo = buscaTema.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return temas
      .filter((t) => {
        const frase = t.frase_tematica.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return frase.includes(termo);
      })
      .slice(0, 8);
  }, [temas, buscaTema]);

  const salvarContexto = (contexto: LaboratorioContexto) => {
    localStorage.setItem(LABORATORIO_CONTEXTO_KEY, JSON.stringify(contexto));
  };

  const handleUsarSemTema = () => {
    salvarContexto({
      laboratorio_id: aula.id,
      titulo: aula.titulo,
      nome_autor: aula.nome_autor,
      obra_referencia: aula.obra_referencia,
      paragrafo_modelo: aula.paragrafo_modelo,
    });
    onOpenChange(false);
    navigate('/exercicios');
  };

  const handleAplicarTema = () => {
    if (!temaSelecionado) return;
    salvarContexto({
      laboratorio_id: aula.id,
      titulo: aula.titulo,
      nome_autor: aula.nome_autor,
      obra_referencia: aula.obra_referencia,
      paragrafo_modelo: aula.paragrafo_modelo,
      tema_id: temaSelecionado.id,
      frase_tematica_tema: temaSelecionado.frase_tematica,
    });
    onOpenChange(false);
    navigate(`/temas/${temaSelecionado.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Aplicar em uma redação</DialogTitle>
          <DialogDescription>
            O repertório de <strong>{aula.nome_autor}</strong> será vinculado à sua redação como referência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Opção 1: Usar na minha redação (sem tema específico) */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <PenLine className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Usar na minha redação</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Vai para os exercícios de Produção Guiada com o repertório já vinculado.
                </p>
              </div>
            </div>
            <Button
              onClick={handleUsarSemTema}
              variant="outline"
              size="sm"
              className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              Ir para exercícios
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            <span>ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Opção 2: Aplicar em um tema específico */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <BookText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Aplicar em um tema</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Selecione um tema da plataforma e escreva sua redação com o repertório já na memória.
                </p>
              </div>
            </div>

            {/* Busca de temas */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar tema..."
                value={buscaTema}
                onChange={(e) => {
                  setBuscaTema(e.target.value);
                  setTemaSelecionado(null);
                }}
                className="pl-9 text-sm"
              />
            </div>

            {/* Lista de temas */}
            {isLoadingTemas ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1 rounded-md">
                {temasFiltrados.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">Nenhum tema encontrado</p>
                ) : (
                  temasFiltrados.map((tema) => (
                    <button
                      key={tema.id}
                      onClick={() => setTemaSelecionado(tema)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        temaSelecionado?.id === tema.id
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {tema.frase_tematica}
                    </button>
                  ))
                )}
              </div>
            )}

            <Button
              onClick={handleAplicarTema}
              disabled={!temaSelecionado}
              size="sm"
              className="w-full gap-2"
            >
              {temaSelecionado ? `Ir para "${temaSelecionado.frase_tematica.slice(0, 30)}..."` : 'Selecione um tema'}
              {temaSelecionado && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
