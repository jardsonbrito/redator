import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Crown, History, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";
import { normalizeTurmaToLetter, formatTurmaDisplay, isStatusEspecial } from "@/utils/turmaUtils";
import { useTurmasAtivas } from "@/hooks/useTurmasAtivas";

// Função para obter as cores da turma
const getTurmaColors = (turmaLetter: string) => {
  const colors = {
    'A': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    'B': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'C': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    'D': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    'E': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    'N/A': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
  };
  
  return colors[turmaLetter] || colors['N/A'];
};

// Resolve nomes genéricos ("Aluno", vazio) buscando nome real na tabela profiles
const resolveGenericNames = async (
  items: Array<{ nome_aluno: string; email_aluno: string; [key: string]: any }>
) => {
  const genericItems = items.filter(
    item => !item.nome_aluno || item.nome_aluno.trim() === "Aluno" || item.nome_aluno.trim() === ""
  );

  if (genericItems.length === 0) return items;

  const emails = [...new Set(genericItems.map(item => item.email_aluno?.toLowerCase()).filter(Boolean))];
  if (emails.length === 0) return items;

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('email, nome')
    .in('email', emails)
    .eq('user_type', 'aluno');

  if (!profilesData || profilesData.length === 0) return items;

  const nomesMap: Record<string, string> = {};
  profilesData.forEach(p => {
    if (p.email && p.nome) nomesMap[p.email.toLowerCase()] = p.nome;
  });

  return items.map(item => {
    if (!item.nome_aluno || item.nome_aluno.trim() === "Aluno" || item.nome_aluno.trim() === "") {
      const nomeResolvido = nomesMap[item.email_aluno?.toLowerCase()];
      if (nomeResolvido) {
        return { ...item, nome_aluno: nomeResolvido };
      }
    }
    return item;
  });
};

interface Top5WidgetProps {
  showHeader?: boolean;
  variant?: "student" | "corretor" | "admin";
  turmaFilter?: string;
  horizontal?: boolean; // Galeria e Ranking lado a lado
  turmasPermitidas?: string[]; // Para corretor: restringe ao conjunto de turmas autorizadas
}

