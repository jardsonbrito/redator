
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Calendar, User, Mail, FileText, CheckCircle, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link } from "react-router-dom";

interface MeusSimuladosFixoProps {
  turmaCode: string;
}

export const MeusSimuladosFixo = ({ turmaCode }: MeusSimuladosFixoProps) => {
  const { toast } = useToast();
  const [emailVerificacao, setEmailVerificacao] = useState<{[key: string]: string}>({});
  const [redacaoVisivel, setRedacaoVisivel] = useState<{[key: string]: boolean}>({});
  const [filtroTipo, setFiltroTipo] = useState<string>("todas");

  // Buscar dados do usuário para determinar filtros
  const userType = localStorage.getItem("userType");
  const visitanteData = localStorage.getItem("visitanteData");
  let visitanteEmail = "";
  
  if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      visitanteEmail = dados.email;
    } catch (error) {
      console.error('Erro ao parsear dados do visitante:', error);
    }
  }

  const { data: todasRedacoes, isLoading } = useQuery({
    queryKey: ['minhas-redacoes', turmaCode, visitanteEmail],
    queryFn: async () => {
      const redacoes = [];
      
      // Buscar redações avulsas/regulares
      if (userType === "aluno" && turmaCode !== "visitante") {
        const { data: enviadasRes } = await supabase
          .rpc('get_redacoes_by_turma', { p_turma: turmaCode });
        
        if (enviadasRes) {
          enviadasRes.forEach(r => {
            redacoes.push({
              ...r,
              tipo_origem: r.tipo_envio || 'regular',
              fonte: 'redacoes_enviadas'
            });
          });
        }
      } else if (userType === "visitante" && visitanteEmail) {
        const { data: enviadasRes } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('email_aluno', visitanteEmail)
          .eq('tipo_envio', 'visitante')
          .order('data_envio', { ascending: false });
        
        if (enviadasRes) {
          enviadasRes.forEach(r => {
            redacoes.push({
              ...r,
              tipo_origem: 'avulsa',
              fonte: 'redacoes_enviadas'
            });
          });
        }
      }

      // Buscar redações de simulado
      let simuladoQuery = supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica)
        `)
        .order('data_envio', { ascending: false });

      if (userType === "aluno" && turmaCode !== "visitante") {
        simuladoQuery = simuladoQuery.eq('turma', turmaCode);
      } else if (userType === "visitante") {
        simuladoQuery = simuladoQuery.eq('email_aluno', visitanteEmail);
      }
      
      const { data: simuladoRes } = await simuladoQuery;
      
      if (simuladoRes) {
        simuladoRes.forEach(r => {
          redacoes.push({
            ...r,
            frase_tematica: r.simulados.frase_tematica,
            tipo_origem: 'simulado',
            fonte: 'redacoes_simulado'
          });
        });
      }

      // Ordenar por data de envio (mais recentes primeiro)
      return redacoes.sort((a, b) => new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime());
    }
  });

  const verificarEmailEMostrarRedacao = (redacaoId: string, emailCorreto: string) => {
    const emailDigitado = emailVerificacao[redacaoId]?.toLowerCase().trim();
    
    if (!emailDigitado) {
      toast({
        title: "Digite o e-mail",
        description: "Por favor, digite o e-mail para verificar o acesso.",
        variant: "destructive",
      });
      return;
    }

    if (emailDigitado === emailCorreto.toLowerCase()) {
      setRedacaoVisivel(prev => ({ ...prev, [redacaoId]: true }));
      toast({
        title: "Acesso liberado!",
        description: "E-mail confirmado. Você pode ver sua correção.",
      });
    } else {
      toast({
        title: "E-mail incorreto",
        description: "O e-mail digitado não confere com o e-mail de envio.",
        variant: "destructive",
      });
    }
  };

  // Filtrar redações por tipo
  const redacoesFiltradas = todasRedacoes?.filter(redacao => {
    if (filtroTipo === "todas") return true;
    if (filtroTipo === "regular" && redacao.tipo_origem === "regular") return true;
    if (filtroTipo === "avulsa" && redacao.tipo_origem === "avulsa") return true;
    if (filtroTipo === "simulado" && redacao.tipo_origem === "simulado") return true;
    return false;
  }) || [];

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
                    <ClipboardCheck className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    📝 Minhas Redações
                  </CardTitle>
                  <p className="text-muted-foreground font-medium">Suas redações enviadas com detalhes</p>
                </div>
              </div>
              <Link to="/meus-simulados">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 hover:from-primary/20 hover:to-secondary/20 font-medium"
                >
                  Ver Todos
                </Button>
              </Link>
            </div>
          </CardHeader>
        </div>
        
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando simulados...</p>
            </div>
          ) : !todasRedacoes || todasRedacoes.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">Nenhuma redação enviada ainda</p>
              <p className="text-sm text-gray-500">
                Suas redações aparecerão aqui quando forem enviadas
              </p>
            </div>
          ) : (
            <>
              {/* Filtros por tipo */}
              <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                <Button
                  variant={filtroTipo === "todas" ? "default" : "outline"}
                  onClick={() => setFiltroTipo("todas")}
                  size="sm"
                >
                  Todas
                </Button>
                <Button
                  variant={filtroTipo === "regular" ? "default" : "outline"}
                  onClick={() => setFiltroTipo("regular")}
                  size="sm"
                >
                  Regular
                </Button>
                <Button
                  variant={filtroTipo === "avulsa" ? "default" : "outline"}
                  onClick={() => setFiltroTipo("avulsa")}
                  size="sm"
                >
                  Avulsa
                </Button>
                <Button
                  variant={filtroTipo === "simulado" ? "default" : "outline"}
                  onClick={() => setFiltroTipo("simulado")}
                  size="sm"
                >
                  Simulado
                </Button>
              </div>

              {redacoesFiltradas.slice(0, 3).map((redacao) => (
                <Card key={redacao.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-purple-800 mb-1">
                          {redacao.tipo_origem === 'simulado' ? redacao.simulados?.titulo : redacao.frase_tematica}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">{redacao.frase_tematica}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={redacao.corrigida ? "bg-green-500" : "bg-yellow-500"}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {redacao.corrigida ? "Corrigida" : "Aguardando"}
                          </Badge>
                          <Badge variant="outline">
                            {redacao.tipo_origem === 'simulado' ? 'Simulado' : 
                             redacao.tipo_origem === 'regular' ? 'Regular' : 'Avulsa'}
                          </Badge>
                          {redacao.corrigida && redacao.nota_total && (
                            <Badge variant="outline">
                              Nota: {redacao.nota_total}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {redacao.nome_aluno}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(redacao.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>

                        {/* Campo de verificação de e-mail */}
                        {!redacaoVisivel[redacao.id] && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Mail className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-800">
                                Digite seu e-mail para ver a correção
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="email"
                                placeholder="Digite o e-mail usado no envio"
                                value={emailVerificacao[redacao.id] || ""}
                                onChange={(e) => setEmailVerificacao(prev => ({
                                  ...prev,
                                  [redacao.id]: e.target.value
                                }))}
                                className="flex-1"
                              />
                              <Button
                                onClick={() => verificarEmailEMostrarRedacao(redacao.id, redacao.email_aluno)}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                Verificar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Mostrar correção se e-mail foi verificado */}
                        {redacaoVisivel[redacao.id] && redacao.corrigida && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="grid grid-cols-5 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-xs text-gray-600 mb-1">C1</div>
                                <div className="font-bold text-lg text-purple-600">{redacao.nota_c1}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-600 mb-1">C2</div>
                                <div className="font-bold text-lg text-purple-600">{redacao.nota_c2}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-600 mb-1">C3</div>
                                <div className="font-bold text-lg text-purple-600">{redacao.nota_c3}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-600 mb-1">C4</div>
                                <div className="font-bold text-lg text-purple-600">{redacao.nota_c4}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-600 mb-1">C5</div>
                                <div className="font-bold text-lg text-purple-600">{redacao.nota_c5}</div>
                              </div>
                            </div>
                            
                            {(redacao.comentario_pedagogico || redacao.comentario_admin) && (
                              <div>
                                <div className="font-medium text-purple-800 mb-2">Comentário da Correção:</div>
                                <div className="p-3 bg-white rounded border text-sm">
                                  {redacao.comentario_pedagogico || redacao.comentario_admin}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                    </div>
                  </CardContent>
                </Card>
              ))}

              {redacoesFiltradas.length > 3 && (
                <div className="text-center pt-4">
                  <Link to="/meus-simulados">
                    <Button variant="outline">
                      Ver todas as {redacoesFiltradas.length} redações enviadas
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
