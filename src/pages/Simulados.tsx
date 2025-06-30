
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ClipboardCheck, Home, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const Simulados = () => {
  // Recupera a turma do localStorage
  const alunoTurma = localStorage.getItem("alunoTurma");
  const turmasMap = {
    "Turma A": "LRA2025",
    "Turma B": "LRB2025", 
    "Turma C": "LRC2025",
    "Turma D": "LRD2025",
    "Turma E": "LRE2025"
  };
  const turmaCode = alunoTurma ? turmasMap[alunoTurma as keyof typeof turmasMap] : "visitante";

  const { data: simulados, isLoading } = useQuery({
    queryKey: ['simulados', turmaCode],
    queryFn: async () => {
      console.log("Fetching simulados for turma:", turmaCode);
      
      const { data, error } = await supabase
        .from('simulados')
        .select('*')
        .eq('ativo', true)
        .or(`turmas_autorizadas.cs.{${turmaCode}},turmas_autorizadas.cs.{visitante}`)
        .order('criado_em', { ascending: false });
      
      if (error) {
        console.error("Error fetching simulados:", error);
        throw error;
      }
      
      console.log("Simulados fetched:", data);
      return data;
    }
  });

  const isSimuladoAtivo = (simulado: any) => {
    const now = new Date();
    const inicio = new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const fim = new Date(`${simulado.data_fim}T${simulado.hora_fim}`);
    
    return isAfter(now, inicio) && isBefore(now, fim);
  };

  const getStatusMessage = (simulado: any) => {
    const now = new Date();
    const inicio = new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const fim = new Date(`${simulado.data_fim}T${simulado.hora_fim}`);
    
    if (isBefore(now, inicio)) {
      return `Disponível a partir de ${format(inicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
    }
    
    if (isAfter(now, fim)) {
      return "Simulado encerrado";
    }
    
    return `Disponível até ${format(fim, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <ClipboardCheck className="w-12 h-12 text-redator-primary mx-auto mb-4 animate-pulse" />
          <p className="text-redator-accent">Carregando simulados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar ao início</span>
              </Link>
              <div className="hidden sm:block w-px h-6 bg-redator-accent/20"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-redator-primary flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6" />
                Simulados
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-redator-primary mb-2">
            Simulados Disponíveis
          </h2>
          <p className="text-redator-accent">
            Pratique com simulados em horários específicos e receba correção detalhada
          </p>
        </div>

        {!simulados || simulados.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="w-16 h-16 text-redator-accent mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-redator-primary mb-2">
              Nenhum simulado disponível para sua turma
            </h3>
            <p className="text-redator-accent">
              Os simulados aparecerão aqui quando forem cadastrados para sua turma pelo professor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {simulados.map((simulado) => {
              const ativo = isSimuladoAtivo(simulado);
              const statusMessage = getStatusMessage(simulado);
              
              return (
                <Card key={simulado.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-redator-accent/20">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 group-hover:scale-110 transition-transform ${
                        ativo ? 'bg-redator-primary' : 'bg-gray-400'
                      }`}>
                        <ClipboardCheck className="w-6 h-6 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-redator-primary mb-2">
                        {simulado.titulo}
                      </h3>
                      
                      <p className="text-redator-accent text-sm mb-4 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        {statusMessage}
                      </p>

                      {ativo ? (
                        <Link to={`/simulados/${simulado.id}`}>
                          <Button className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white">
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Iniciar Simulado
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full bg-gray-400 text-white cursor-not-allowed">
                          <Clock className="w-4 h-4 mr-2" />
                          Indisponível
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Simulados;
