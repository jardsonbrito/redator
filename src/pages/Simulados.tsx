
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
import { SimuladoCountdown } from "@/components/SimuladoCountdown";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Fortaleza';

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
      .eq('ativo', true);

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

    const simuladosComTema = (sims || []).map((s: any) => ({ ...s, tema: s.tema_id ? temasMap[s.tema_id] || null : null }));

    // Ordenar simulados baseado no status e datas (timezone Fortaleza)
    return simuladosComTema.sort((a: any, b: any) => {
      const now = dayjs().tz(TZ);
      
      const aInicio = dayjs.tz(`${a.data_inicio} ${a.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
      const aFim = dayjs.tz(`${a.data_fim} ${a.hora_fim}`, 'YYYY-MM-DD HH:mm', TZ);
      const bInicio = dayjs.tz(`${b.data_inicio} ${b.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
      const bFim = dayjs.tz(`${b.data_fim} ${b.hora_fim}`, 'YYYY-MM-DD HH:mm', TZ);
      
      const aStatus = computeSimuladoStatus(a);
      const bStatus = computeSimuladoStatus(b);
      
      // 1. Em andamento (primeiro)
      if (aStatus === 'ativo' && bStatus !== 'ativo') return -1;
      if (bStatus === 'ativo' && aStatus !== 'ativo') return 1;
      if (aStatus === 'ativo' && bStatus === 'ativo') {
        return aInicio.isBefore(bInicio) ? -1 : 1;
      }
      
      // 2. Agendados (segundo)
      if (aStatus === 'agendado' && bStatus === 'encerrado') return -1;
      if (bStatus === 'agendado' && aStatus === 'encerrado') return 1;
      if (aStatus === 'agendado' && bStatus === 'agendado') {
        return aInicio.isBefore(bInicio) ? -1 : 1;
      }
      
      // 3. Encerrados (último) - ordenados por fim desc (mais recente primeiro)
      if (aStatus === 'encerrado' && bStatus === 'encerrado') {
        return aFim.isAfter(bFim) ? -1 : 1;
      }
      
      return 0;
    });
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
      
      // Para simulado agendado, usar uma imagem placeholder ou nenhuma capa
      const coverUrl = isAgendado ? undefined : resolveSimuladoCover(simulado);
      
      // Para simulado agendado, não mostrar subtitle (frase_tematica)
      const subtitle = isAgendado ? undefined : (tema?.frase_tematica as string) || undefined;
      
      // Para badges, se for agendado dar destaque visual especial
      const badges: { label: string; tone?: BadgeTone }[] = [];
      if (!isAgendado && tema?.eixo_tematico) {
        badges.push({ label: tema.eixo_tematico as string, tone: 'primary' });
      }
      
      // Badge com destaque para agendado
      if (isAgendado) {
        badges.push({ label: info.label, tone: 'primary' }); // Azul/lilás suave
      } else {
        badges.push({ label: info.label, tone: info.tone });
      }

      // Formatação correta de datas no timezone de Fortaleza
      const meta = [];
      if (simulado.data_inicio && simulado.hora_inicio) {
        const dataInicio = dayjs.tz(`${simulado.data_inicio} ${simulado.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
        meta.push({
          icon: Calendar,
          text: `Início: ${dataInicio.format('DD/MM/YYYY')} às ${dataInicio.format('HH')}h`
        });
      }
      if (simulado.data_fim && simulado.hora_fim) {
        const dataFim = dayjs.tz(`${simulado.data_fim} ${simulado.hora_fim}`, 'YYYY-MM-DD HH:mm', TZ);
        meta.push({
          icon: Clock,
          text: `Fim: ${dataFim.format('DD/MM/YYYY')} às ${dataFim.format('HH')}h`
        });
      }

      // Para simulados agendados, renderizar layout especial
      if (isAgendado) {
        return (
          <Card key={simulado.id} className="border border-primary/20">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <h3 className="text-xl font-semibold text-primary">{simulado.titulo}</h3>
                    {badges.map((badge, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex-shrink-0">
                    <SimuladoCountdown 
                      dataInicio={simulado.data_inicio} 
                      horaInicio={simulado.hora_inicio} 
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 text-sm text-muted-foreground">
                  {meta.map((item, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <item.icon className="w-4 h-4" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      // Para simulados em andamento e encerrados, usar UnifiedCard normal
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
