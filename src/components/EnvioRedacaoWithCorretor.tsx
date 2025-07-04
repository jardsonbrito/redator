
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
import { useCredits } from "@/hooks/useCredits";

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
    frase_tematica: fraseTematica || "",
    redacao_texto: "",
  });
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const { toast } = useToast();
  const { consumeCreditsByEmail } = useCredits();

  // Obter dados do usuário logado automaticamente
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");
  
  let nomeCompleto = "";
  let email = "";
  let turmaCode = "visitante";
  
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "visitante";
    nomeCompleto = `Aluno da ${alunoTurma}`;
    email = `aluno.${turmaCode.toLowerCase()}@laboratoriodoredator.com`;
  } else if (userType === "visitante" && visitanteData) {
    const dados = JSON.parse(visitanteData);
    nomeCompleto = dados.nome || "";
    email = dados.email || "";
    turmaCode = "visitante";
  }

  const validateForm = () => {
    if (!formData.redacao_texto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, escreva sua redação.",
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

    if (!email || !nomeCompleto) {
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível identificar o usuário logado. Faça login novamente.",
        variant: "destructive",
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
      // Primeiro, consumir os créditos
      const creditsConsumed = await consumeCreditsByEmail(email, selectedCorretores.length);
      
      if (!creditsConsumed) {
        toast({
          title: "Créditos insuficientes",
          description: "Você não possui créditos suficientes para este envio.",
          variant: "destructive",
        });
        setShowCreditDialog(false);
        return;
      }

      const redacaoData = {
        nome_aluno: nomeCompleto,
        email_aluno: email.toLowerCase(),
        turma: turmaCode,
        frase_tematica: fraseTematica || formData.frase_tematica.trim(),
        redacao_texto: formData.redacao_texto.trim(),
        corretor_id_1: selectedCorretores[0] || null,
        corretor_id_2: selectedCorretores[1] || null,
        tipo_envio: isSimulado ? 'simulado' : (exercicioId ? 'exercicio' : 'regular'),
        status: 'aguardando',
        corrigida: false,
        status_corretor_1: 'pendente',
        status_corretor_2: selectedCorretores[1] ? 'pendente' : null,
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
        description: `Sua redação foi enviada e será corrigida pelos corretores selecionados. ${selectedCorretores.length} crédito(s) foram consumidos.`,
      });

      // Limpar formulário
      setFormData({
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
            {/* Informações do usuário logado - apenas visualização */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">📋 Dados do envio (automático)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700">👤 Nome:</span> {nomeCompleto}
                </div>
                <div>
                  <span className="font-medium text-blue-700">📧 E-mail:</span> {email}
                </div>
                <div>
                  <span className="font-medium text-blue-700">🏫 Turma:</span> {turmaCode}
                </div>
                <div>
                  <span className="font-medium text-blue-700">🎯 Tipo:</span> {
                    isSimulado ? 'Simulado' : (exercicioId ? 'Exercício' : 'Regular')
                  }
                </div>
              </div>
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
        userEmail={email}
        selectedCorretores={selectedCorretores}
      />
    </>
  );
};
