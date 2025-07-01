
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

interface MeusSimuladosFixoProps {
  turmaCode: string;
}

export const MeusSimuladosFixo = ({ turmaCode }: MeusSimuladosFixoProps) => {
  const { toast } = useToast();
  const [emailVerificacao, setEmailVerificacao] = useState<{[key: string]: string}>({});
  const [redacaoVisivel, setRedacaoVisivel] = useState<{[key: string]: boolean}>({});
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroEmail, setFiltroEmail] = useState("");
  const [filtroTema, setFiltroTema] = useState("");

  const { data: redacoesCorrigidas, isLoading } = useQuery({
    queryKey: ['simulados-corrigidos', turmaCode],
    queryFn: async () => {
      let query = supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica, turmas_autorizadas)
        `)
        .eq('corrigida', true)
        .order('data_envio', { ascending: false });

      if (turmaCode !== "visitante") {
        query = query.eq('turma', turmaCode);
      } else {
        query = query.eq('turma', 'visitante');
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar redações de simulados:', error);
        return [];
      }
      
      return data || [];
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

  // Se não há redações ou está carregando, não mostra
  if (isLoading || !redacoesCorrigidas || redacoesCorrigidas.length === 0) {
    return null;
  }

  // Filtrar redações
  const redacoesFiltradas = redacoesCorrigidas.filter(redacao => {
    const nomeMatch = !filtroNome || redacao.nome_aluno.toLowerCase().includes(filtroNome.toLowerCase());
    const emailMatch = !filtroEmail || redacao.email_aluno.toLowerCase().includes(filtroEmail.toLowerCase());
    const temaMatch = !filtroTema || redacao.simulados.titulo.toLowerCase().includes(filtroTema.toLowerCase());
    return nomeMatch && emailMatch && temaMatch;
  });

  return (
    <div className="mb-8">
      <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-purple-800">
                Simulados
              </CardTitle>
              <p className="text-sm text-gray-600">Veja suas redações de simulados corrigidas</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <Input
              placeholder="Filtrar por nome..."
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
            />
            <Input
              placeholder="Filtrar por e-mail..."
              value={filtroEmail}
              onChange={(e) => setFiltroEmail(e.target.value)}
            />
            <Input
              placeholder="Filtrar por tema..."
              value={filtroTema}
              onChange={(e) => setFiltroTema(e.target.value)}
            />
          </div>

          {redacoesFiltradas.map((redacao) => (
            <Card key={redacao.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-purple-800 mb-1">
                      {redacao.simulados.titulo}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">{redacao.simulados.frase_tematica}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Corrigida
                      </Badge>
                      <Badge variant="outline">
                        Nota: {redacao.nota_total}
                      </Badge>
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
                    {redacaoVisivel[redacao.id] && (
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
                        
                        {redacao.comentario_pedagogico && (
                          <div>
                            <div className="font-medium text-purple-800 mb-2">Comentário Pedagógico:</div>
                            <div className="p-3 bg-white rounded border text-sm">
                              {redacao.comentario_pedagogico}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Redação
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Redação - {redacao.nome_aluno}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <div className="bg-gray-50 p-4 rounded mb-4">
                            <h3 className="font-bold text-purple-800 mb-2">{redacao.simulados.frase_tematica}</h3>
                          </div>
                          <div className="bg-white p-4 border rounded whitespace-pre-wrap">
                            {redacao.texto}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
