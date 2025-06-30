
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const Simulados = () => {
  // Recupera dados do usuário
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  
  let turmaCode = "visitante";
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "visitante";
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
      if (turmaCode === "visitante") {
        query = query.eq('permite_visitante', true);
      } else {
        query = query.or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <header className="bg-white shadow-sm border-b border-redator-accent/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <ClipboardCheck className="w-5 h-5" />
                <span>Voltar ao App</span>
              </Link>
              <h1 className="text-2xl font-bold text-redator-primary">Simulados</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">Carregando simulados...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
              <ClipboardCheck className="w-5 h-5" />
              <span>Voltar ao App</span>
            </Link>
            <h1 className="text-2xl font-bold text-redator-primary">Simulados</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">
            Simulados Disponíveis
          </h2>
          <p className="text-redator-accent">
            Participe dos simulados de redação com horário controlado e correção detalhada.
          </p>
        </div>

        {!simulados || simulados.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum simulado disponível
              </h3>
              <p className="text-gray-500">
                Não há simulados disponíveis para sua turma no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {simulados.map((simulado) => {
              const agora = new Date();
              const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
              const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
              const simuladoAtivo = isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });
              const simuladoFuturo = agora < inicioSimulado;
              const simuladoEncerrado = agora > fimSimulado;

              return (
                <Card key={simulado.id} className="border-l-4 border-l-redator-primary hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{simulado.titulo}</CardTitle>
                        <p className="text-gray-600 mb-4">{simulado.frase_tematica}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge 
                            variant={simuladoAtivo ? "default" : simuladoFuturo ? "secondary" : "outline"}
                            className={simuladoAtivo ? "bg-green-500" : simuladoFuturo ? "bg-blue-500" : ""}
                          >
                            {simuladoAtivo ? "Em andamento" : simuladoFuturo ? "Em breve" : "Encerrado"}
                          </Badge>
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {simulado.turmas_autorizadas?.length || 0} turma(s)
                          </Badge>
                          {simulado.permite_visitante && (
                            <Badge variant="outline" className="text-redator-secondary">
                              Aceita visitantes
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Início: {format(inicioSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              Término: {format(fimSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Link to={`/simulados/${simulado.id}`}>
                          <Button 
                            variant={simuladoAtivo ? "default" : "outline"}
                            size="sm"
                            className={simuladoAtivo ? "bg-redator-primary" : ""}
                            disabled={simuladoEncerrado}
                          >
                            {simuladoEncerrado ? "Encerrado" : simuladoAtivo ? "Participar" : "Ver Detalhes"}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
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
