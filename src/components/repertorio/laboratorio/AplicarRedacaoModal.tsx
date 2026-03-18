import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LaboratorioAula, LaboratorioContexto, LABORATORIO_CONTEXTO_KEY } from '@/hooks/useRepertorioLaboratorio';
import { PenLine, BookText, ChevronRight, Loader2 } from 'lucide-react';

interface Tema {
  id: string;
  frase_tematica: string;
}

interface AplicarRedacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aula: LaboratorioAula;
}

export function AplicarRedacaoModal({ open, onOpenChange, aula }: AplicarRedacaoModalProps) {
  const navigate = useNavigate();
  const temIds = aula.temas_sugeridos ?? [];

  const { data: temasSugeridos = [], isLoading: isLoadingTemas } = useQuery({
    queryKey: ['temas-laboratorio-sugeridos', temIds],
    queryFn: async (): Promise<Tema[]> => {
      if (temIds.length === 0) return [];
      const { data, error } = await supabase
        .from('temas')
        .select('id, frase_tematica')
        .in('id', temIds);
      if (error) throw error;
      // Manter a ordem definida pelo admin
      const map = new Map((data || []).map((t: Tema) => [t.id, t]));
      return temIds.map((id) => map.get(id)).filter(Boolean) as Tema[];
    },
    enabled: open && temIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

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

  const handleAplicarTema = (tema: Tema) => {
    salvarContexto({
      laboratorio_id: aula.id,
      titulo: aula.titulo,
      nome_autor: aula.nome_autor,
      obra_referencia: aula.obra_referencia,
      paragrafo_modelo: aula.paragrafo_modelo,
      tema_id: tema.id,
      frase_tematica_tema: tema.frase_tematica,
    });
    onOpenChange(false);
    navigate(`/temas/${tema.id}`);
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
          {/* Opção 1: Ir para exercícios (Produção Guiada) */}
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

          {/* Opção 2: Temas sugeridos pelo professor */}
          {temIds.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-200" />
                <span>ou pratique com um tema</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <BookText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Temas sugeridos</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Escolha um tema e escreva sua redação com o repertório já na memória.
                    </p>
                  </div>
                </div>

                {isLoadingTemas ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {temasSugeridos.map((tema) => (
                      <button
                        key={tema.id}
                        onClick={() => handleAplicarTema(tema)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="flex-1 min-w-0 line-clamp-2 leading-snug">
                          {tema.frase_tematica}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
