import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, Search } from "lucide-react";

interface RedacaoEnviada {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  frase_tematica: string;
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
  status: string;
  tipo_envio: string;
}

export const RedacaoEnviadaForm = () => {
  const [redacoes, setRedacoes] = useState<RedacaoEnviada[]>([]);
  const [filteredRedacoes, setFilteredRedacoes] = useState<RedacaoEnviada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoEnviada | null>(null);
  const [nota_c1, setNotaC1] = useState("");
  const [nota_c2, setNotaC2] = useState("");
  const [nota_c3, setNotaC3] = useState("");
  const [nota_c4, setNotaC4] = useState("");
  const [nota_c5, setNotaC5] = useState("");
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchRedacoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("redacoes_enviadas")
        .select("*")
        .eq("tipo_envio", "regular")
        .order("data_envio", { ascending: false });

      if (error) throw error;

      setRedacoes(data || []);
      setFilteredRedacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar redações:", error);
      toast({
        title: "Erro ao carregar redações",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedacoes();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRedacoes(redacoes);
      return;
    }

    const filtered = redacoes.filter(redacao => 
      redacao.nome_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redacao.email_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redacao.turma.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redacao.frase_tematica.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredRedacoes(filtered);
  }, [searchTerm, redacoes]);

  const handleCorrection = (redacao: RedacaoEnviada) => {
    setSelectedRedacao(redacao);
    setNotaC1(redacao.nota_c1?.toString() || "");
    setNotaC2(redacao.nota_c2?.toString() || "");
    setNotaC3(redacao.nota_c3?.toString() || "");
    setNotaC4(redacao.nota_c4?.toString() || "");
    setNotaC5(redacao.nota_c5?.toString() || "");
    setComentario(redacao.comentario_admin || "");
  };

  const handleSubmitCorrection = async () => {
    if (!selectedRedacao) return;

    const c1 = parseInt(nota_c1) || 0;
    const c2 = parseInt(nota_c2) || 0;
    const c3 = parseInt(nota_c3) || 0;
    const c4 = parseInt(nota_c4) || 0;
    const c5 = parseInt(nota_c5) || 0;
    const total = c1 + c2 + c3 + c4 + c5;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("redacoes_enviadas")
        .update({
          nota_c1: c1,
          nota_c2: c2,
          nota_c3: c3,
          nota_c4: c4,
          nota_c5: c5,
          nota_total: total,
          comentario_admin: comentario,
          corrigida: true,
          data_correcao: new Date().toISOString(),
          status: "corrigido"
        })
        .eq("id", selectedRedacao.id);

      if (error) throw error;

      toast({
        title: "Correção salva com sucesso!",
        description: `Redação de ${selectedRedacao.nome_aluno} foi corrigida.`
      });

      setSelectedRedacao(null);
      setNotaC1("");
      setNotaC2("");
      setNotaC3("");
      setNotaC4("");
      setNotaC5("");
      setComentario("");
      fetchRedacoes();
    } catch (error: any) {
      console.error("Erro ao salvar correção:", error);
      toast({
        title: "Erro ao salvar correção",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRedacao = async (redacao: RedacaoEnviada) => {
    try {
      const { error } = await supabase
        .from("redacoes_enviadas")
        .delete()
        .eq("id", redacao.id);

      if (error) throw error;

      toast({
        title: "Redação excluída com sucesso!",
        description: `A redação de ${redacao.nome_aluno} foi removida do sistema.`
      });

      fetchRedacoes();
    } catch (error: any) {
      console.error("Erro ao excluir redação:", error);
      toast({
        title: "Erro ao excluir redação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string, corrigida: boolean) => {
    if (corrigida || status === "corrigido") return "bg-green-100 text-green-800";
    if (status === "aguardando") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getTurmaColor = (turma: string) => {
    const colors = {
      "Turma A": "bg-blue-100 text-blue-800",
      "Turma B": "bg-green-100 text-green-800", 
      "Turma C": "bg-purple-100 text-purple-800",
      "Turma D": "bg-orange-100 text-orange-800",
      "Turma E": "bg-pink-100 text-pink-800",
      "Visitante": "bg-gray-100 text-gray-800"
    };
    return colors[turma as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (selectedRedacao) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Corrigir Redação - {selectedRedacao.nome_aluno}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Aluno:</strong> {selectedRedacao.nome_aluno}</div>
            <div><strong>E-mail:</strong> {selectedRedacao.email_aluno}</div>
            <div><strong>Turma:</strong> {selectedRedacao.turma}</div>
            <div><strong>Data de Envio:</strong> {new Date(selectedRedacao.data_envio).toLocaleDateString('pt-BR')}</div>
          </div>

          <div>
            <Label className="text-base font-semibold">Tema:</Label>
            <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedRedacao.frase_tematica}</p>
          </div>

          <div>
            <Label className="text-base font-semibold">Texto da Redação:</Label>
            <div className="mt-1 p-4 bg-gray-50 rounded-md max-h-96 overflow-y-auto whitespace-pre-wrap">
              {selectedRedacao.redacao_texto}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label htmlFor="nota_c1">Competência 1 (0-200)</Label>
              <Input
                id="nota_c1"
                type="number"
                min="0"
                max="200"
                value={nota_c1}
                onChange={(e) => setNotaC1(e.target.value)}
                placeholder="0-200"
              />
            </div>
            <div>
              <Label htmlFor="nota_c2">Competência 2 (0-200)</Label>
              <Input
                id="nota_c2"
                type="number"
                min="0"
                max="200"
                value={nota_c2}
                onChange={(e) => setNotaC2(e.target.value)}
                placeholder="0-200"
              />
            </div>
            <div>
              <Label htmlFor="nota_c3">Competência 3 (0-200)</Label>
              <Input
                id="nota_c3"
                type="number"
                min="0"
                max="200"
                value={nota_c3}
                onChange={(e) => setNotaC3(e.target.value)}
                placeholder="0-200"
              />
            </div>
            <div>
              <Label htmlFor="nota_c4">Competência 4 (0-200)</Label>
              <Input
                id="nota_c4"
                type="number"
                min="0"
                max="200"
                value={nota_c4}
                onChange={(e) => setNotaC4(e.target.value)}
                placeholder="0-200"
              />
            </div>
            <div>
              <Label htmlFor="nota_c5">Competência 5 (0-200)</Label>
              <Input
                id="nota_c5"
                type="number"
                min="0"
                max="200"
                value={nota_c5}
                onChange={(e) => setNotaC5(e.target.value)}
                placeholder="0-200"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-md">
            <strong>Nota Total: {(parseInt(nota_c1) || 0) + (parseInt(nota_c2) || 0) + (parseInt(nota_c3) || 0) + (parseInt(nota_c4) || 0) + (parseInt(nota_c5) || 0)}/1000</strong>
          </div>

          <div>
            <Label htmlFor="comentario">Comentário Pedagógico (opcional)</Label>
            <Textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Digite aqui seus comentários sobre a redação..."
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleSubmitCorrection}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? "Salvando..." : "Salvar Correção"}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setSelectedRedacao(null)}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Redações Enviadas - Tema Livre
          <Badge variant="secondary">{filteredRedacoes.length} redação(ões)</Badge>
        </CardTitle>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome, e-mail, turma ou tema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Carregando redações...</div>
        ) : filteredRedacoes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "Nenhuma redação encontrada com os critérios de busca." : "Nenhuma redação enviada ainda."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Tema</TableHead>
                  <TableHead>Data Envio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRedacoes.map((redacao) => (
                  <TableRow key={redacao.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{redacao.nome_aluno}</div>
                        <div className="text-sm text-gray-500">{redacao.email_aluno}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTurmaColor(redacao.turma)}>
                        {redacao.turma}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={redacao.frase_tematica}>
                        {redacao.frase_tematica}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(redacao.status, redacao.corrigida)}>
                        {redacao.corrigida ? "Corrigida" : "Aguardando"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {redacao.nota_total ? `${redacao.nota_total}/1000` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCorrection(redacao)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {redacao.corrigida ? "Editar" : "Corrigir"}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza de que deseja excluir esta redação de <strong>{redacao.nome_aluno}</strong>?
                                <br />
                                <br />
                                <strong>Esta ação não poderá ser desfeita.</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRedacao(redacao)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
