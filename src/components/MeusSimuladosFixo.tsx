
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

interface MeusSimuladosFixoProps {
  turmaCode: string;
}

export const MeusSimuladosFixo = ({ turmaCode }: MeusSimuladosFixoProps) => {
  // Mapear nomes de turma para códigos corretos
  const getTurmaCode = (turmaNome: string) => {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    return turmasMap[turmaNome as keyof typeof turmasMap] || turmaNome;
  };

  const { data: redacoesRecentes, isLoading } = useQuery({
    queryKey: ['redacoes-recentes', turmaCode],
    queryFn: async () => {
      console.log('Buscando redações para:', turmaCode);
      
      if (turmaCode === "visitante" || turmaCode === "Visitante") {
        // Para visitantes, buscar somente redações corrigidas
        const visitanteData = localStorage.getItem("visitanteData");
        if (!visitanteData) return [];
        
        const dados = JSON.parse(visitanteData);
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('email_aluno', dados.email)
          .eq('tipo_envio', 'visitante')
          .eq('corrigida', true)
          .order('data_envio', { ascending: false })
          .limit(3);
        
        if (error) {
          console.error('Erro ao buscar redações do visitante:', error);
          return [];
        }
        
        console.log('Redações corrigidas encontradas para visitante:', data);
        return data || [];
      } else {
        // Para alunos, buscar somente redações corrigidas da turma
        const codigoTurma = getTurmaCode(turmaCode);
        console.log('Código da turma convertido:', codigoTurma);
        
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('turma', codigoTurma)
          .neq('tipo_envio', 'visitante')
          .eq('corrigida', true)
          .order('data_envio', { ascending: false })
          .limit(3);
        
        if (error) {
          console.error('Erro ao buscar redações da turma:', error);
          return [];
        }
        
        console.log('Redações corrigidas encontradas para turma:', data);
        return data || [];
      }
    },
    enabled: !!turmaCode,
  });

  const getTipoEnvioLabel = (tipo: string) => {
    const tipos = {
      'regular': 'Regular',
      'exercicio': 'Exercício', 
      'simulado': 'Simulado',
      'visitante': 'Avulsa'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const getTipoEnvioColor = (tipo: string) => {
    const cores = {
      'regular': 'bg-blue-100 text-blue-800',
      'exercicio': 'bg-purple-100 text-purple-800',
      'simulado': 'bg-orange-100 text-orange-800',
      'visitante': 'bg-gray-100 text-gray-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="mb-8">
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-1">
          <CardHeader className="bg-white/90 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-30"></div>
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-lg">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    📝 Minhas Redações
                  </CardTitle>
                  <p className="text-muted-foreground font-medium">Acompanhe todas as suas redações corrigidas com detalhes</p>
                </div>
              </div>
              <Link to="/minhas-redacoes">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 hover:from-primary/20 hover:to-secondary/20 font-medium"
                >
                  Ver Todas
                </Button>
              </Link>
            </div>
          </CardHeader>
        </div>
        
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando redações...</p>
            </div>
          ) : !redacoesRecentes || redacoesRecentes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">Nenhuma redação ainda</p>
              <p className="text-sm text-muted-foreground">
                Suas redações aparecerão aqui quando forem enviadas
              </p>
            </div>
          ) : (
            <>
              {redacoesRecentes.slice(0, 3).map((redacao) => (
                <Card key={redacao.id} className="border border-primary/20 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-primary mb-2 leading-tight">
                          {redacao.frase_tematica}
                        </h4>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {redacao.corrigida ? (
                            <Badge className="bg-green-100 text-green-800">
                              Corrigido
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Aguardando
                            </Badge>
                          )}
                          <Badge className={getTipoEnvioColor(redacao.tipo_envio)}>
                            {getTipoEnvioLabel(redacao.tipo_envio)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {redacao.nome_aluno}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(redacao.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 shrink-0">
                        <Link to="/minhas-redacoes">
                           <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10">
                            <Eye className="w-4 h-4 mr-1" />
                            Ver Correção
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {redacoesRecentes.length >= 3 && (
                <div className="text-center pt-4">
                  <Link to="/minhas-redacoes">
                    <Button 
                      variant="outline"
                      className="border-primary/30 hover:bg-primary/10"
                    >
                      Ver todas as redações
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