export const Top5Widget = ({ showHeader = true, variant = "student", turmaFilter, horizontal = false, turmasPermitidas }: Top5WidgetProps) => {
  const [selectedType, setSelectedType] = useState<"simulado" | "regular" | "avulsa">("simulado");
  const [selectedSimulado, setSelectedSimulado] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedTurma, setSelectedTurma] = useState<string>("todas");
  const [showHistorico, setShowHistorico] = useState<boolean>(false);
  const [showSimuladoHistorico, setShowSimuladoHistorico] = useState<boolean>(false);

  // Ano atual para filtrar meses
  const anoAtual = new Date().getFullYear();

  // Hooks de autenticação
  const { studentData } = useStudentAuth();
  const { user: adminUser } = useAuth();
  const { turmasDinamicas } = useTurmasAtivas();

  // Para o corretor: mostra apenas suas turmas autorizadas no seletor
  const turmasParaSelector = variant === "corretor" && turmasPermitidas && turmasPermitidas.length > 0
    ? turmasDinamicas.filter(t => turmasPermitidas.includes(t.valor))
    : turmasDinamicas;

  // Handler para seleção de simulado com log
  const handleSimuladoSelect = (simuladoId: string) => {
    console.log(`🎯 Simulado Selecionado:`, {
      id: simuladoId,
      titulo: simulados?.find(s => s.id === simuladoId)?.titulo || 'Todos'
    });
    setSelectedSimulado(simuladoId);
  };

  // Turma ativa para admin e corretor; aluno usa a própria turma
  const turmaFiltroAtivo = (variant === "admin" || variant === "corretor") && selectedTurma !== "todas"
    ? selectedTurma
    : null;

  // Corretor: filtra sempre pelas turmas autorizadas (sem selector, filtro automático)
  const turmasFiltroCorretor: string[] | null =
    variant === "corretor" && turmasPermitidas && turmasPermitidas.length > 0
      ? turmasPermitidas
      : null;

  // Helper: verifica se item.turma pertence a uma lista de turmas permitidas
  const matchesAnyTurma = (itemTurma: string | null | undefined, lista: string[]): boolean => {
    if (!itemTurma) return false;
    return lista.some(t => {
      if (itemTurma === t) return true;
      const n1 = normalizeTurmaToLetter(itemTurma);
      const n2 = normalizeTurmaToLetter(t);
      return !!(n1 && n2 && n1 === n2);
    });
  };

  // Mantém compatibilidade com código existente que usa turmaAtivaLetter
  const turmaAtivaLetter = turmaFiltroAtivo;

  // Helper: compara turma do item com o filtro selecionado
  // Suporta: nomes completos ("Redatores 2026") e letras normalizadas ("A", "LRA2025")
  const matchesTurmaFiltro = (itemTurma: string | null | undefined): boolean => {
    if (!itemTurma || !turmaFiltroAtivo) return false;
    if (itemTurma === turmaFiltroAtivo) return true;
    const n1 = normalizeTurmaToLetter(itemTurma);
    const n2 = normalizeTurmaToLetter(turmaFiltroAtivo);
    return !!(n1 && n2 && n1 === n2);
  };

  // Buscar notas 1000 para "Galeria de Honra" (filtra por turma para alunos, global para admin)
  const { data: galeria1000 } = useQuery({
    queryKey: ['galeria-honra-1000', selectedType, selectedMonth, variant, turmaFiltroAtivo, turmasFiltroCorretor, studentData?.turma],
    queryFn: async () => {
      // Determinar filtro de turma baseado no tipo de usuário
      let turmaFilterStr: string | null = null;

      if (variant === "admin" || variant === "corretor") {
        turmaFilterStr = turmaFiltroAtivo;
      } else if (variant === "student" && studentData?.turma) {
        turmaFilterStr = studentData.turma;
      }

      // Buscar TODOS os registros com nota 1000 (SEM filtro SQL de turma)
      // Faremos a filtragem client-side para suportar formatos antigos
      const enviadasQuery = supabase
        .from('redacoes_enviadas')
        .select('nome_aluno, nota_total, data_envio, email_aluno, turma')
        .eq('nota_total', 1000)
        .order('data_envio', { ascending: false });

      const simuladoQuery = supabase
        .from('redacoes_simulado')
        .select('nome_aluno, nota_total, data_envio, email_aluno, turma')
        .eq('nota_total', 1000)
        .order('data_envio', { ascending: false });

      const exercicioQuery = supabase
        .from('redacoes_exercicio')
        .select('nome_aluno, nota_total, data_envio, email_aluno, turma')
        .eq('nota_total', 1000)
        .order('data_envio', { ascending: false });

      // Executar queries
      const [enviadasRes, simuladoRes, exercicioRes] = await Promise.all([
        enviadasQuery,
        simuladoQuery,
        exercicioQuery
      ]);

      let todasNotas1000 = [
        ...(enviadasRes.data || []),
        ...(simuladoRes.data || []),
        ...(exercicioRes.data || [])
      ];

      // FILTRO CLIENT-SIDE: turma específica (direct match + normalização por letra)
      if (turmaFilterStr) {
        todasNotas1000 = todasNotas1000.filter(nota => {
          if (!nota.turma) return false;
          if (nota.turma === turmaFilterStr) return true;
          const n1 = normalizeTurmaToLetter(nota.turma);
          const n2 = normalizeTurmaToLetter(turmaFilterStr);
          return !!(n1 && n2 && n1 === n2);
        });
      } else if (turmasFiltroCorretor) {
        // Corretor "todas": restringe às suas turmas autorizadas
        todasNotas1000 = todasNotas1000.filter(nota => matchesAnyTurma(nota.turma, turmasFiltroCorretor));
      }

      if (todasNotas1000.length === 0) return null;

      // Continuar com os dados já filtrados
      let notasComTurma = todasNotas1000;
      
      // Filtrar por mês se selecionado E tipo for "regular" (mesma lógica do ranking)
      if (selectedType === "regular" && selectedMonth) {
        notasComTurma = notasComTurma.filter(nota => {
          const dataRedacao = new Date(nota.data_envio);
          const mesRedacao = dataRedacao.toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric' 
          });
          const mesCapitalizado = mesRedacao.charAt(0).toUpperCase() + mesRedacao.slice(1);
          console.log(`📅 Filtro mês: ${selectedMonth} vs ${mesCapitalizado}`, { 
            data: nota.data_envio, 
            match: mesCapitalizado === selectedMonth 
          });
          return mesCapitalizado === selectedMonth;
        });
        
        console.log(`🔍 Após filtro por mês: ${notasComTurma.length} registros`);
      }
      
      // Resolver nomes genéricos ("Aluno") buscando nome real na tabela profiles
      notasComTurma = await resolveGenericNames(notasComTurma);

      // Agrupar por aluno (usando email como chave para evitar duplicatas por nome genérico)
      const alunosUnicos = new Map();
      notasComTurma.forEach(nota => {
        const chave = nota.email_aluno?.toLowerCase() || nota.nome_aluno;
        if (!alunosUnicos.has(chave) ||
            new Date(nota.data_envio) > new Date(alunosUnicos.get(chave).data_envio)) {
          alunosUnicos.set(chave, nota);
        }
      });
      
      return {
        total: alunosUnicos.size,
        alunos: Array.from(alunosUnicos.values()).sort((a, b) => 
          new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime()
        )
      };
    }
  });

  // Buscar simulados disponíveis separados por ano
  const { data: simuladosData } = useQuery({
    queryKey: ['simulados-lista'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo, data_inicio')
        .order('data_inicio', { ascending: false });

      if (error) throw error;

      const currentYear = new Date().getFullYear();
      const simuladosAnoAtual: typeof data = [];
      const simuladosHistorico: typeof data = [];

      (data || []).forEach(simulado => {
        const ano = simulado.data_inicio ? new Date(simulado.data_inicio).getFullYear() : null;
        if (ano === currentYear) {
          simuladosAnoAtual.push(simulado);
        } else {
          simuladosHistorico.push(simulado);
        }
      });

      console.log(`📋 Simulados:`, {
        anoAtual: simuladosAnoAtual.length,
        historico: simuladosHistorico.length
      });

      return {
        anoAtual: simuladosAnoAtual,
        historico: simuladosHistorico,
        todos: data || []
      };
    }
  });

  // Simulados a serem exibidos baseado no estado de showHistorico
  const simulados = simuladosData?.anoAtual || [];
  const simuladosHistorico = simuladosData?.historico || [];

  // Buscar meses disponíveis para redações regulares
  const { data: mesesDisponiveisData } = useQuery({
    queryKey: ['meses-regulares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('data_envio')
        .in('tipo_envio', ['regular', 'exercicio'])
        .eq('corrigida', true)
        .not('nota_total', 'is', null);

      if (error) throw error;

      // Extrair meses únicos com suas datas para ordenação cronológica
      const mesesComData = new Map<string, { data: Date, ano: number }>();
      (data || []).forEach(redacao => {
        const dataRedacao = new Date(redacao.data_envio);
        const ano = dataRedacao.getFullYear();
        const mes = dataRedacao.toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric'
        });
        const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);

        // Guardar a data mais recente para cada mês
        if (!mesesComData.has(mesCapitalizado) || dataRedacao > mesesComData.get(mesCapitalizado)!.data) {
          mesesComData.set(mesCapitalizado, { data: dataRedacao, ano });
        }
      });

      // Separar em meses do ano atual e histórico
      const mesesAnoAtual: string[] = [];
      const mesesHistorico: string[] = [];
      const currentYear = new Date().getFullYear();

      Array.from(mesesComData.entries())
        .sort((a, b) => b[1].data.getTime() - a[1].data.getTime())
        .forEach(([mes, info]) => {
          if (info.ano === currentYear) {
            mesesAnoAtual.push(mes);
          } else {
            mesesHistorico.push(mes);
          }
        });

      return {
        anoAtual: mesesAnoAtual,
        historico: mesesHistorico,
        todos: [...mesesAnoAtual, ...mesesHistorico]
      };
    }
  });

  // Meses a serem exibidos baseado no estado de showHistorico
  const mesesDisponiveis = mesesDisponiveisData?.anoAtual || [];
  const mesesHistorico = mesesDisponiveisData?.historico || [];

  // Auto-selecionar o mês mais recente quando a lista de meses mudar
  useEffect(() => {
    if (mesesDisponiveisData && mesesDisponiveisData.anoAtual.length > 0 && !selectedMonth) {
      setSelectedMonth(mesesDisponiveisData.anoAtual[0]); // Primeiro mês do ano atual = mais recente
    }
  }, [mesesDisponiveisData]);

  // Buscar ranking baseado no tipo selecionado
  // ESTRATÉGIA: Todas as queries buscam dados SEM filtro SQL de turma,
  // e a filtragem é feita no CLIENT-SIDE usando normalizeTurmaToLetter().
  // Isso garante compatibilidade com formatos antigos no banco:
  // - "TURMA A", "Turma A", "turma a" → normaliza para "A"
  // - "LRA 2025", "LRB 2025" → normaliza para "A", "B"
  // - Evita problemas de case-sensitivity e formatos inconsistentes
  const { data: ranking } = useQuery({
    queryKey: ['ranking', selectedType, selectedSimulado, selectedMonth, turmaFiltroAtivo, turmasFiltroCorretor, variant, studentData?.turma],
    queryFn: async () => {
      let rankingTurmaFilter: string | null = null;

      if (variant === "admin" || variant === "corretor") {
        rankingTurmaFilter = turmaFiltroAtivo;
      } else if (variant === "student" && studentData?.turma) {
        // Aluno: filtra apenas sua turma
        const turmaLetter = normalizeTurmaToLetter(studentData.turma);
        rankingTurmaFilter = turmaLetter || null;

        console.log(`👨‍🎓 Student Ranking Filter:`, {
          email: studentData.email,
          turmaBruta: studentData.turma,
          turmaLetter: turmaLetter,
          rankingTurmaFilter: rankingTurmaFilter,
          selectedType: selectedType
        });
      }
      // Visitantes: sem filtro (rankingTurmaFilter = null)

      let processedData = [];

      if (selectedType === "simulado") {
        // Para simulados, buscar TODOS os dados (SEM filtro SQL de turma)
        // A filtragem por turma será feita no client-side para suportar formatos antigos
        const query = supabase
          .from('redacoes_simulado')
          .select(`
            nome_aluno,
            email_aluno,
            nota_total,
            data_envio,
            turma,
            id_simulado,
            simulados!inner(id, titulo)
          `)
          .not('nota_total', 'is', null)
          .eq('corrigida', true)
          .order('nota_total', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error(`❌ Erro ao buscar redações de simulado:`, error);
          throw error;
        }

        let filteredData = data || [];

        console.log(`📚 Redações de Simulado - Total bruto:`, {
          total: filteredData.length,
          sample: filteredData.slice(0, 3).map(item => ({
            nome: item.nome_aluno,
            turma: item.turma,
            idSimulado: item.id_simulado,
            simuladoObj: item.simulados,
            nota: item.nota_total
          }))
        });

        if (rankingTurmaFilter) {
          filteredData = filteredData.filter(item => {
            if (!item.turma) return false;
            if (item.turma === rankingTurmaFilter) return true;
            const n1 = normalizeTurmaToLetter(item.turma);
            const n2 = normalizeTurmaToLetter(rankingTurmaFilter);
            return !!(n1 && n2 && n1 === n2);
          });
        } else if (turmasFiltroCorretor) {
          filteredData = filteredData.filter(item => matchesAnyTurma(item.turma, turmasFiltroCorretor));
        }
        // Filtrar por simulado específico se selecionado
        if (selectedSimulado && simulados) {
          const simuladoSelecionado = simulados.find(s => s.id === selectedSimulado);

          console.log(`🎯 Filtro de Simulado Específico:`, {
            selectedSimuladoId: selectedSimulado,
            simuladoSelecionado: simuladoSelecionado,
            totalBeforeFilter: filteredData.length,
            sampleItems: filteredData.slice(0, 3).map(item => ({
              nome: item.nome_aluno,
              idSimulado: item.id_simulado,
              simuladoTitulo: item.simulados?.titulo,
              simuladoObjId: item.simulados?.id
            }))
          });

          if (simuladoSelecionado) {
            const beforeFilterCount = filteredData.length;
            filteredData = filteredData.filter(item => {
              // Comparar primeiro pelo ID (mais confiável), depois pelo título como fallback
              const matchById = item.id_simulado === selectedSimulado || item.simulados?.id === selectedSimulado;
              const matchByTitle = item.simulados?.titulo === simuladoSelecionado.titulo;
              const match = matchById || matchByTitle;

              if (!match && (item.id_simulado || item.simulados)) {
                console.log(`🔍 Simulado não corresponde:`, {
                  itemIdSimulado: item.id_simulado,
                  itemSimuladoObjId: item.simulados?.id,
                  itemTitulo: item.simulados?.titulo,
                  esperadoId: selectedSimulado,
                  esperadoTitulo: simuladoSelecionado.titulo,
                  nome: item.nome_aluno
                });
              }

              return match;
            });

            console.log(`📊 Filtro de Simulado - Resultado:`, {
              before: beforeFilterCount,
              after: filteredData.length,
              simuladoEsperadoId: selectedSimulado,
              simuladoEsperadoTitulo: simuladoSelecionado.titulo
            });
          }
        }
        
        // Transformar dados para formato esperado
        processedData = filteredData.map(item => ({
          nome_aluno: item.nome_aluno,
          nota_total: Number(item.nota_total),
          simulados: item.simulados,
          email_aluno: item.email_aluno,
          data_envio: item.data_envio,
          turma: item.turma
        }));
      } else {
        // Para regular e avulsa, usar redacoes_enviadas
        let query = supabase
          .from('redacoes_enviadas')
          .select('nome_aluno, nota_total, tipo_envio, data_envio, email_aluno, turma')
          .not('nota_total', 'is', null)
          .eq('corrigida', true);

        if (selectedType === "regular") {
          // Incluir exercícios no ranking Regular (redações de exercício são essencialmente regulares)
          query = query.in('tipo_envio', ['regular', 'exercicio']);
        } else if (selectedType === "avulsa") {
          query = query.eq('tipo_envio', 'avulsa');
        }

        const { data, error } = await query.order('nota_total', { ascending: false });

        if (error) throw error;

        let filteredData = data || [];

        if (rankingTurmaFilter) {
          filteredData = filteredData.filter(item => {
            if (!item.turma) return false;
            if (item.turma === rankingTurmaFilter) return true;
            const n1 = normalizeTurmaToLetter(item.turma);
            const n2 = normalizeTurmaToLetter(rankingTurmaFilter);
            return !!(n1 && n2 && n1 === n2);
          });
        } else if (turmasFiltroCorretor) {
          filteredData = filteredData.filter(item => matchesAnyTurma(item.turma, turmasFiltroCorretor));
        }

        // Filtrar por mês se for tipo "regular" e um mês estiver selecionado
        if (selectedType === "regular" && selectedMonth) {
          filteredData = filteredData.filter(redacao => {
            const dataRedacao = new Date(redacao.data_envio);
            const mesRedacao = dataRedacao.toLocaleDateString('pt-BR', { 
              month: 'long', 
              year: 'numeric' 
            });
            const mesCapitalizado = mesRedacao.charAt(0).toUpperCase() + mesRedacao.slice(1);
            return mesCapitalizado === selectedMonth;
          });
        }
        
        // Transformar dados para incluir turma
        processedData = filteredData.map(item => ({
          ...item,
          turma: item.turma
        }));
      }
      
      // Resolver nomes genéricos ("Aluno") buscando nome real na tabela profiles
      processedData = await resolveGenericNames(processedData);

      // Agora todas as queries já incluem o campo turma diretamente
      let processedDataComplete = processedData;

      // Log detalhado do processedData antes do agrupamento
      if (selectedType === "simulado" && selectedSimulado) {
        const alunosUnicos = [...new Set(processedDataComplete.map(item => item.nome_aluno))];
        console.log(`📊 Dados ANTES do agrupamento (${selectedType}):`, {
          totalRedacoes: processedDataComplete.length,
          alunosUnicos: alunosUnicos.length,
          listaAlunos: alunosUnicos,
          sampleRedacoes: processedDataComplete.slice(0, 10).map(item => ({
            nome: item.nome_aluno,
            email: item.email_aluno,
            nota: item.nota_total,
            corrigida: item.corrigida,
            simulado: item.simulados?.titulo
          }))
        });
      }

      // Agrupar por aluno, mantendo apenas a maior nota de cada um
      const melhoresNotasPorAluno = new Map();
      processedDataComplete.forEach(item => {
        // Agrupar por email (evita merge incorreto de alunos com nome genérico "Aluno")
        const chaveAluno = item.email_aluno?.toLowerCase() || item.nome_aluno;
        const notaAtual = Number(item.nota_total);

        if (!melhoresNotasPorAluno.has(chaveAluno)) {
          melhoresNotasPorAluno.set(chaveAluno, item);
        } else {
          const itemExistente = melhoresNotasPorAluno.get(chaveAluno);
          const notaExistente = Number(itemExistente.nota_total);

          // Se a nota atual é maior, ou igual mas mais recente, substituir
          if (notaAtual > notaExistente ||
              (notaAtual === notaExistente &&
               new Date(item.data_envio).getTime() > new Date(itemExistente.data_envio).getTime())) {
            melhoresNotasPorAluno.set(chaveAluno, item);
          }
        }
      });
      
      // Converter para array e ordenar
      const dadosOrdenados = Array.from(melhoresNotasPorAluno.values()).sort((a, b) => {
        const notaA = selectedType === "simulado" ? Number(a.nota_total) : Number(a.nota_total);
        const notaB = selectedType === "simulado" ? Number(b.nota_total) : Number(b.nota_total);
        
        // 1º critério: nota (descendente)
        if (notaB !== notaA) {
          return notaB - notaA;
        }
        
        // 2º critério: data (mais recente primeiro)
        const dataA = new Date(a.data_envio).getTime();
        const dataB = new Date(b.data_envio).getTime();
        if (dataB !== dataA) {
          return dataB - dataA;
        }
        
        // 3º critério: alfabético
        return a.nome_aluno.localeCompare(b.nome_aluno);
      });
      
      // Processar ranking com lógica de empates justos
      const rankingComPosicao: Array<{
        posicao: number;
        nome_aluno: string;
        nota_total: number;
        simulado_titulo?: string;
        data_envio?: string;
        turma?: string;
      }> = [];
      
      // Obter as 5 notas distintas mais altas
      const notasUnicas = [...new Set(dadosOrdenados.map(item => 
        selectedType === "simulado" ? Number(item.nota_total) : Number(item.nota_total)
      ))].sort((a, b) => Number(b) - Number(a));
      const top5Notas = notasUnicas.slice(0, 5);
      
      // Para cada uma das 5 notas mais altas, incluir TODOS os alunos com essa nota
      top5Notas.forEach((nota, index) => {
        const alunosComEssaNota = dadosOrdenados.filter(item => 
          (selectedType === "simulado" ? Number(item.nota_total) : Number(item.nota_total)) === nota
        );
        const posicao = index + 1;
        
        // Ordenar alunos com mesma nota por data (mais recente) e depois alfabético
        const alunosOrdenados = alunosComEssaNota.sort((a, b) => {
          const dataA = new Date(a.data_envio).getTime();
          const dataB = new Date(b.data_envio).getTime();
          if (dataB !== dataA) {
            return dataB - dataA;
          }
          return a.nome_aluno.localeCompare(b.nome_aluno);
        });
        
        alunosOrdenados.forEach(aluno => {
          rankingComPosicao.push({
            posicao: posicao,
            nome_aluno: aluno.nome_aluno,
            nota_total: selectedType === "simulado" ? Number(aluno.nota_total) : Number(aluno.nota_total),
            simulado_titulo: aluno.simulados?.titulo,
            data_envio: aluno.data_envio,
            turma: aluno.turma
          });
        });
      });
      
      // Debug final para verificar o que está sendo retornado
      console.log(`🏆 RANKING FINAL (${selectedType.toUpperCase()}):`, {
        variant: variant,
        turmaFiltro: rankingTurmaFilter || 'TODAS',
        simuladoFiltro: selectedSimulado ? simulados?.find(s => s.id === selectedSimulado)?.titulo : 'TODOS',
        totalResultados: rankingComPosicao.length,
        top5: rankingComPosicao.slice(0, 5).map(item => ({
          posicao: item.posicao,
          nome: item.nome_aluno,
          turma: item.turma,
          nota: item.nota_total,
          simulado: item.simulado_titulo
        }))
      });

      if (variant === "student" && rankingTurmaFilter) {
        console.log(`👨‍🎓 Detalhes Student (Turma ${rankingTurmaFilter}):`, {
          totalResults: rankingComPosicao.length,
          results: rankingComPosicao.map(item => ({
            posicao: item.posicao,
            nome: item.nome_aluno,
            turma: item.turma,
            nota: item.nota_total,
            turmaExtracted: normalizeTurmaToLetter(item.turma || '')
          }))
        });
      }

      return rankingComPosicao;
    }
  });

  const getPosicaoIcon = (posicao: number) => {
    switch (posicao) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <Trophy className="w-5 h-5 text-primary" />;
    }
  };

  const getCardStyles = () => {
    if (variant === "student") {
      return {
        container: "bg-white/80 backdrop-blur-sm border-0 shadow-xl",
        majorNoteCard: "mb-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20",
        majorNoteIcon: "absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full blur opacity-30",
        majorNoteIconBg: "relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg",
        majorNoteTitle: "text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent",
        majorNoteValue: "text-3xl font-bold text-primary",
        majorNoteNames: "text-lg font-medium text-secondary",
        title: "text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent",
        buttonActive: "bg-primary text-primary-foreground hover:bg-primary/90",
        buttonInactive: "bg-primary/10 border-primary/30 hover:bg-primary/20",
        buttonSecondaryActive: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        buttonSecondaryInactive: "bg-secondary/10 border-secondary/30 hover:bg-secondary/20",
        rankingItem: "flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white/50",
        rankingPosition: "text-lg font-bold text-primary",
        rankingName: "font-semibold text-secondary",
        rankingScore: "text-2xl font-bold text-primary"
      };
    } else {
      return {
        container: "",
        majorNoteCard: "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200",
        majorNoteIcon: "",
        majorNoteIconBg: "flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500 text-white",
        majorNoteTitle: "text-xl text-gray-900",
        majorNoteValue: "text-2xl font-bold text-yellow-600",
        majorNoteNames: "text-gray-700 font-medium",
        title: "text-xl",
        buttonActive: "",
        buttonInactive: "",
        buttonSecondaryActive: "",
        buttonSecondaryInactive: "",
        rankingItem: "flex items-center justify-between p-4 rounded-lg border bg-gray-50",
        rankingPosition: "text-lg font-bold text-gray-900",
        rankingName: "font-semibold text-gray-700",
        rankingScore: "text-2xl font-bold text-gray-900"
      };
    }
  };

  const styles = getCardStyles();

  const turmaSelector = variant === "admin" && turmasDinamicas.length > 0 ? (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-600 shrink-0">Turma:</span>
      <Select value={selectedTurma} onValueChange={setSelectedTurma}>
        <SelectTrigger className="w-48 h-8 text-sm">
          <SelectValue placeholder="Todas as turmas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as turmas</SelectItem>
          {turmasDinamicas.map(t => (
            <SelectItem key={t.id} value={t.valor}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  if (horizontal) {
    return (
      <div className="space-y-3">
        {turmaSelector}
        <div className="grid md:grid-cols-2 gap-4 items-start">
          {/* Galeria de Honra compacta */}
          <Card className={styles.majorNoteCard}>
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className={styles.majorNoteIconBg} style={{ width: 36, height: 36 }}>
                  <Crown className={`w-5 h-5 text-white ${!galeria1000 || galeria1000.total === 0 ? 'opacity-50' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className={`${styles.majorNoteTitle} text-base`}>Galeria de Honra</CardTitle>
                  {galeria1000 && galeria1000.total > 0 ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-lg font-bold text-yellow-600">1000</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                      <span className="text-xs text-muted-foreground">· {galeria1000.total} {galeria1000.total === 1 ? 'aluno' : 'alunos'}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Nenhum aluno ainda.</p>
                  )}
                </div>
              </div>
              {galeria1000 && galeria1000.total > 0 && (
                <div className="mt-2 space-y-0.5">
                  {galeria1000.alunos.slice(0, 4).map((aluno, index) => (
                    <div key={index} className="text-sm text-slate-700 flex items-center gap-1.5">
                      <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                      <span className="truncate">{aluno.nome_aluno}</span>
                      {(variant === "admin" || variant === "corretor") && aluno.turma && !isStatusEspecial(aluno.turma) && (
                        (() => {
                          const turmaLetter = normalizeTurmaToLetter(aluno.turma) || 'N/A';
                          const colors = getTurmaColors(turmaLetter);
                          return (
                            <span className={`shrink-0 px-1.5 py-0.5 ${colors.bg} ${colors.text} ${colors.border} border text-[10px] rounded font-medium`}>
                              {formatTurmaDisplay(aluno.turma)}
                            </span>
                          );
                        })()
                      )}
                    </div>
                  ))}
                  {galeria1000.total > 4 && (
                    <p className="text-xs text-muted-foreground pl-4">+ {galeria1000.total - 4} alunos</p>
                  )}
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Classificação Top 5 compacta */}
          <Card className={styles.container}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className={`${styles.title} text-base`}>🏅 Classificação Top 5</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {(["simulado", "regular", "avulsa"] as const).map(tipo => (
                  <Button key={tipo} variant={selectedType === tipo ? "default" : "outline"}
                    onClick={() => setSelectedType(tipo)} size="sm" className="h-7 text-xs px-2.5"
                    style={selectedType === tipo ? undefined : undefined}>
                    {tipo === "simulado" ? "Simulado" : tipo === "regular" ? "Regular" : "Visitante"}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {ranking && ranking.length > 0 ? (
                <div className="space-y-2">
                  {ranking.slice(0, 5).map((item, index) => (
                    <div key={`${item.nome_aluno}-${index}`} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {getPosicaoIcon(item.posicao)}
                        <span className="text-sm font-medium text-slate-700 truncate">{item.nome_aluno}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 shrink-0 ml-2">{item.nota_total}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Nenhuma redação corrigida ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {turmaSelector}

      {/* Galeria de Honra - 1000 pontos */}
      <Card className={styles.majorNoteCard}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative">
              {variant === "student" && (
                <div className={styles.majorNoteIcon}></div>
              )}
              <div className={styles.majorNoteIconBg}>
                <Crown className={`w-8 h-8 text-white ${!galeria1000 || galeria1000.total === 0 ? 'opacity-50' : ''}`} />
              </div>
            </div>
            <div className="flex-1">
              <CardTitle className={styles.majorNoteTitle}>
                Galeria de Honra
                {selectedType === "regular" && selectedMonth && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedMonth})
                  </span>
                )}
              </CardTitle>
              
              {galeria1000 && galeria1000.total > 0 ? (
                <>
                  <div className="mt-2">
                    <span className={styles.majorNoteValue}>1000</span>
                    <span className="text-lg text-muted-foreground ml-2">pontos</span>
                    <span className="text-sm text-muted-foreground ml-3">
                      ({galeria1000.total} {galeria1000.total === 1 ? 'aluno' : 'alunos'})
                    </span>
                  </div>
                  <div className={`${styles.majorNoteNames} mt-2 space-y-1`}>
                    {galeria1000.alunos.slice(0, 5).map((aluno, index) => (
                      <div key={index} className="flex items-center">
                        <span>
                          {aluno.nome_aluno}
                          {variant === "admin" && aluno.turma && !isStatusEspecial(aluno.turma) && (
                            (() => {
                              const turmaLetter = normalizeTurmaToLetter(aluno.turma) || 'N/A';
                              const colors = getTurmaColors(turmaLetter);
                              return (
                                <span className={`ml-2 px-2 py-1 ${colors.bg} ${colors.text} ${colors.border} border text-xs rounded font-medium`}>
                                  {formatTurmaDisplay(aluno.turma)}
                                </span>
                              );
                            })()
                          )}
                        </span>
                      </div>
                    ))}
                    {galeria1000.total > 5 && (
                      <div className="text-sm text-muted-foreground">
                        ... e mais {galeria1000.total - 5} {galeria1000.total - 5 === 1 ? 'aluno' : 'alunos'}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground mt-2">
                  {selectedType === "regular" && selectedMonth 
                    ? `Nenhum aluno na Galeria de Honra em ${selectedMonth}.`
                    : "Nenhum aluno na Galeria de Honra ainda."
                  }
                  <br />
                  <span className="text-sm">
                    {selectedType === "regular" && selectedMonth 
                      ? "Tente outros meses ou seja o primeiro neste período! 🎯"
                      : "Seja o primeiro a conquistar esse marco histórico! 🎯"
                    }
                  </span>
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>


      {/* Filtros e Ranking */}
      <Card className={styles.container}>
        <CardHeader>
          <CardTitle className={styles.title}>
            🏅 Classificação Top 5
          </CardTitle>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button
              variant={selectedType === "simulado" ? "default" : "outline"}
              onClick={() => setSelectedType("simulado")}
              className={variant === "student" ? (selectedType === "simulado" ? styles.buttonActive : styles.buttonInactive) : ""}
              size={variant === "corretor" ? "sm" : undefined}
            >
              Simulado
            </Button>
            <Button
              variant={selectedType === "regular" ? "default" : "outline"}
              onClick={() => setSelectedType("regular")}
              className={variant === "student" ? (selectedType === "regular" ? styles.buttonActive : styles.buttonInactive) : ""}
              size={variant === "corretor" ? "sm" : undefined}
            >
              Regular
            </Button>
            <Button
              variant={selectedType === "avulsa" ? "default" : "outline"}
              onClick={() => setSelectedType("avulsa")}
              className={variant === "student" ? (selectedType === "avulsa" ? styles.buttonActive : styles.buttonInactive) : ""}
              size={variant === "corretor" ? "sm" : undefined}
            >
              Visitante
            </Button>
          </div>

          {/* Filtro adicional para simulados */}
          {selectedType === "simulado" && (simulados.length > 0 || simuladosHistorico.length > 0) && (
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${variant === "student" ? "text-primary" : "text-gray-700"}`}>
                Filtrar por simulado ({anoAtual}):
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedSimulado === "" ? "default" : "outline"}
                  onClick={() => handleSimuladoSelect("")}
                  size="sm"
                  className={variant === "student" ? (selectedSimulado === "" ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}
                >
                  Todos
                </Button>
                {simulados.length > 0 ? (
                  simulados.map(simulado => (
                    <Button
                      key={simulado.id}
                      variant={selectedSimulado === simulado.id ? "default" : "outline"}
                      onClick={() => handleSimuladoSelect(simulado.id)}
                      size="sm"
                      className={variant === "student" ? (selectedSimulado === simulado.id ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}
                    >
                      {simulado.titulo}
                    </Button>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground py-1">
                    Nenhum simulado em {anoAtual}
                  </span>
                )}
              </div>

              {/* Botão para ver histórico de simulados de anos anteriores */}
              {simuladosHistorico.length > 0 && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSimuladoHistorico(!showSimuladoHistorico)}
                    className="text-muted-foreground hover:text-primary flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    {showSimuladoHistorico ? "Ocultar histórico" : `Ver histórico (${simuladosHistorico.length} ${simuladosHistorico.length === 1 ? 'simulado' : 'simulados'})`}
                    {showSimuladoHistorico ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  {showSimuladoHistorico && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                      <label className="block text-xs font-medium mb-2 text-muted-foreground">
                        Anos anteriores:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {simuladosHistorico.map(simulado => (
                          <Button
                            key={simulado.id}
                            variant={selectedSimulado === simulado.id ? "default" : "outline"}
                            onClick={() => handleSimuladoSelect(simulado.id)}
                            size="sm"
                            className={`text-xs ${variant === "student" ? (selectedSimulado === simulado.id ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}`}
                          >
                            {simulado.titulo}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Filtro adicional para aba Regular */}
          {selectedType === "regular" && (mesesDisponiveis.length > 0 || mesesHistorico.length > 0) && (
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${variant === "student" ? "text-primary" : "text-gray-700"}`}>
                Filtrar por mês ({anoAtual}):
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedMonth === "" ? "default" : "outline"}
                  onClick={() => setSelectedMonth("")}
                  size="sm"
                  className={variant === "student" ? (selectedMonth === "" ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}
                >
                  Todos
                </Button>
                {mesesDisponiveis.map(mes => (
                  <Button
                    key={mes}
                    variant={selectedMonth === mes ? "default" : "outline"}
                    onClick={() => setSelectedMonth(mes)}
                    size="sm"
                    className={variant === "student" ? (selectedMonth === mes ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}
                  >
                    {mes}
                  </Button>
                ))}
              </div>

              {/* Botão para ver histórico de anos anteriores */}
              {mesesHistorico.length > 0 && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistorico(!showHistorico)}
                    className="text-muted-foreground hover:text-primary flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    {showHistorico ? "Ocultar histórico" : `Ver histórico (${mesesHistorico.length} ${mesesHistorico.length === 1 ? 'mês' : 'meses'})`}
                    {showHistorico ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  {showHistorico && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                      <label className="block text-xs font-medium mb-2 text-muted-foreground">
                        Anos anteriores:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {mesesHistorico.map(mes => (
                          <Button
                            key={mes}
                            variant={selectedMonth === mes ? "default" : "outline"}
                            onClick={() => setSelectedMonth(mes)}
                            size="sm"
                            className={`text-xs ${variant === "student" ? (selectedMonth === mes ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}`}
                          >
                            {mes}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {ranking && ranking.length > 0 ? (
            <div className="space-y-3">
              {ranking.map((item, index) => (
                <div
                  key={`${item.nome_aluno}-${index}`}
                  className={styles.rankingItem}
                >
                  <div className="flex items-center gap-4">
                    {getPosicaoIcon(item.posicao)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={styles.rankingPosition}>
                          {item.posicao}º lugar
                        </span>
                      </div>
                      <div className={styles.rankingName}>
                        {item.nome_aluno}
                        {variant === "admin" && item.turma && !isStatusEspecial(item.turma) && (
                          (() => {
                            const turmaLetter = normalizeTurmaToLetter(item.turma) || 'N/A';
                            const colors = getTurmaColors(turmaLetter);
                            return (
                              <span className={`ml-2 px-2 py-1 ${colors.bg} ${colors.text} ${colors.border} border text-xs rounded font-medium`}>
                                {formatTurmaDisplay(item.turma)}
                              </span>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={styles.rankingScore}>
                      {item.nota_total}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      pontos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">Nenhuma redação corrigida ainda</p>
              <p className="text-sm text-gray-500">
                O ranking aparecerá quando houver correções disponíveis
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};