
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CorretorSelector } from "./CorretorSelector";
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
  const [redacaoTexto, setRedacaoTexto] = useState("");
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get user data automatically
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
    
    // Buscar nome real do aluno no banco de dados
    const fetchRealStudentName = async () => {
      const studentEmail = `aluno.${turmaCode.toLowerCase()}@laboratoriodoredator.com`;
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, sobrenome')
        .eq('email', studentEmail)
        .single();
      
      if (profile) {
        return `${profile.nome} ${profile.sobrenome}`.trim();
      }
      return `Aluno da ${alunoTurma}`;
    };
    
    // Para agora, usar nome padrão e depois buscar o real
    nomeCompleto = `Aluno da ${alunoTurma}`;
    email = `aluno.${turmaCode.toLowerCase()}@laboratoriodoredator.com`;
  } else if (userType === "visitante" && visitanteData) {
    const dados = JSON.parse(visitanteData);
    nomeCompleto = dados.nome || "";
    email = dados.email || "";
    turmaCode = "visitante";
  }

  const validateForm = () => {
    if (!redacaoTexto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, escreva sua redação.",
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

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Buscar nome real do aluno se for aluno autenticado
      let finalNomeAluno = nomeCompleto;
      if (userType === "aluno" && alunoTurma) {
        const studentEmail = `aluno.${turmaCode.toLowerCase()}@laboratoriodoredator.com`;
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome, sobrenome')
          .eq('email', studentEmail)
          .single();
        
        if (profile) {
          finalNomeAluno = `${profile.nome} ${profile.sobrenome}`.trim();
        }
      }

      const redacaoData = {
        nome_aluno: finalNomeAluno,
        email_aluno: email.toLowerCase(),
        turma: turmaCode,
        frase_tematica: fraseTematica || "Tema livre",
        redacao_texto: redacaoTexto.trim(),
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
        result = await supabase
          .from("redacoes_simulado")
          .insert({
            ...redacaoData,
            id_simulado: simuladoId,
            texto: redacaoData.redacao_texto,
          });
      } else if (exercicioId) {
        result = await supabase
          .from("redacoes_exercicio")
          .insert({
            ...redacaoData,
            exercicio_id: exercicioId,
          });
      } else {
        result = await supabase
          .from("redacoes_enviadas")
          .insert(redacaoData);
      }

      if (result.error) throw result.error;

      toast({
        title: "✉️ Redação enviada com sucesso!",
        description: "Ela aparecerá em breve no campo Minhas Redações na tela inicial.",
      });

      // Clear form
      setRedacaoTexto("");
      setSelectedCorretores([]);

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
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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
              value={redacaoTexto}
              onChange={(e) => setRedacaoTexto(e.target.value)}
              placeholder="Digite o texto da sua redação aqui..."
              className="min-h-[300px]"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar Redação"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
