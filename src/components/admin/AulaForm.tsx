
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AulaForm = () => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modulo, setModulo] = useState("");
  const [linkConteudo, setLinkConteudo] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfNome, setPdfNome] = useState("");
  const [turmasAutorizadas, setTurmasAutorizadas] = useState<string[]>([]);
  const [permiteVisitante, setPermiteVisitante] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const modulosDisponiveis = [
    'Competência 1',
    'Competência 2', 
    'Competência 3',
    'Competência 4',
    'Competência 5',
    'Aula ao vivo'
  ];

  const turmasDisponiveis = [
    'TURMA A', 'TURMA B', 'TURMA C', 'TURMA D', 'TURMA E',
    'TURMA F', 'TURMA G', 'TURMA H', 'TURMA I', 'TURMA J'
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
    
    if (!titulo || !descricao || !modulo || !linkConteudo) {
      toast.error("Por favor, preencha os campos obrigatórios.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("aulas")
        .insert({
          titulo,
          descricao,
          modulo,
          link_conteudo: linkConteudo,
          pdf_url: pdfUrl || null,
          pdf_nome: pdfNome || null,
          turmas_autorizadas: turmasAutorizadas,
          permite_visitante: permiteVisitante,
          ativo
        });

      if (error) throw error;

      toast.success("Aula criada com sucesso!");
      
      // Reset form
      setTitulo("");
      setDescricao("");
      setModulo("");
      setLinkConteudo("");
      setPdfUrl("");
      setPdfNome("");
      setTurmasAutorizadas([]);
      setPermiteVisitante(false);
      setAtivo(true);

    } catch (error) {
      console.error("Erro ao criar aula:", error);
      toast.error("Erro ao criar aula. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Aula</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
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
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Digite a descrição da aula"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="linkConteudo">Link do Conteúdo *</Label>
            <Input
              id="linkConteudo"
              value={linkConteudo}
              onChange={(e) => setLinkConteudo(e.target.value)}
              placeholder="https://..."
              type="url"
              required
            />
          </div>

          <div>
            <Label htmlFor="pdfUrl">URL do PDF (opcional)</Label>
            <Input
              id="pdfUrl"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div>
            <Label htmlFor="pdfNome">Nome do PDF (opcional)</Label>
            <Input
              id="pdfNome"
              value={pdfNome}
              onChange={(e) => setPdfNome(e.target.value)}
              placeholder="Nome do arquivo PDF"
            />
          </div>

          <div>
            <Label>Turmas Autorizadas</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {turmasDisponiveis.map((turma) => (
                <div key={turma} className="flex items-center space-x-2">
                  <Checkbox
                    id={turma}
                    checked={turmasAutorizadas.includes(turma)}
                    onCheckedChange={(checked) => handleTurmaChange(turma, checked as boolean)}
                  />
                  <Label htmlFor={turma} className="text-sm">
                    {turma}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="permiteVisitante"
              checked={permiteVisitante}
              onCheckedChange={(checked) => setPermiteVisitante(checked as boolean)}
            />
            <Label htmlFor="permiteVisitante">
              Permite visitante
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="ativo"
              checked={ativo}
              onCheckedChange={(checked) => setAtivo(checked as boolean)}
            />
            <Label htmlFor="ativo">
              Ativo
            </Label>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Criando..." : "Criar Aula"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
