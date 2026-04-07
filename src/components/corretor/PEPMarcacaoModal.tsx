import { useState, useEffect } from 'react';
import { BookMarked, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  useAspectosPEP,
  useMarcacoesRedacao,
  useSalvarMarcacoesPEP,
  type PEPAspecto,
} from '@/hooks/usePEPMarcacoes';

// ─── Mapeamento visual das competências ──────────────────────────────────────

const COMP_CONFIG: Record<string, { label: string; cor: string; bg: string }> = {
  C1: { label: 'C1 — Norma-padrão',              cor: 'text-red-700',    bg: 'bg-red-50 border-red-200'    },
  C2: { label: 'C2 — Tema e repertório',          cor: 'text-green-700',  bg: 'bg-green-50 border-green-200'  },
  C3: { label: 'C3 — Organização e argumentação', cor: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200'   },
  C4: { label: 'C4 — Coesão textual',             cor: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  C5: { label: 'C5 — Proposta de intervenção',    cor: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PEPMarcacaoModalProps {
  open: boolean;
  onClose: () => void;
  redacaoId: string;
  redacaoTipo: 'regular' | 'simulado' | 'exercicio';
  alunoEmail: string;
  corretorEmail: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function PEPMarcacaoModal({
  open,
  onClose,
  redacaoId,
  redacaoTipo,
  alunoEmail,
  corretorEmail,
}: PEPMarcacaoModalProps) {
  const { data: aspectos = [], isLoading: loadAspectos } = useAspectosPEP();
  const { data: marcacoesExistentes = [], isLoading: loadMarcacoes } = useMarcacoesRedacao(
    open ? redacaoId : undefined
  );
  const { mutate: salvar, isPending: salvando } = useSalvarMarcacoesPEP();

  // Conjunto de aspecto_ids marcados
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Carrega marcações já existentes ao abrir
  useEffect(() => {
    if (!loadMarcacoes && marcacoesExistentes.length > 0) {
      setSelecionados(new Set(marcacoesExistentes.map(m => m.aspecto_id)));
    }
  }, [loadMarcacoes, marcacoesExistentes]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) setSelecionados(new Set());
  }, [open]);

  const toggle = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSalvar = () => {
    salvar(
      {
        alunoEmail,
        redacaoId,
        redacaoTipo,
        corretorEmail,
        aspectosSelecionados: Array.from(selecionados),
        aspectosTodos: aspectos,
      },
      { onSuccess: onClose }
    );
  };

  // Agrupa aspectos por competência
  const porCompetencia = (['C1', 'C2', 'C3', 'C4', 'C5'] as const).map(c => ({
    comp: c,
    itens: aspectos.filter(a => a.competencia === c),
  })).filter(g => g.itens.length > 0);

  const totalMarcados = selecionados.size;
  const isLoading = loadAspectos || loadMarcacoes;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#3f0776]">
            <BookMarked className="w-5 h-5" />
            Plano de Estudo — Marcação de Aspectos
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            Marque os aspectos que precisam de atenção nesta redação.
            Essas informações alimentam o plano personalizado do aluno.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando aspectos…</span>
          </div>
        ) : porCompetencia.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            Nenhum aspecto cadastrado ainda. Acesse Admin → Plano de Estudo → Aspectos para adicionar.
          </p>
        ) : (
          <div className="space-y-4 mt-2">
            {porCompetencia.map(({ comp, itens }) => {
              const cfg = COMP_CONFIG[comp];
              const marcadosNaComp = itens.filter(a => selecionados.has(a.id)).length;
              return (
                <div key={comp} className={`rounded-xl border p-3 ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${cfg.cor}`}>
                      {cfg.label}
                    </span>
                    {marcadosNaComp > 0 && (
                      <Badge className="text-[10px] bg-white/80 text-gray-700 border border-gray-200">
                        {marcadosNaComp} marcado{marcadosNaComp > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {itens.map(aspecto => (
                      <label
                        key={aspecto.id}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <Checkbox
                          checked={selecionados.has(aspecto.id)}
                          onCheckedChange={() => toggle(aspecto.id)}
                          className="data-[state=checked]:bg-[#3f0776] data-[state=checked]:border-[#3f0776]"
                        />
                        <span className="text-sm text-gray-800 group-hover:text-[#3f0776] transition-colors">
                          {aspecto.nome}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-2 border-t mt-2">
          <span className="text-xs text-gray-400">
            {totalMarcados === 0 ? 'Nenhum aspecto marcado' : `${totalMarcados} aspecto${totalMarcados > 1 ? 's' : ''} marcado${totalMarcados > 1 ? 's' : ''}`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvar}
              disabled={salvando || isLoading}
              className="bg-[#3f0776] hover:bg-[#5a1a9e] text-white"
            >
              {salvando ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Salvando…</>
              ) : (
                <><Check className="w-3.5 h-3.5 mr-1.5" />Salvar marcações</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
