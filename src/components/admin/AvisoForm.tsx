import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const turmasDisponiveis = [
  'TURMA A',
  'TURMA B', 
  'TURMA C',
  'TURMA D',
  'TURMA E',
  'TURMA F',
  'TURMA G',
  'TURMA H',
];

interface AvisoFormProps {
  onSuccess: () => void;
  avisoEditando?: any;
  onCancelEdit?: () => void;
}

export const AvisoForm = ({ onSuccess, avisoEditando, onCancelEdit }: AvisoFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    turmas_autorizadas: [],
    data_agendamento: "",
    status: "rascunho",
    imagem_url: "",
    link_externo: "",
    prioridade: "comum",
  });

  // Sincronizar formData quando avisoEditando mudar
  useEffect(() => {
    if (avisoEditando) {
      setFormData({
        titulo: avisoEditando.titulo || "",
        descricao: avisoEditando.descricao || "",
        turmas_autorizadas: avisoEditando.turmas_autorizadas || [],
        data_agendamento: avisoEditando.data_agendamento ? 
          new Date(avisoEditando.data_agendamento).toISOString().slice(0, 16) : "",
        status: avisoEditando.status || "rascunho",
        imagem_url: avisoEditando.imagem_url || "",
        link_externo: avisoEditando.link_externo || "",
        prioridade: avisoEditando.prioridade || "comum",
      });
    } else {
      setFormData({
        titulo: "",
        descricao: "",
        turmas_autorizadas: [],
        data_agendamento: "",
        status: "rascunho",
        imagem_url: "",
        link_externo: "",
        prioridade: "comum",
      });
    }
  }, [avisoEditando]);

  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        turmas_autorizadas: [...prev.turmas_autorizadas, turma]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        turmas_autorizadas: prev.turmas_autorizadas.filter(t => t !== turma)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const avisoData = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        turmas_autorizadas: formData.turmas_autorizadas,
        data_agendamento: formData.data_agendamento ? new Date(formData.data_agendamento).toISOString() : null,
        status: formData.status,
        imagem_url: formData.imagem_url || null,
        link_externo: formData.link_externo || null,
        prioridade: formData.prioridade,
      };

      let result;
      if (avisoEditando) {
        result = await supabase
          .from("avisos")
          .update(avisoData)
          .eq("id", avisoEditando.id);
      } else {
        result = await supabase
          .from("avisos")
          .insert([avisoData]);
      }

      if (result.error) throw result.error;

      toast({
        title: avisoEditando ? "Aviso atualizado!" : "Aviso criado!",
        description: avisoEditando ? 
          "O aviso foi atualizado com sucesso." : 
          "O aviso foi criado com sucesso.",
      });

      setFormData({
        titulo: "",
        descricao: "",
        turmas_autorizadas: [],
        data_agendamento: "",
        status: "rascunho",
        imagem_url: "",
        link_externo: "",
        prioridade: "comum",
      });

      if (onCancelEdit) onCancelEdit();
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar aviso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o aviso. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {avisoEditando ? "Editar Aviso" : "Criar Novo Aviso"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do Aviso *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Digite o título do aviso"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição/Texto do Aviso *</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Digite o conteúdo do aviso"
              rows={6}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Turmas com Acesso ao Aviso</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {turmasDisponiveis.map((turma) => (
                <div key={turma} className="flex items-center space-x-2">
                  <Checkbox
                    id={`turma-${turma}`}
                    checked={formData.turmas_autorizadas.includes(turma)}
                    onCheckedChange={(checked) => handleTurmaChange(turma, !!checked)}
                  />
                  <Label htmlFor={`turma-${turma}`} className="text-sm font-normal">
                    {turma}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Se nenhuma turma for selecionada, o aviso será visível para todas as turmas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_agendamento">Agendamento (opcional)</Label>
              <Input
                id="data_agendamento"
                type="datetime-local"
                value={formData.data_agendamento}
                onChange={(e) => setFormData(prev => ({ ...prev, data_agendamento: e.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <Label>Prioridade Visual</Label>
              <RadioGroup 
                value={formData.prioridade} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comum" id="comum" />
                  <Label htmlFor="comum">Aviso Comum</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="destaque" id="destaque" />
                  <Label htmlFor="destaque">Destaque</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="imagem_url">URL da Imagem (opcional)</Label>
              <Input
                id="imagem_url"
                value={formData.imagem_url}
                onChange={(e) => setFormData(prev => ({ ...prev, imagem_url: e.target.value }))}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_externo">Link Externo (opcional)</Label>
              <Input
                id="link_externo"
                value={formData.link_externo}
                onChange={(e) => setFormData(prev => ({ ...prev, link_externo: e.target.value }))}
                placeholder="https://exemplo.com"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : avisoEditando ? "Atualizar Aviso" : "Criar Aviso"}
            </Button>
            {avisoEditando && onCancelEdit && (
              <Button type="button" variant="outline" onClick={onCancelEdit}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};