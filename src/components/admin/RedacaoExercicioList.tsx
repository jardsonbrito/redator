
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Edit, Save, X } from "lucide-react";

interface RedacaoExercicio {
  id: string;
  exercicio_id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchRedacoes();
  }, []);

  useEffect(() => {
    filterRedacoes();
  }, [redacoes, searchTerm, statusFilter]);

  const fetchRedacoes = async () => {
    try {
      const { data, error } = await (supabase as any)
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
      filtered = filtered.filter(redacao => 
        statusFilter === 'corrigida' ? redacao.corrigida : !redacao.corrigida
      );
    }

    setFilteredRedacoes(filtered);
  };

  const startEditing = (redacao: RedacaoExercicio) => {
    setEditingId(redacao.id);
    setEditData({
      nota_c1: redacao.nota_c1 || 0,
      nota_c2: redacao.nota_c2 || 0,
      nota_c3: redacao.nota_c3 || 0,
      nota_c4: redacao.nota_c4 || 0,
      nota_c5: redacao.nota_c5 || 0,
      comentario_admin: redacao.comentario_admin || ""
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveCorrection = async (id: string) => {
    try {
      const notaTotal = (editData.nota_c1 || 0) + (editData.nota_c2 || 0) + 
                       (editData.nota_c3 || 0) + (editData.nota_c4 || 0) + 
                       (editData.nota_c5 || 0);

      const { error } = await (supabase as any)
        .from("redacoes_exercicio")
        .update({
          nota_c1: editData.nota_c1,
          nota_c2: editData.nota_c2,
          nota_c3: editData.nota_c3,
          nota_c4: editData.nota_c4,
          nota_c5: editData.nota_c5,
          nota_total: notaTotal,
          comentario_admin: editData.comentario_admin,
          corrigida: true,
          data_correcao: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Correção salva com sucesso!");
      setEditingId(null);
      setEditData({});
      fetchRedacoes();
    } catch (error) {
      console.error("Erro ao salvar correção:", error);
      toast.error("Erro ao salvar correção");
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="corrigida">Corrigidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                      {redacao.nome_aluno}
                      <Badge variant={redacao.corrigida ? "default" : "secondary"}>
                        {redacao.corrigida ? "Corrigida" : "Pendente"}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {redacao.email_aluno} • {redacao.turma}
                    </p>
                    {redacao.exercicios && (
                      <Badge variant="outline" className="mt-1">
                        {redacao.exercicios.titulo}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editingId === redacao.id ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => saveCorrection(redacao.id)}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(redacao)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <strong>Redação:</strong>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="whitespace-pre-wrap">{redacao.redacao_texto}</p>
                    </div>
                  </div>

                  {editingId === redacao.id ? (
                    <div className="space-y-4 border-t pt-4">
                      <div className="grid grid-cols-5 gap-2">
                        {['C1', 'C2', 'C3', 'C4', 'C5'].map((comp, index) => (
                          <div key={comp}>
                            <Label htmlFor={`nota_${comp.toLowerCase()}`}>{comp}</Label>
                            <Input
                              id={`nota_${comp.toLowerCase()}`}
                              type="number"
                              min="0"
                              max="200"
                              value={editData[`nota_${comp.toLowerCase()}`] || 0}
                              onChange={(e) => setEditData({
                                ...editData,
                                [`nota_${comp.toLowerCase()}`]: parseInt(e.target.value) || 0
                              })}
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <Label htmlFor="comentario">Comentário</Label>
                        <Textarea
                          id="comentario"
                          value={editData.comentario_admin || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            comentario_admin: e.target.value
                          })}
                          rows={3}
                        />
                      </div>
                    </div>
                  ) : redacao.corrigida && (
                    <div className="space-y-2 border-t pt-4">
                      <div className="grid grid-cols-5 gap-2">
                        <div>C1: {redacao.nota_c1 || 0}</div>
                        <div>C2: {redacao.nota_c2 || 0}</div>
                        <div>C3: {redacao.nota_c3 || 0}</div>
                        <div>C4: {redacao.nota_c4 || 0}</div>
                        <div>C5: {redacao.nota_c5 || 0}</div>
                      </div>
                      <div><strong>Total: {redacao.nota_total || 0}</strong></div>
                      {redacao.comentario_admin && (
                        <div>
                          <strong>Comentário:</strong>
                          <p className="mt-1">{redacao.comentario_admin}</p>
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Corrigida em: {redacao.data_correcao ? new Date(redacao.data_correcao).toLocaleString('pt-BR') : '-'}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-500">
                    Enviada em: {new Date(redacao.data_envio).toLocaleString('pt-BR')}
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
