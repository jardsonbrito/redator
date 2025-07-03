import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, ClipboardCheck, Send, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuthUser } from "@/hooks/useAuthUser";

export const MinhasRedacoesUnificado = () => {
  const { user, profile } = useAuthUser();
  const [filtroTipo, setFiltroTipo] = useState<string>("todas");
  const [mostrarTodas, setMostrarTodas] = useState(false);

  // Buscar redações do usuário logado
  const { data: redacoes, isLoading } = useQuery({
    queryKey: ['redacoes-usuario', user?.id, filtroTipo],
    queryFn: async () => {
      if (!user?.id) return [];

      const redacoesData: any[] = [];

      // Buscar redações avulsas
      const { data: redacoesEnviadas } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('user_id', user.id)
        .eq('corrigida', true)
        .order('data_envio', { ascending: false });

      if (redacoesEnviadas) {
        redacoesData.push(...redacoesEnviadas.map(r => ({
          ...r,
          tipo: r.tipo_envio || 'regular',
          data: r.data_envio,
          titulo: r.frase_tematica
        })));
      }

      // Buscar redações de simulado
      const { data: redacoesSimulado } = await supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica)
        `)
        .eq('user_id', user.id)
        .eq('corrigida', true)
        .order('data_envio', { ascending: false });

      if (redacoesSimulado) {
        redacoesData.push(...redacoesSimulado.map(r => ({
          ...r,
          tipo: 'simulado',
          data: r.data_envio,
          titulo: r.simulados.titulo,
          frase_tematica: r.simulados.frase_tematica
        })));
      }

      // Buscar redações de exercício
      const { data: redacoesExercicio } = await supabase
        .from('redacoes_exercicio')
        .select('*')
        .eq('user_id', user.id)
        .eq('corrigida', true)
        .order('data_envio', { ascending: false });

      if (redacoesExercicio) {
        redacoesData.push(...redacoesExercicio.map(r => ({
          ...r,
          tipo: 'exercicio',
          data: r.data_envio,
          titulo: 'Exercício de Redação'
        })));
      }

      // Ordenar por data
      return redacoesData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    },
    enabled: !!user?.id
  });

  // Filtrar redações
  const redacoesFiltradas = redacoes?.filter(redacao => {
    if (filtroTipo === "todas") return true;
    return redacao.tipo === filtroTipo;
  }) || [];

  // Mostrar apenas as 3 mais recentes por padrão
  const redacoesExibidas = mostrarTodas ? redacoesFiltradas : redacoesFiltradas.slice(0, 3);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'simulado':
        return <ClipboardCheck className="w-4 h-4" />;
      case 'exercicio':
        return <FileText className="w-4 h-4" />;
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'simulado':
        return 'Simulado';
      case 'exercicio':
        return 'Exercício';
      case 'avulsa':
        return 'Avulsa';
      default:
        return 'Regular';
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'simulado':
        return 'bg-purple-500 text-white';
      case 'exercicio':
        return 'bg-blue-500 text-white';
      case 'avulsa':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (!user || !profile) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Carregando suas redações...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Minhas Redações
          </CardTitle>
          
          {redacoesFiltradas.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="regular">Regulares</SelectItem>
                  <SelectItem value="avulsa">Avulsas</SelectItem>
                  <SelectItem value="simulado">Simulados</SelectItem>
                  <SelectItem value="exercicio">Exercícios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {redacoesExibidas.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              {filtroTipo === "todas" 
                ? "Você ainda não possui redações corrigidas" 
                : `Nenhuma redação ${getTipoLabel(filtroTipo).toLowerCase()} encontrada`
              }
            </p>
            <p className="text-sm text-gray-400">
              As redações aparecerão aqui após serem corrigidas
            </p>
          </div>
        ) : (
          <>
            {redacoesExibidas.map((redacao) => (
              <div
                key={`${redacao.tipo}-${redacao.id}`}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary mb-1">
                      {redacao.titulo}
                    </h3>
                    {redacao.frase_tematica && (
                      <p className="text-sm text-gray-600 mb-2">
                        {redacao.frase_tematica}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getTipoBadgeColor(redacao.tipo)}>
                      {getTipoIcon(redacao.tipo)}
                      <span className="ml-1">{getTipoLabel(redacao.tipo)}</span>
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(redacao.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    {redacao.nota_total && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Nota: {redacao.nota_total}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {redacoesFiltradas.length > 3 && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setMostrarTodas(!mostrarTodas)}
                  className="flex items-center gap-2"
                >
                  {mostrarTodas ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Ver todas ({redacoesFiltradas.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};