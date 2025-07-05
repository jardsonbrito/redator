
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

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
}

interface AulaFormProps {
  aulaEditando?: Aula | null;
  onSuccess: () => void;
  onCancelEdit: () => void;
}

export const AulaForm = ({ aulaEditando, onSuccess, onCancelEdit }: AulaFormProps) => {
  const [titulo, setTitulo] = useState(aulaEditando?.titulo || "");
  const [modulo, setModulo] = useState(aulaEditando?.modulo || "");
  const [descricao, setDescricao] = useState(aulaEditando?.descricao || "");
  const [linkConteudo, setLinkConteudo] = useState(aulaEditando?.link_conteudo || "");
  const [pdfUrl, setPdfUrl] = useState(aulaEditando?.pdf_url || "");
  const [pdfNome, setPdfNome] = useState(aulaEditando?.pdf_nome || "");
  const [turmasAutorizadas, setTurmasAutorizadas] = useState<string[]>(
    aulaEditando?.turmas_autorizadas || []
  );
  const [permiteVisitante, setPermiteVisitante] = useState(
    aulaEditando?.permite_visitante || false
  );
  const [ativo, setAtivo] = useState(aulaEditando?.ativo !== false);
  const [loading, setLoading] = useState(false);

  const turmasDisponiveis = ["Turma A", "Turma B", "Turma C", "Turma D", "Turma E"];
  const modulosDisponiveis = [
    "Módulo 1", "Módulo 2", "Módulo 3", "Módulo 4", "Módulo 5",
    "Módulo 6", "Módulo 7", "Módulo 8", "Módulo 9", "Módulo 10"
  ];

  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      setTurmasAutorizadas([...turmasAutorizadas, turma]);
    } else {
      setTurmasAutorizadas(turmasAutorizadas.filter(t => t !== turma));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim() || !modulo || !linkConteudo.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      const aulaData = {
        titulo: titulo.trim(),
        modulo,
        descricao: descricao.trim() || null,
        link_conteudo: linkConteudo.trim(),
        pdf_url: pdfUrl.trim() || null,
        pdf_nome: pdfNome.trim() || null,
        turmas_autorizadas: turmasAutorizadas,
        permite_visitante: permiteVisitante,
        ativo
      };

      let result;
      
      if (aulaEditando) {
        result = await supabase
          .from("aulas")
          .update(aulaData)
          .eq("id", aulaEditando.id);
      } else {
        result = await supabase
          .from("aulas")
          .insert([aulaData]);
      }

      if (result.error) throw result.error;

      toast.success(aulaEditando ? "Aula atualizada com sucesso!" : "Aula criada com sucesso!");
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar aula:", error);
      toast.error("Erro ao salvar aula: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {aulaEditando ? "Editar Aula" : "Criar Nova Aula"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="titulo">Título da Aula *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Digite o título da aula"
              required
            />
          </div>

          <div>
            <Label htmlFor="modulo">Módulo *</Label>
            <Select value={modulo} onValueChange={setModulo} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o módulo" />
              </SelectTrigger>
              <SelectContent>
                {modulosDisponiveis.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {mod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="descricao">Descrição da Aula</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o conteúdo da aula"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="linkConteudo">Link do Conteúdo *</Label>
            <Input
              id="linkConteudo"
              type="url"
              value={linkConteudo}
              onChange={(e) => setLinkConteudo(e.target.value)}
              placeholder="https://exemplo.com/aula"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pdfUrl">URL do Material PDF</Label>
              <Input
                id="pdfUrl"
                type="url"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://exemplo.com/material.pdf"
              />
            </div>
            <div>
              <Label htmlFor="pdfNome">Nome do PDF</Label>
              <Input
                id="pdfNome"
                value={pdfNome}
                onChange={(e) => setPdfNome(e.target.value)}
                placeholder="Material de apoio"
              />
            </div>
          </div>

          <div>
            <Label>Turmas Autorizadas</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-2">
              {turmasDisponiveis.map((turma) => (
                <div key={turma} className="flex items-center space-x-2">
                  <Checkbox
                    id={turma}
                    checked={turmasAutorizadas.includes(turma)}
                    onCheckedChange={(checked) => 
                      handleTurmaChange(turma, checked as boolean)
                    }
                  />
                  <Label htmlFor={turma} className="text-sm">
                    {turma}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="permiteVisitante"
                checked={permiteVisitante}
                onCheckedChange={setPermiteVisitante}
              />
              <Label htmlFor="permiteVisitante">Permite visitante</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ativo"
                checked={ativo}
                onCheckedChange={setAtivo}
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : (aulaEditando ? "Atualizar Aula" : "Criar Aula")}
            </Button>
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
