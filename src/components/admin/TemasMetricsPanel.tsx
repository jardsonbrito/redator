import { useState } from 'react';
import { useTemasMetrics, useEixoTemas, EixoMetrics, TemaDetalhado } from '@/hooks/useTemasMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCheck,
  ChevronRight,
  Calendar,
  Eye,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Formata data para exibição
function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '—';
  }
}

function formatDateShort(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    return format(parseISO(dateString), "dd/MM/yy", { locale: ptBR });
  } catch {
    return '—';
  }
}

// Cores para os eixos
const eixoColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Social': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Saúde': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'Saúde mental': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Tecnologia': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Educação': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Política': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Meio ambiente': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Economia': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Cultura': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'Trabalho': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Cidadania': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Desigualdade': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const defaultColor = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

function getEixoColor(eixo: string) {
  return eixoColorMap[eixo] || defaultColor;
}

// Componente de estatística
function StatCard({ icon: Icon, label, value, sublabel, color = 'text-gray-600' }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className={cn("text-3xl font-bold", color)}>{value}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
        </div>
        <div className={cn("p-2.5 rounded-lg bg-gray-50", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// Componente do índice de equilíbrio
function IEECard({ iee }: { iee: { valor: number; classificacao: string; descricao: string } }) {
  const configs = {
    equilibrado: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCheck },
    moderado: { color: 'text-amber-600', bg: 'bg-amber-50', icon: TrendingUp },
    desequilibrado: { color: 'text-red-500', bg: 'bg-red-50', icon: AlertTriangle },
  };
  const config = configs[iee.classificacao as keyof typeof configs] || configs.desequilibrado;

  const Icon = config.icon;
  const percentage = Math.round(iee.valor * 100);

  return (
    <div className={cn("rounded-xl p-5 border", config.bg, config.color.replace('text-', 'border-').replace('600', '200').replace('500', '200'))}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="font-semibold">Índice de Equilíbrio</span>
        </div>
        <span className="text-3xl font-bold">{percentage}%</span>
      </div>
      <p className="text-sm opacity-80">{iee.descricao}</p>
      {/* Barra de progresso */}
      <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", config.color.replace('text-', 'bg-'))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Componente da linha do eixo
function EixoRow({ eixo, maxTotal, onViewTemas }: {
  eixo: EixoMetrics;
  maxTotal: number;
  onViewTemas: (eixo: EixoMetrics) => void;
}) {
  const colors = getEixoColor(eixo.eixo);
  const barWidth = maxTotal > 0 ? (eixo.total / maxTotal) * 100 : 0;

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        colors.bg, colors.border
      )}
      onClick={() => onViewTemas(eixo)}
    >
      {/* Nome do eixo */}
      <div className="w-36 flex-shrink-0">
        <span className={cn("font-semibold", colors.text)}>{eixo.eixo}</span>
      </div>

      {/* Barra de progresso */}
      <div className="flex-1 h-8 bg-white/60 rounded-lg overflow-hidden relative">
        <div
          className={cn("h-full rounded-lg transition-all duration-500", colors.text.replace('text-', 'bg-').replace('700', '200'))}
          style={{ width: `${barWidth}%` }}
        />
        <div className="absolute inset-0 flex items-center px-3">
          <span className={cn("text-sm font-medium", colors.text)}>
            {eixo.total} {eixo.total === 1 ? 'tema' : 'temas'}
          </span>
        </div>
      </div>

      {/* Percentual */}
      <div className="w-16 text-right">
        <span className={cn("text-sm font-semibold", colors.text)}>{eixo.percentual}%</span>
      </div>

      {/* Botão ver */}
      <Button
        variant="ghost"
        size="sm"
        className={cn("opacity-0 group-hover:opacity-100 transition-opacity", colors.text)}
      >
        <Eye className="h-4 w-4 mr-1" />
        Ver
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

// Modal de detalhes do eixo - agora busca os temas separadamente
function EixoDetailModal({
  eixo,
  open,
  onClose
}: {
  eixo: EixoMetrics | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: temas, isLoading, error } = useEixoTemas(open ? eixo?.eixo ?? null : null);

  if (!eixo) return null;

  const colors = getEixoColor(eixo.eixo);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className={cn("pb-4 border-b", colors.border)}>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", colors.bg)}>
              <Layers className={cn("h-5 w-5", colors.text)} />
            </div>
            <div>
              <span className={cn("text-xl", colors.text)}>{eixo.eixo}</span>
              <p className="text-sm font-normal text-gray-500 mt-0.5">
                {eixo.total} {eixo.total === 1 ? 'tema' : 'temas'} • {eixo.percentual}% do total
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Estatísticas do eixo */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={cn("p-3 rounded-lg", colors.bg)}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">Publicados</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{eixo.publicados}</p>
            </div>
            <div className={cn("p-3 rounded-lg", colors.bg)}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-gray-600">Rascunhos</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{eixo.rascunhos}</p>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Carregando temas...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center justify-center py-8 text-red-500">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Erro ao carregar temas
            </div>
          )}

          {/* Tabela de temas */}
          {temas && temas.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Frase Temática</TableHead>
                    <TableHead className="w-24 font-semibold">Status</TableHead>
                    <TableHead className="w-32 font-semibold">Publicado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {temas.map((tema) => (
                    <TableRow key={tema.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <p className="line-clamp-2">{tema.frase_tematica}</p>
                      </TableCell>
                      <TableCell>
                        {tema.status === 'publicado' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Publicado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            Rascunho
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatDateShort(tema.published_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Empty state */}
          {temas && temas.length === 0 && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              Nenhum tema encontrado neste eixo
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Últimos temas publicados
function UltimosTemasSection({ temas }: { temas: { id: string; frase_tematica: string; eixo_tematico: string; published_at: string }[] }) {
  if (temas.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          Últimos Temas Publicados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {temas.slice(0, 5).map((tema) => {
            const colors = getEixoColor(tema.eixo_tematico);
            return (
              <div
                key={tema.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-default"
                title={tema.frase_tematica}
              >
                <div className={cn("px-2 py-1 rounded text-xs font-medium flex-shrink-0", colors.bg, colors.text)}>
                  {tema.eixo_tematico}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{tema.frase_tematica}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(tema.published_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// Componente principal
export function TemasMetricsPanel() {
  const { data, isLoading, error, refetch } = useTemasMetrics();
  const [selectedEixo, setSelectedEixo] = useState<EixoMetrics | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleViewTemas = (eixo: EixoMetrics) => {
    setSelectedEixo(eixo);
    setModalOpen(true);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Erro ao carregar métricas: {error.message}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { eixos, totais, iee, ultimosTemas } = data;
  const maxTotal = Math.max(...eixos.map(e => e.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Métricas de Temas</h2>
            <p className="text-sm text-gray-500">Visão geral da distribuição por eixo temático</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total de Temas"
          value={totais.total_temas}
          color="text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Publicados"
          value={totais.total_publicados}
          color="text-green-600"
        />
        <StatCard
          icon={Clock}
          label="Rascunhos"
          value={totais.total_rascunhos}
          color="text-amber-600"
        />
        <StatCard
          icon={Layers}
          label="Eixos Temáticos"
          value={totais.total_eixos}
          sublabel={`~${totais.media_por_eixo} temas/eixo`}
          color="text-purple-600"
        />
      </div>

      {/* Índice de Equilíbrio */}
      <IEECard iee={iee} />

      {/* Grid de conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de eixos */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                Distribuição por Eixo
                <span className="text-sm font-normal text-gray-400 ml-2">
                  Clique para ver os temas
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {eixos.map((eixo) => (
                <EixoRow
                  key={eixo.eixo}
                  eixo={eixo}
                  maxTotal={maxTotal}
                  onViewTemas={handleViewTemas}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Últimos temas */}
        <div className="lg:col-span-1">
          <UltimosTemasSection temas={ultimosTemas} />
        </div>
      </div>

      {/* Modal de detalhes */}
      <EixoDetailModal
        eixo={selectedEixo}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

export default TemasMetricsPanel;
