
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, Edit, Search, Calendar, User, FileText } from "lucide-react";

interface RedacaoExercicio {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma?: string;
  redacao_texto: string;
  data_envio: string;
  corrigida: boolean;
  nota_c1?: number;
  nota_c2?: number;
  nota_c3?: number;
  nota_c4?: number;
  nota_c5?: number;
  nota_total?: number;
  comentario_admin?: string;
  data_correcao?: string;
  exercicio_id: string;
  exercicios?: {
    titulo: string;
    tipo: string;
  };
}

export const RedacaoExercicioList = () => {
  const [redacoes, setRedacoes] = useState<RedacaoExercicio[]>([]);
  const [filteredRedacoes, setFilteredRedacoes] = useState<RedacaoExercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("");
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoExercicio | null>(null);
  const [isCorreting, setIsCorreting] = useState(false);

  // Estados para correção
  const [notaC1, setNotaC1] = useState(0);
  const [notaC2, setNotaC2] = useState(0);
  const [notaC3, setNotaC3] = useState(0);
  const [notaC4, setNotaC4] = useState(0);
  const [notaC5, setNotaC5] = useState(0);
  const [comentarioAdmin, setComentarioAdmin] = useState("");

  useEffect(() => {
    fetchRedacoes();
  }, []);

  useEffect(() => {
    filterRedacoes();
  }, [redacoes, searchTerm, statusFilter, turmaFilter]);

  const fetchRedacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("redacoes_exercicio")
        .select(`
          *,
          exercicios (
            titulo,
            tipo
          )
        `)
        .order("data_envio", { ascending: false });

      if (error) throw error;
      setRedacoes(data || []);
    } catch (error) {
      console.error("Erro ao buscar redações:", error);
      toast.error("Erro ao carregar redações");
    } finally {
      setIsLoading(false);
    }
  };

  const filterRedacoes = () => {
    let filtered = redacoes;

    if (searchTerm) {
      filtered = filtered.filter(redacao =>
        redacao.nome_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        redacao.email_aluno.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(redacao => {
        if (statusFilter === "corrigida") return redacao.corrigida;
        if (statusFilter === "pendente") return !redacao.corrigida;
        return true;
      });
    }

    if (turmaFilter) {
      filtered = filtered.filter(redacao => redacao.turma === turmaFilter);
    }

    setFilteredRedacoes(filtered);
  };

  const handleOpenCorrection = (redacao: RedacaoExercicio) => {
    setSelectedRedacao(redacao);
    setNotaC1(redacao.nota_c1 || 0);
    setNotaC2(redacao.nota_c2 || 0);
    setNotaC3(redacao.nota_c3 || 0);
    setNotaC4(redacao.nota_c4 || 0);
    setNotaC5(redacao.nota_c5 || 0);
    setComentarioAdmin(redacao.comentario_admin || "");
  };

  const handleSaveCorrection = async () => {
    if (!selectedRedacao) return;

    setIsCorreting(true);

    try {
      const notaTotal = notaC1 + notaC2 + notaC3 + notaC4 + notaC5;

      const { error } = await supabase
        .from("redacoes_exercicio")
        .update({
          nota_c1: notaC1,
          nota_c2: notaC2,
          nota_c3: notaC3,
          nota_c4: notaC4,
          nota_c5: notaC5,
          nota_total: notaTotal,
          comentario_admin: comentarioAdmin,
          corrigida: true,
          data_correcao: new Date().toISOString()
        })
        .eq("id", selectedRedacao.id);

      if (error) throw error;

      toast.success("Correção salva com sucesso!");
      setSelectedRedacao(null);
      fetchRedacoes();
    } catch (error) {
      console.error("Erro ao salvar correção:", error);
      toast.error("Erro ao salvar correção");
    } finally {
      setIsCorreting(false);
    }
  };

  const turmasUnicas = [...new Set(redacoes.map(r => r.turma).filter(Boolean))];

  if (isLoading) {
    return <div className="text-center py-8">Carregando redações...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="corrigida">Corrigida</SelectItem>
              </SelectContent>
            </Select>
            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {turmasUnicas.map((turma) => (
                  <SelectItem key={turma} value={turma || ""}>
                    {turma || "Sem turma"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Redações */}
      <div className="grid gap-4">
        {filteredRedacoes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhuma redação encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          filteredRedacoes.map((redacao) => (
            <Card key={redacao.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {redacao.nome_aluno}
                      <Badge variant={redacao.corrigida ? "default" : "secondary"}>
                        {redacao.corrigida ? "Corrigida" : "Pendente"}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      {redacao.email_aluno}
                      {redacao.turma && ` • ${redacao.turma}`}
                    </div>
                    {redacao.exercicios && (
                      <Badge variant="outline" className="mt-2">
                        {redacao.exercicios.titulo}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCorrection(redacao)}
                        >
                          {redacao.corrigida ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {redacao.corrigida ? "Visualizar" : "Corrigir"} Redação - {redacao.nome_aluno}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold mb-2">Informações do Aluno</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><strong>Nome:</strong> {redacao.nome_aluno}</div>
                              <div><strong>Email:</strong> {redacao.email_aluno}</div>
                              <div><strong>Turma:</strong> {redacao.turma || "Não informado"}</div>
                              <div><strong>Data de Envio:</strong> {new Date(redacao.data_envio).toLocaleString('pt-BR')}</div>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-2">Texto da Redação</h3>
                            <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-sm">{redacao.redacao_texto}</pre>
                            </div>
                          </div>

                          {!redacao.corrigida && (
                            <div className="space-y-4">
                              <h3 className="font-semibold">Correção</h3>
                              
                              <div className="grid grid-cols-5 gap-4">
                                <div>
                                  <label className="text-sm font-medium">C1 (0-200)</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="200"
                                    step="20"
                                    value={notaC1}
                                    onChange={(e) => setNotaC1(Number(e.target.value))}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">C2 (0-200)</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="200"
                                    step="20"
                                    value={notaC2}
                                    onChange={(e) => setNotaC2(Number(e.target.value))}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">C3 (0-200)</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="200"
                                    step="20"
                                    value={notaC3}
                                    onChange={(e) => setNotaC3(Number(e.target.value))}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">C4 (0-200)</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="200"
                                    step="20"
                                    value={notaC4}
                                    onChange={(e) => setNotaC4(Number(e.target.value))}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">C5 (0-200)</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="200"
                                    step="20"
                                    value={notaC5}
                                    onChange={(e) => setNotaC5(Number(e.target.value))}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium">Comentário Administrativo</label>
                                <Textarea
                                  value={comentarioAdmin}
                                  onChange={(e) => setComentarioAdmin(e.target.value)}
                                  rows={4}
                                  placeholder="Digite seus comentários sobre a redação..."
                                />
                              </div>

                              <div className="flex justify-between items-center">
                                <div className="text-lg font-semibold">
                                  Nota Total: {notaC1 + notaC2 + notaC3 + notaC4 + notaC5}
                                </div>
                                <Button onClick={handleSaveCorrection} disabled={isCorreting}>
                                  {isCorreting ? "Salvando..." : "Salvar Correção"}
                                </Button>
                              </div>
                            </div>
                          )}

                          {redacao.corrigida && (
                            <div className="space-y-4">
                              <h3 className="font-semibold">Correção Realizada</h3>
                              
                              <div className="grid grid-cols-5 gap-4">
                                <div className="text-center">
                                  <div className="text-sm font-medium">C1</div>
                                  <div className="text-2xl font-bold text-blue-600">{redacao.nota_c1}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium">C2</div>
                                  <div className="text-2xl font-bold text-blue-600">{redacao.nota_c2}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium">C3</div>
                                  <div className="text-2xl font-bold text-blue-600">{redacao.nota_c3}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium">C4</div>
                                  <div className="text-2xl font-bold text-blue-600">{redacao.nota_c4}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium">C5</div>
                                  <div className="text-2xl font-bold text-blue-600">{redacao.nota_c5}</div>
                                </div>
                              </div>

                              <div className="text-center">
                                <div className="text-sm font-medium">Nota Total</div>
                                <div className="text-3xl font-bold text-green-600">{redacao.nota_total}</div>
                              </div>

                              {redacao.comentario_admin && (
                                <div>
                                  <h4 className="font-medium mb-2">Comentário Administrativo</h4>
                                  <div className="bg-gray-50 p-3 rounded">
                                    {redacao.comentario_admin}
                                  </div>
                                </div>
                              )}

                              {redacao.data_correcao && (
                                <div className="text-sm text-gray-500">
                                  Corrigida em: {new Date(redacao.data_correcao).toLocaleString('pt-BR')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    Enviada em: {new Date(redacao.data_envio).toLocaleString('pt-BR')}
                  </div>
                  
                  {redacao.corrigida && redacao.nota_total !== null && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        Nota: {redacao.nota_total}/1000
                      </Badge>
                      {redacao.data_correcao && (
                        <span className="text-sm text-gray-500">
                          Corrigida em: {new Date(redacao.data_correcao).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600">
                    Texto: {redacao.redacao_texto.substring(0, 150)}...
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
