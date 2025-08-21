
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calendar, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { computeSimuladoStatus, getSimuladoStatusInfo } from "@/utils/simuladoStatus";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UnifiedCard, UnifiedCardSkeleton, type BadgeTone } from "@/components/ui/unified-card";
import { resolveSimuladoCover } from "@/utils/coverUtils";

const Simulados = () => {
  const { studentData } = useStudentAuth();
  const navigate = useNavigate();
  
  // Determina a turma do usuário - NOMES CORRETOS DAS TURMAS (sem anos)
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma; // Usar o nome real da turma
  }

const { data: simulados, isLoading } = useQuery({
  queryKey: ['simulados', turmaCode],
  queryFn: async () => {
    let query = supabase
      .from('simulados')
      .select('*')
      .eq('ativo', true)
      .order('data_inicio', { ascending: true });

    // Filtra simulados baseado na turma do usuário
    if (turmaCode === "Visitante") {
      query = query.eq('permite_visitante', true);
    } else {
      query = query.or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`);
    }
    
    const { data: sims, error } = await query;
    if (error) throw error;

    const temaIds = Array.from(new Set((sims || []).map((s: any) => s.tema_id).filter(Boolean)));
    let temasMap: Record<string, any> = {};
    if (temaIds.length > 0) {
      const { data: temas } = await supabase
        .from('temas')
        .select('id, frase_tematica, eixo_tematico, cover_file_path, cover_url')
        .in('id', temaIds as string[]);
      temasMap = (temas || []).reduce((acc: any, t: any) => { acc[t.id] = t; return acc; }, {});
    }

    return (sims || []).map((s: any) => ({ ...s, tema: s.tema_id ? temasMap[s.tema_id] || null : null }));
  }
});

const getStatusSimulado = (simulado: any) => {
  const status = computeSimuladoStatus(simulado);
  return getSimuladoStatusInfo(status, simulado);
};

if (isLoading) {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Simulados" />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Simulados" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

{!simulados || simulados.length === 0 ? (
  <Card>
    <CardContent className="text-center py-12">
      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">
        Nenhum simulado disponível
      </h3>
      <p className="text-gray-500">
        Não há simulados disponíveis para sua turma no momento.
      </p>
    </CardContent>
  </Card>
) : (
  <div className="grid gap-4">
    {simulados.map((simulado: any) => {
      const info = getStatusSimulado(simulado);
      const status = computeSimuladoStatus(simulado);
      const isAgendado = status === 'agendado';
      const tema = simulado.tema as any | null;
      const coverUrl = resolveSimuladoCover(simulado);
      
      // Para simulado agendado, não mostrar subtitle (frase_tematica)
      const subtitle = isAgendado ? undefined : (tema?.frase_tematica as string) || undefined;
      
      // Para badges, se for agendado não incluir eixo_tematico
      const badges: { label: string; tone?: BadgeTone }[] = [];
      if (!isAgendado && tema?.eixo_tematico) {
        badges.push({ label: tema.eixo_tematico as string, tone: 'primary' });
      }
      badges.push({ label: info.label, tone: info.tone });

      // Adicionar meta com as datas (especialmente importante para agendados)
      const meta = [];
      if (simulado.data_inicio && simulado.hora_inicio) {
        meta.push({
          icon: Calendar,
          text: `Início: ${simulado.data_inicio} às ${simulado.hora_inicio}`
        });
      }
      if (simulado.data_fim && simulado.hora_fim) {
        meta.push({
          icon: Clock,
          text: `Fim: ${simulado.data_fim} às ${simulado.hora_fim}`
        });
      }

      return (
        <UnifiedCard
          key={simulado.id}
          variant="aluno"
          item={{
            coverUrl,
            title: simulado.titulo,
            subtitle,
            badges,
            meta: meta.length > 0 ? meta : undefined,
            cta: info.isActive ? { 
              label: 'Abrir', 
              onClick: () => navigate(`/simulados/${simulado.id}`),
              ariaLabel: `Abrir simulado ${simulado.titulo}`
            } : undefined,
            ariaLabel: `Simulado: ${simulado.titulo}`
          }}
        />
      );
    })}
  </div>
)}
      </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Simulados;
