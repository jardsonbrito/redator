
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileImage, FileText } from "lucide-react";
import { useTurmasAtivas } from "@/hooks/useTurmasAtivas";

interface CorretorFormProps {
  onSuccess?: () => void;
  corretorEditando?: any;
  onCancelEdit?: () => void;
}

export const CorretorForm = ({ onSuccess, corretorEditando, onCancelEdit }: CorretorFormProps) => {
  const { turmasDinamicas } = useTurmasAtivas();

  const [formData, setFormData] = useState({
    nome_completo: corretorEditando?.nome_completo || "",
    email: corretorEditando?.email || "",
    aceita_manuscrita: corretorEditando?.aceita_manuscrita ?? true,
    aceita_digitada: corretorEditando?.aceita_digitada ?? true,
    turmas_autorizadas: (corretorEditando?.turmas_autorizadas as string[]) ?? [],
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (corretorEditando) {
      setFormData({
        nome_completo: corretorEditando.nome_completo || "",
        email: corretorEditando.email || "",
        aceita_manuscrita: corretorEditando.aceita_manuscrita ?? true,
        aceita_digitada: corretorEditando.aceita_digitada ?? true,
        turmas_autorizadas: (corretorEditando.turmas_autorizadas as string[]) ?? [],
      });
    } else {
      setFormData({ nome_completo: "", email: "", aceita_manuscrita: true, aceita_digitada: true, turmas_autorizadas: [] });
    }
  }, [corretorEditando]);

  const toggleTurma = (valor: string, checked: boolean) =>
    setFormData(prev => ({
      ...prev,
      turmas_autorizadas: checked
        ? [...prev.turmas_autorizadas, valor]
        : prev.turmas_autorizadas.filter(t => t !== valor),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_completo.trim() || !formData.email.trim()) {
      toast({
        title: "Erro de validação",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!formData.aceita_manuscrita && !formData.aceita_digitada) {
      toast({
        title: "Configuração inválida",
        description: "O corretor precisa aceitar pelo menos um tipo de redação.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nome_completo: formData.nome_completo.trim(),
        email: formData.email.trim().toLowerCase(),
        aceita_manuscrita: formData.aceita_manuscrita,
        aceita_digitada: formData.aceita_digitada,
        turmas_autorizadas: formData.turmas_autorizadas.length > 0 ? formData.turmas_autorizadas : null,
      };

      if (corretorEditando) {
        const { error } = await supabase
          .from("corretores")
          .update(payload)
          .eq("id", corretorEditando.id);

        if (error) throw error;

        toast({ title: "Corretor atualizado com sucesso!", description: "Os dados do corretor foram atualizados." });
      } else {
        const { error } = await supabase
          .from("corretores")
          .insert(payload);

        if (error) throw error;

        toast({ title: "Corretor cadastrado com sucesso!", description: "O corretor foi adicionado ao sistema." });
      }

      setFormData({ nome_completo: "", email: "", aceita_manuscrita: true, aceita_digitada: true, turmas_autorizadas: [] });
      onSuccess?.();
      onCancelEdit?.();
    } catch (error: any) {
      console.error("Erro ao salvar corretor:", error);
      toast({
        title: "Erro ao salvar corretor",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ nome_completo: "", email: "", aceita_manuscrita: true, aceita_digitada: true, turmas_autorizadas: [] });
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
              onChange={e => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
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
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
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
                onCheckedChange={val => setFormData(prev => ({ ...prev, aceita_manuscrita: val }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Digitada</span>
              </div>
              <Switch
                checked={formData.aceita_digitada}
                onCheckedChange={val => setFormData(prev => ({ ...prev, aceita_digitada: val }))}
              />
            </div>

            {!formData.aceita_manuscrita && !formData.aceita_digitada && (
              <p className="text-xs text-destructive mt-1">
                Habilite pelo menos um tipo para que o corretor receba redações.
              </p>
            )}
          </div>

          {/* Turmas autorizadas */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <div>
              <Label className="text-sm font-semibold">Turmas autorizadas</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define quais turmas este corretor pode atender e criar temas.
              </p>
            </div>

            {turmasDinamicas.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {turmasDinamicas.map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.turmas_autorizadas.includes(t.valor)}
                      onCheckedChange={checked => toggleTurma(t.valor, !!checked)}
                    />
                    <span className="text-sm">{t.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma turma ativa encontrada.</p>
            )}

            {formData.turmas_autorizadas.length === 0 && (
              <p className="text-xs text-amber-600">
                Sem turmas selecionadas — o corretor não poderá criar temas.
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
