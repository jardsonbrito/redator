
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileImage, FileText } from "lucide-react";

interface CorretorFormProps {
  onSuccess?: () => void;
  corretorEditando?: any;
  onCancelEdit?: () => void;
}

export const CorretorForm = ({ onSuccess, corretorEditando, onCancelEdit }: CorretorFormProps) => {
  const [formData, setFormData] = useState({
    nome_completo: corretorEditando?.nome_completo || "",
    email: corretorEditando?.email || "",
    aceita_manuscrita: corretorEditando?.aceita_manuscrita ?? true,
    aceita_digitada: corretorEditando?.aceita_digitada ?? true,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_completo.trim() || !formData.email.trim()) {
      toast({
        title: "Erro de validação",
        description: "Todos os campos são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!formData.aceita_manuscrita && !formData.aceita_digitada) {
      toast({
        title: "Configuração inválida",
        description: "O corretor precisa aceitar pelo menos um tipo de redação.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (corretorEditando) {
        const { error } = await supabase
          .from("corretores")
          .update({
            nome_completo: formData.nome_completo.trim(),
            email: formData.email.trim().toLowerCase(),
            aceita_manuscrita: formData.aceita_manuscrita,
            aceita_digitada: formData.aceita_digitada,
          })
          .eq("id", corretorEditando.id);

        if (error) throw error;

        toast({
          title: "Corretor atualizado com sucesso!",
          description: "Os dados do corretor foram atualizados.",
        });
      } else {
        const { error } = await supabase
          .from("corretores")
          .insert({
            nome_completo: formData.nome_completo.trim(),
            email: formData.email.trim().toLowerCase(),
            aceita_manuscrita: formData.aceita_manuscrita,
            aceita_digitada: formData.aceita_digitada,
          });

        if (error) throw error;

        toast({
          title: "Corretor cadastrado com sucesso!",
          description: "O corretor foi adicionado ao sistema.",
        });
      }

      setFormData({ nome_completo: "", email: "", aceita_manuscrita: true, aceita_digitada: true });
      onSuccess?.();
      onCancelEdit?.();
    } catch (error: any) {
      console.error("Erro ao salvar corretor:", error);
      toast({
        title: "Erro ao salvar corretor",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ nome_completo: "", email: "", aceita_manuscrita: true, aceita_digitada: true });
    onCancelEdit?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {corretorEditando ? "Editar Corretor" : "Adicionar Novo Corretor"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome_completo">Nome Completo *</Label>
            <Input
              id="nome_completo"
              value={formData.nome_completo}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
              placeholder="Digite o nome completo do corretor"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Digite o e-mail do corretor"
              required
            />
          </div>

          {/* Tipos de redação aceitos */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <Label className="text-sm font-semibold">Tipos de redação aceitos</Label>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Manuscrita / Foto</span>
              </div>
              <Switch
                checked={formData.aceita_manuscrita}
                onCheckedChange={(val) => setFormData(prev => ({ ...prev, aceita_manuscrita: val }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Digitada</span>
              </div>
              <Switch
                checked={formData.aceita_digitada}
                onCheckedChange={(val) => setFormData(prev => ({ ...prev, aceita_digitada: val }))}
              />
            </div>

            {!formData.aceita_manuscrita && !formData.aceita_digitada && (
              <p className="text-xs text-destructive mt-1">
                Habilite pelo menos um tipo para que o corretor receba redações.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : (corretorEditando ? "Atualizar" : "Cadastrar")}
            </Button>
            {corretorEditando && (
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
