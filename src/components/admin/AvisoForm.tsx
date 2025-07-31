
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TurmaSelector } from "@/components/TurmaSelector";
import { FileInput } from "@/components/FileInput";
import { CorretorSelector } from "@/components/CorretorSelector";

interface AvisoFormProps {
  onSuccess?: () => void;
  avisoEditando?: any;
  onCancelEdit?: () => void;
}

export const AvisoForm = ({ onSuccess, avisoEditando, onCancelEdit }: AvisoFormProps) => {
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
    status: "rascunho",
    turmasAutorizadas: [],
    corretoresDestinatarios: [],
    linkExterno: "",
    dataAgendamento: "",
    permiteVisitante: false,
  });
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // useEffect para atualizar o formulário quando avisoEditando mudar
  useEffect(() => {
    if (avisoEditando) {
      setFormData({
        titulo: avisoEditando.titulo || "",
        descricao: avisoEditando.descricao || "",
        prioridade: avisoEditando.prioridade || "media",
        status: avisoEditando.status || "rascunho",
        turmasAutorizadas: avisoEditando.turmas_autorizadas || [],
        corretoresDestinatarios: avisoEditando.corretores_destinatarios || [],
        linkExterno: avisoEditando.link_externo || "",
        dataAgendamento: avisoEditando.data_agendamento ? new Date(avisoEditando.data_agendamento).toISOString().slice(0, 16) : "",
        permiteVisitante: avisoEditando.permite_visitante || false,
      });
      setImageUrl(avisoEditando.imagem_url || null);
    } else {
      // Reset form when not editing
      setFormData({
        titulo: "",
        descricao: "",
        prioridade: "media",
        status: "rascunho",
        turmasAutorizadas: [],
        corretoresDestinatarios: [],
        linkExterno: "",
        dataAgendamento: "",
        permiteVisitante: false,
      });
      setImageUrl(null);
    }
  }, [avisoEditando]);

  // Mapeamento correto entre labels do frontend e valores do banco
  const prioridades = [
    { value: "alta", label: "Alta" },
    { value: "media", label: "Média" },
    { value: "baixa", label: "Baixa" },
  ];

  const statusOptions = [
    { value: "rascunho", label: "Rascunho" },
    { value: "publicado", label: "Publicado" },
    { value: "inativo", label: "Inativo" },
    { value: "agendado", label: "Agendado" },
  ];

  const handleImageUpload = (url: string | null) => {
    setImageUrl(url);
  };

  const isFormValid = () => {
    // Validação: pelo menos um destinatário deve estar selecionado
    const hasDestinatarios = 
      formData.turmasAutorizadas.length > 0 || 
      formData.corretoresDestinatarios.length > 0 || 
      formData.permiteVisitante;
    
    return formData.titulo.trim() && formData.descricao.trim() && hasDestinatarios;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.descricao.trim()) {
      toast({
        title: "Erro de validação",
        description: "Título e descrição são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Validação de destinatários
    const hasDestinatarios = 
      formData.turmasAutorizadas.length > 0 || 
      formData.corretoresDestinatarios.length > 0 || 
      formData.permiteVisitante;

    if (!hasDestinatarios) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos um destinatário (turma, corretor ou visitante)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Garantir que a prioridade seja enviada com o valor correto
      const prioridadeValue = formData.prioridade;
      console.log("Valor da prioridade sendo enviado:", prioridadeValue);
      console.log("Valores aceitos:", prioridades.map(p => p.value));

      const avisoData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        prioridade: prioridadeValue, // Garantir que é um dos valores aceitos
        status: formData.status,
        turmas_autorizadas: formData.turmasAutorizadas,
        corretores_destinatarios: formData.corretoresDestinatarios,
        link_externo: formData.linkExterno.trim() || null,
        data_agendamento: formData.dataAgendamento ? new Date(formData.dataAgendamento).toISOString() : null,
        imagem_url: imageUrl,
        permite_visitante: formData.permiteVisitante,
      };

      console.log("Dados completos sendo enviados:", avisoData);

      if (avisoEditando) {
        const { error } = await supabase
          .from("avisos")
          .update(avisoData)
          .eq("id", avisoEditando.id);

        if (error) throw error;

        toast({
          title: "Aviso atualizado com sucesso!",
          description: "As alterações foram salvas.",
        });
      } else {
        const { error } = await supabase
          .from("avisos")
          .insert(avisoData);

        if (error) throw error;

        toast({
          title: "Aviso criado com sucesso!",
          description: "O aviso foi adicionado ao mural.",
        });
      }

      setFormData({
        titulo: "",
        descricao: "",
        prioridade: "media",
        status: "rascunho",
        turmasAutorizadas: [],
        corretoresDestinatarios: [],
        linkExterno: "",
        dataAgendamento: "",
        permiteVisitante: false,
      });
      setImageUrl(null);

      onSuccess?.();
      onCancelEdit?.();
    } catch (error: any) {
      console.error("Erro completo ao salvar aviso:", error);
      console.error("Detalhes do erro:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        title: "Erro ao salvar aviso",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      titulo: "",
      descricao: "",
      prioridade: "media",
      status: "rascunho",
      turmasAutorizadas: [],
      corretoresDestinatarios: [],
      linkExterno: "",
      dataAgendamento: "",
      permiteVisitante: false,
    });
    setImageUrl(null);
    onCancelEdit?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {avisoEditando ? "Editar Aviso" : "Criar Novo Aviso"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Digite o título do aviso"
              required
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Digite a descrição do aviso"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="prioridade">Prioridade</Label>
            <Select
              value={formData.prioridade}
              onValueChange={(value) => {
                console.log("Prioridade selecionada:", value);
                setFormData(prev => ({ ...prev, prioridade: value }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                {prioridades.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <TurmaSelector
              selectedTurmas={formData.turmasAutorizadas}
              onTurmasChange={(turmas) => 
                setFormData(prev => ({ ...prev, turmasAutorizadas: turmas }))
              }
              permiteeVisitante={formData.permiteVisitante}
              onPermiteVisitanteChange={(permite) =>
                setFormData(prev => ({ ...prev, permiteVisitante: permite }))
              }
            />
          </div>

          <div>
            <CorretorSelector
              selectedCorretores={formData.corretoresDestinatarios}
              onCorretoresChange={(corretores) => 
                setFormData(prev => ({ ...prev, corretoresDestinatarios: corretores }))
              }
            />
          </div>

          <div>
            <Label htmlFor="linkExterno">Link Externo (opcional)</Label>
            <Input
              id="linkExterno"
              type="url"
              value={formData.linkExterno}
              onChange={(e) => setFormData(prev => ({ ...prev, linkExterno: e.target.value }))}
              placeholder="https://exemplo.com"
            />
          </div>

          <div>
            <Label htmlFor="dataAgendamento">Data de Agendamento (opcional)</Label>
            <Input
              id="dataAgendamento"
              type="datetime-local"
              value={formData.dataAgendamento}
              onChange={(e) => setFormData(prev => ({ ...prev, dataAgendamento: e.target.value }))}
            />
          </div>

          <div>
            <Label>Imagem (opcional)</Label>
            <FileInput
              onImageUpload={handleImageUpload}
              initialImageUrl={imageUrl}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={loading || !isFormValid()}
            >
              {loading ? "Salvando..." : (avisoEditando ? "Atualizar" : "Criar")}
            </Button>
            {avisoEditando && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
