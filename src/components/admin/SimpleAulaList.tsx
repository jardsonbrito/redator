import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ExternalLink, FileText } from "lucide-react";

interface Aula {
  id: string;
  titulo: string;
  descricao: string | null;
  modulo: string;
  link_conteudo: string;
  pdf_url: string | null;
  pdf_nome: string | null;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean | null;
  ativo: boolean | null;
  criado_em: string | null;
}

export const SimpleAulaList = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAulas = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      
      setAulas(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar aulas:", err);
      setError(err.message || "Erro ao carregar aulas");
      toast.error("Erro ao carregar aulas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;

    try {
      const { error } = await supabase
        .from("aulas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Aula excluída com sucesso!");
      fetchAulas();
    } catch (err: any) {
      console.error("Erro ao excluir aula:", err);
      toast.error("Erro ao excluir aula");
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean | null) => {
    try {
      const { error } = await supabase
        .from("aulas")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Aula ${!ativo ? 'ativada' : 'desativada'} com sucesso!`);
      fetchAulas();
    } catch (err: any) {
      console.error("Erro ao alterar status:", err);
      toast.error("Erro ao alterar status da aula");
    }
  };

  useEffect(() => {
    fetchAulas();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p>Carregando aulas...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Erro: {error}</p>
          <Button onClick={fetchAulas} className="mt-2">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Aulas Cadastradas</h2>
        <Button onClick={fetchAulas} variant="outline" size="sm">
          Atualizar
        </Button>
      </div>

      {aulas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhuma aula encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {aulas.map((aula) => (
            <Card key={aula.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {aula.titulo}
                      <Badge variant={aula.ativo ? "default" : "secondary"}>
                        {aula.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {aula.modulo}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(aula.link_conteudo, '_blank')}
                      title="Abrir conteúdo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    {aula.pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(aula.pdf_url!, '_blank')}
                        title="Abrir PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAtivo(aula.id, aula.ativo)}
                    >
                      {aula.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(aula.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {aula.descricao && (
                  <p className="text-gray-600 mb-3">{aula.descricao}</p>
                )}
                
                <div className="space-y-2">
                  {aula.turmas_autorizadas && aula.turmas_autorizadas.length > 0 && (
                    <div>
                      <strong className="text-sm">Turmas Autorizadas:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {aula.turmas_autorizadas.map((turma) => (
                          <Badge key={turma} variant="secondary" className="text-xs">
                            {turma}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {aula.permite_visitante && (
                    <Badge variant="outline" className="text-xs">
                      Permite Visitante
                    </Badge>
                  )}
                  
                  {aula.pdf_nome && (
                    <div className="text-sm">
                      <strong>Material PDF:</strong> {aula.pdf_nome}
                    </div>
                  )}
                  
                  {aula.criado_em && (
                    <div className="text-xs text-gray-500">
                      Criado em: {new Date(aula.criado_em).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};