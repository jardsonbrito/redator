import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CorretorSelector } from "./CorretorSelector";
import { CreditInfoDialog } from "./CreditInfoDialog";

interface EnvioRedacaoProps {
  isSimulado?: boolean;
  simuladoId?: string;
  fraseTematica?: string;
  exercicioId?: string;
  onSuccess?: () => void;
}

export const EnvioRedacaoWithCorretor = ({ 
  isSimulado = false, 
  simuladoId, 
  fraseTematica,
  exercicioId,
  onSuccess 
}: EnvioRedacaoProps) => {
  const [formData, setFormData] = useState({
    nome_aluno: "",
    email_aluno: "",
    turma: "",
    frase_tematica: fraseTematica || "",
    redacao_texto: "",
  });
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const { toast } = useToast();

  const validateForm = () => {
    if (!formData.nome_aluno.trim() || !formData.email_aluno.trim() || 
        !formData.turma.trim() || !formData.redacao_texto.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return false;
    }

    if (!fraseTematica && !formData.frase_tematica.trim()) {
      toast({
        title: "Frase temática obrigatória",
        description: "Informe a frase temática da redação.",
        variant: "destructive"
      });
      return false;
    }

    if (selectedCorretores.length === 0) {
      toast({
        title: "Selecione pelo menos um corretor",
        description: "É necessário selecionar pelo menos um corretor.",
        variant: "destructive"
      });
      return false;
    }

    if (isSimulado && selectedCorretores.length !== 2) {
      toast({
        title: "Simulado requer 2 corretores",
        description: "Para simulados, é obrigatório selecionar exatamente 2 corretores.",
        variant: "destructive"
      });
      return false;
    }

    if (selectedCorretores.length > 2) {
      toast({
        title: "Limite de corretores excedido",
        description: "Você pode selecionar no máximo 2 corretores.",
        variant: "destructive"
      });
      return false;
    }

    // Verificar duplicados
    const uniqueCorretores = new Set(selectedCorretores);
    if (uniqueCorretores.size !== selectedCorretores.length) {
      toast({
        title: "Corretores duplicados",
        description: "Não é possível selecionar o mesmo corretor duas vezes.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Mostrar dialog de créditos antes de continuar
    setShowCreditDialog(true);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);

    try {
      const redacaoData = {
        nome_aluno: formData.nome_aluno.trim(),
        email_aluno: formData.email_aluno.trim().toLowerCase(),
        turma: formData.turma.trim(),
        frase_tematica: fraseTematica || formData.frase_tematica.trim(),
        redacao_texto: formData.redacao_texto.trim(),
        corretor_id_1: selectedCorretores[0] || null,
        corretor_id_2: selectedCorretores[1] || null,
        tipo_envio: isSimulado ? 'simulado' : (exercicioId ? 'exercicio' : 'regular'),
        status: 'aguardando',
        corrigida: false,
      };

      let result;

      if (isSimulado && simuladoId) {
        // Envio de simulado
        result = await supabase
          .from("redacoes_simulado")
          .insert({
            ...redacaoData,
            id_simulado: simuladoId,
            texto: redacaoData.redacao_texto,
          });
      } else if (exercicioId) {
        // Envio de exercício
        result = await supabase
          .from("redacoes_exercicio")
          .insert({
            ...redacaoData,
            exercicio_id: exercicioId,
          });
      } else {
        // Envio regular
        result = await supabase
          .from("redacoes_enviadas")
          .insert(redacaoData);
      }

      if (result.error) throw result.error;

      toast({
        title: "Redação enviada com sucesso!",
        description: "Sua redação foi enviada e será corrigida pelos corretores selecionados.",
      });

      // Limpar formulário
      setFormData({
        nome_aluno: "",
        email_aluno: "",
        turma: "",
        frase_tematica: fraseTematica || "",
        redacao_texto: "",
      });
      setSelectedCorretores([]);
      setShowCreditDialog(false);

      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao enviar redação:", error);
      toast({
        title: "Erro ao enviar redação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Enviar Redação {isSimulado ? "- Simulado" : exercicioId ? "- Exercício" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePrimarySubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome_aluno">Nome do Aluno *</Label>
                <Input
                  id="nome_aluno"
                  value={formData.nome_aluno}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_aluno: e.target.value }))}
                  placeholder="Digite seu nome completo"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email_aluno">E-mail *</Label>
                <Input
                  id="email_aluno"
                  type="email"
                  value={formData.email_aluno}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_aluno: e.target.value }))}
                  placeholder="Digite seu e-mail"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="turma">Turma *</Label>
              <Input
                id="turma"
                value={formData.turma}
                onChange={(e) => setFormData(prev => ({ ...prev, turma: e.target.value }))}
                placeholder="Digite sua turma"
                required
              />
            </div>

            {!fraseTematica && (
              <div>
                <Label htmlFor="frase_tematica">Frase Temática *</Label>
                <Input
                  id="frase_tematica"
                  value={formData.frase_tematica}
                  onChange={(e) => setFormData(prev => ({ ...prev, frase_tematica: e.target.value }))}
                  placeholder="Digite a frase temática"
                  required
                />
              </div>
            )}

            <CorretorSelector
              selectedCorretores={selectedCorretores}
              onCorretoresChange={setSelectedCorretores}
              isSimulado={isSimulado}
              required={true}
            />

            <div>
              <Label htmlFor="redacao_texto">Texto da Redação *</Label>
              <Textarea
                id="redacao_texto"
                value={formData.redacao_texto}
                onChange={(e) => setFormData(prev => ({ ...prev, redacao_texto: e.target.value }))}
                placeholder="Digite o texto da sua redação aqui..."
                className="min-h-[300px]"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Verificar Créditos e Enviar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <CreditInfoDialog
        isOpen={showCreditDialog}
        onClose={() => setShowCreditDialog(false)}
        onProceed={handleFinalSubmit}
        userEmail={formData.email_aluno}
        selectedCorretores={selectedCorretores}
      />
    </>
  );
};
