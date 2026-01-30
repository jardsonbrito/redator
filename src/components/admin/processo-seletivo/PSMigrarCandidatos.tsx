import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Award,
  GraduationCap,
  Search
} from 'lucide-react';
import { Candidato } from '@/hooks/useProcessoSeletivo';

interface PSMigrarCandidatosProps {
  candidatos: Candidato[];
  onMigracaoConcluida?: () => void;
}

const TURMAS_DESTINO = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const PLANOS_DISPONIVEIS = [
  { value: 'Liderança', label: 'Liderança', dias: 365 },
  { value: 'Lapidação', label: 'Lapidação', dias: 180 },
  { value: 'Largada', label: 'Largada', dias: 90 },
];

export const PSMigrarCandidatos: React.FC<PSMigrarCandidatosProps> = ({
  candidatos,
  onMigracaoConcluida
}) => {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [turmaDestino, setTurmaDestino] = useState<string>('');
  const [ativarPlano, setAtivarPlano] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<string>('');
  const [diasValidade, setDiasValidade] = useState<number>(30);
  const [busca, setBusca] = useState('');
  const [migrando, setMigrando] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [resultadoMigracao, setResultadoMigracao] = useState<any>(null);
  const [emailsJaMigrados, setEmailsJaMigrados] = useState<Set<string>>(new Set());

  // Buscar emails de alunos que já estão ativos no sistema (com turma definida)
  useEffect(() => {
    const buscarAlunosAtivos = async () => {
      const emailsCandidatos = candidatos
        .filter(c => c.status === 'concluido')
        .map(c => c.email_aluno.toLowerCase());

      if (emailsCandidatos.length === 0) return;

      const { data: alunosAtivos } = await supabase
        .from('profiles')
        .select('email, turma')
        .in('email', emailsCandidatos)
        .not('turma', 'is', null);

      if (alunosAtivos && alunosAtivos.length > 0) {
        const emails = new Set(alunosAtivos.map(a => a.email?.toLowerCase()).filter(Boolean));
        setEmailsJaMigrados(emails as Set<string>);
      }
    };

    buscarAlunosAtivos();
  }, [candidatos]);

  // Filtrar candidatos concluídos que ainda NÃO foram migrados (nem pelo sistema, nem manualmente)
  const candidatosElegiveis = useMemo(() => {
    return candidatos.filter(c =>
      c.status === 'concluido' &&
      !emailsJaMigrados.has(c.email_aluno.toLowerCase())
    );
  }, [candidatos, emailsJaMigrados]);

  // Aplicar filtro de busca
  const candidatosFiltrados = useMemo(() => {
    if (!busca.trim()) return candidatosElegiveis;
    const termoBusca = busca.toLowerCase();
    return candidatosElegiveis.filter(c =>
      c.nome_aluno.toLowerCase().includes(termoBusca) ||
      c.email_aluno.toLowerCase().includes(termoBusca)
    );
  }, [candidatosElegiveis, busca]);

  // Ordenar por classificação
  const candidatosOrdenados = useMemo(() => {
    return [...candidatosFiltrados].sort((a, b) => {
      if (a.classificacao && b.classificacao) {
        return a.classificacao - b.classificacao;
      }
      if (a.classificacao) return -1;
      if (b.classificacao) return 1;
      return 0;
    });
  }, [candidatosFiltrados]);

  const handleToggleSelecionado = (id: string) => {
    const novoSet = new Set(selecionados);
    if (novoSet.has(id)) {
      novoSet.delete(id);
    } else {
      novoSet.add(id);
    }
    setSelecionados(novoSet);
  };

  const handleSelecionarTodos = () => {
    if (selecionados.size === candidatosOrdenados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(candidatosOrdenados.map(c => c.id)));
    }
  };

  const handlePlanoChange = (plano: string) => {
    setPlanoSelecionado(plano);
    const planoInfo = PLANOS_DISPONIVEIS.find(p => p.value === plano);
    if (planoInfo) {
      setDiasValidade(planoInfo.dias);
    }
  };

  const handleMigrar = async () => {
    if (selecionados.size === 0) {
      toast.error('Selecione pelo menos um candidato');
      return;
    }
    if (!turmaDestino) {
      toast.error('Selecione a turma de destino');
      return;
    }
    if (ativarPlano && !planoSelecionado) {
      toast.error('Selecione o plano a ser ativado');
      return;
    }

    setShowConfirmacao(true);
  };

  const confirmarMigracao = async () => {
    setMigrando(true);
    setShowConfirmacao(false);

    try {
      const candidatoIds = Array.from(selecionados);

      const { data, error } = await supabase.rpc('migrar_candidatos_em_lote', {
        p_candidato_ids: candidatoIds,
        p_turma_destino: turmaDestino,
        p_ativar_plano: ativarPlano,
        p_plano: ativarPlano ? planoSelecionado : null,
        p_dias_validade: diasValidade
      });

      if (error) {
        console.error('Erro na migração:', error);
        toast.error('Erro ao migrar candidatos');
        return;
      }

      const resultado = data as { success: boolean; sucessos: number; erros: number };
      setResultadoMigracao(resultado);

      if (resultado.success) {
        toast.success(`${resultado.sucessos} candidato(s) migrado(s) com sucesso!`);
        setSelecionados(new Set());
        onMigracaoConcluida?.();
      } else {
        toast.warning(`Migração concluída com ${resultado.erros} erro(s)`);
      }

    } catch (err: any) {
      console.error('Erro ao migrar:', err);
      toast.error('Erro inesperado ao migrar candidatos');
    } finally {
      setMigrando(false);
    }
  };

  if (candidatosElegiveis.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum candidato com processo concluído para migrar.</p>
        <p className="text-sm mt-2">
          Candidatos aparecem aqui após finalizarem todas as etapas do processo seletivo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#3F0077]" />
            Migrar Candidatos Aprovados
          </h3>
          <p className="text-sm text-muted-foreground">
            Selecione os candidatos para migrar para uma turma regular
          </p>
        </div>
        <Badge variant="secondary" className="self-start">
          {candidatosElegiveis.length} candidato{candidatosElegiveis.length !== 1 ? 's' : ''} elegível{candidatosElegiveis.length !== 1 ? 'eis' : ''}
        </Badge>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Configurações de migração */}
      <div className="grid gap-4 p-4 bg-gray-50 rounded-lg border">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Turma de Destino *</Label>
            <Select value={turmaDestino} onValueChange={setTurmaDestino}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {TURMAS_DESTINO.map(turma => (
                  <SelectItem key={turma} value={turma}>
                    Turma {turma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ativarPlano"
                checked={ativarPlano}
                onCheckedChange={(checked) => setAtivarPlano(!!checked)}
              />
              <Label htmlFor="ativarPlano" className="cursor-pointer">
                Ativar plano automaticamente
              </Label>
            </div>
            {ativarPlano && (
              <Select value={planoSelecionado} onValueChange={handlePlanoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {PLANOS_DISPONIVEIS.map(plano => (
                    <SelectItem key={plano.value} value={plano.value}>
                      {plano.label} ({plano.dias} dias)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {ativarPlano && planoSelecionado && (
          <div className="space-y-2">
            <Label>Dias de Validade</Label>
            <Input
              type="number"
              min={1}
              value={diasValidade}
              onChange={(e) => setDiasValidade(parseInt(e.target.value) || 30)}
              className="w-32"
            />
          </div>
        )}
      </div>

      {/* Lista de candidatos */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selecionados.size === candidatosOrdenados.length && candidatosOrdenados.length > 0}
              onCheckedChange={handleSelecionarTodos}
            />
            <span className="text-sm font-medium">
              {selecionados.size > 0 ? `${selecionados.size} selecionado(s)` : 'Selecionar todos'}
            </span>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {candidatosOrdenados.map((candidato) => (
            <div
              key={candidato.id}
              className={`flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                selecionados.has(candidato.id) ? 'bg-purple-50' : ''
              }`}
            >
              <Checkbox
                checked={selecionados.has(candidato.id)}
                onCheckedChange={() => handleToggleSelecionado(candidato.id)}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{candidato.nome_aluno}</span>
                  {candidato.classificacao && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                      <Award className="w-3 h-3 mr-1" />
                      {candidato.classificacao}º
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {candidato.email_aluno}
                </div>
              </div>

              {candidato.bolsa_conquistada && (
                <Badge className="bg-green-100 text-green-700">
                  {candidato.bolsa_conquistada}
                  {candidato.percentual_bolsa && ` (${candidato.percentual_bolsa}%)`}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Botão de migrar */}
      <div className="flex justify-end">
        <Button
          onClick={handleMigrar}
          disabled={selecionados.size === 0 || !turmaDestino || migrando}
          className="bg-[#3F0077] hover:bg-[#662F96]"
        >
          {migrando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Migrando...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 mr-2" />
              Migrar {selecionados.size > 0 ? `(${selecionados.size})` : ''} para Turma {turmaDestino || '...'}
            </>
          )}
        </Button>
      </div>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmacao} onOpenChange={setShowConfirmacao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Migração</DialogTitle>
            <DialogDescription>
              Revise as informações antes de confirmar a migração.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Esta ação irá mover {selecionados.size} candidato(s) para a Turma {turmaDestino}.
                {ativarPlano && ` Será ativado o plano ${planoSelecionado} por ${diasValidade} dias.`}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Candidatos:</span>
                <p className="font-medium">{selecionados.size}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Turma destino:</span>
                <p className="font-medium">Turma {turmaDestino}</p>
              </div>
              {ativarPlano && (
                <>
                  <div>
                    <span className="text-muted-foreground">Plano:</span>
                    <p className="font-medium">{planoSelecionado}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Validade:</span>
                    <p className="font-medium">{diasValidade} dias</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmacao(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarMigracao}
              disabled={migrando}
              className="bg-[#3F0077] hover:bg-[#662F96]"
            >
              {migrando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Migração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Resultado */}
      <Dialog open={!!resultadoMigracao} onOpenChange={() => setResultadoMigracao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resultadoMigracao?.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              {resultadoMigracao?.success ? 'Migração Concluída' : 'Migração com Avisos'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{resultadoMigracao?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{resultadoMigracao?.sucessos || 0}</p>
                <p className="text-xs text-green-600">Sucesso</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{resultadoMigracao?.erros || 0}</p>
                <p className="text-xs text-red-600">Erros</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setResultadoMigracao(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSMigrarCandidatos;
