
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Upload, Coins } from "lucide-react";
import { AlunoCSVImport } from "./AlunoCSVImport";
import { useCredits } from "@/hooks/useCredits";

interface AlunoFormProps {
  onSuccess: () => void;
  alunoEditando?: any;
  onCancelEdit?: () => void;
}

export const AlunoForm = ({ onSuccess, alunoEditando, onCancelEdit }: AlunoFormProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [turma, setTurma] = useState("");
  const [creditos, setCreditos] = useState(5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { addCredits } = useCredits();

  const turmas = [
    "Turma A",
    "Turma B", 
    "Turma C",
    "Turma D",
    "Turma E"
  ];

  // Preencher formulário quando um aluno for selecionado para edição
  useEffect(() => {
    console.log("AlunoForm - useEffect chamado com alunoEditando:", alunoEditando);
    
    if (alunoEditando) {
      console.log("AlunoForm - Preenchendo formulário com dados:", {
        nome: alunoEditando.nome,
        email: alunoEditando.email,
        turma: alunoEditando.turma,
        creditos: alunoEditando.creditos
      });
      
      setNome(alunoEditando.nome || "");
      setEmail(alunoEditando.email || "");
      setTurma(alunoEditando.turma || "");
      setCreditos(alunoEditando.creditos || 5);
    } else {
      console.log("AlunoForm - Limpando formulário");
      // Limpar formulário quando não está editando
      setNome("");
      setEmail("");
      setTurma("");
      setCreditos(5);
    }
  }, [alunoEditando]);

  const isFormValid = nome.trim() && email.trim() && turma && creditos >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      if (alunoEditando) {
        console.log("AlunoForm - Modo de edição - Atualizando aluno:", alunoEditando.id);
        
        // Modo de edição - fazer UPDATE
        const dadosAluno = {
          nome: nome.trim(),
          sobrenome: "", // Mantém campo vazio para compatibilidade
          email: email.trim().toLowerCase(),
          turma,
          creditos,
          user_type: "aluno",
          is_authenticated_student: true
        };

        console.log("AlunoForm - Dados para update:", dadosAluno);

        const { error } = await supabase
          .from("profiles")
          .update(dadosAluno)
          .eq("id", alunoEditando.id);

        if (error) {
          console.error("AlunoForm - Erro no update:", error);
          throw error;
        }

        console.log("AlunoForm - Update realizado com sucesso");

        toast({
          title: "Aluno atualizado com sucesso!",
          description: `${nome} foi atualizado na ${turma} com ${creditos} créditos.`
        });
      } else {
        console.log("AlunoForm - Modo de cadastro - Criando novo aluno");
        
        // Modo de cadastro - fazer INSERT
        // Verificar se já existe aluno com este email
        const { data: existingAluno } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();

        if (existingAluno) {
          toast({
            title: "Erro",
            description: "Já existe um aluno cadastrado com este e-mail.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        const dadosAluno = {
          id: crypto.randomUUID(),
          nome: nome.trim(),
          sobrenome: "", // Mantém campo vazio para compatibilidade
          email: email.trim().toLowerCase(),
          turma,
          creditos,
          user_type: "aluno",
          is_authenticated_student: true
        };

        const { error } = await supabase
          .from("profiles")
          .insert(dadosAluno);

        if (error) throw error;

        toast({
          title: "Aluno cadastrado com sucesso!",
          description: `${nome} foi adicionado à ${turma} com ${creditos} créditos.`
        });
      }

      // Limpar formulário e sair do modo de edição
      setNome("");
      setEmail("");
      setTurma("");
      setCreditos(5);
      onSuccess();
      if (onCancelEdit) {
        console.log("AlunoForm - Chamando onCancelEdit");
        onCancelEdit();
      }

    } catch (error: any) {
      console.error("Erro ao salvar aluno:", error);
      toast({
        title: "Erro ao salvar aluno",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    console.log("AlunoForm - handleCancel chamado");
    setNome("");
    setEmail("");
    setTurma("");
    setCreditos(5);
    if (onCancelEdit) {
      console.log("AlunoForm - Chamando onCancelEdit no cancel");
      onCancelEdit();
    }
  };

  // Se está editando, mostrar apenas o formulário manual
  if (alunoEditando) {
    console.log("AlunoForm - Renderizando modo de edição para:", alunoEditando.nome);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Editar Aluno: {alunoEditando.nome}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome completo do aluno"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite o e-mail do aluno"
                required
              />
            </div>

            <div>
              <Label htmlFor="turma">Turma *</Label>
              <Select value={turma} onValueChange={setTurma} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((turmaOption) => (
                    <SelectItem key={turmaOption} value={turmaOption}>
                      {turmaOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="creditos" className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                Créditos de Redação *
              </Label>
              <Input
                id="creditos"
                type="number"
                min="0"
                value={creditos}
                onChange={(e) => setCreditos(parseInt(e.target.value) || 0)}
                placeholder="Quantidade de créditos"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Cada envio de redação consome 1 crédito por corretor selecionado
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={!isFormValid || loading}
                className="flex-1"
              >
                {loading ? "Salvando..." : "Atualizar Aluno"}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  console.log("AlunoForm - Renderizando modo normal (cadastro)");

  return (
    <Tabs defaultValue="manual" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual" className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Cadastro Manual
        </TabsTrigger>
        <TabsTrigger value="csv" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Importar via CSV
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="manual">
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar Novo Aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome completo do aluno"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o e-mail do aluno"
                  required
                />
              </div>

              <div>
                <Label htmlFor="turma">Turma *</Label>
                <Select value={turma} onValueChange={setTurma} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((turmaOption) => (
                      <SelectItem key={turmaOption} value={turmaOption}>
                        {turmaOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="creditos" className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  Créditos de Redação *
                </Label>
                <Input
                  id="creditos"
                  type="number"
                  min="0"
                  value={creditos}
                  onChange={(e) => setCreditos(parseInt(e.target.value) || 0)}
                  placeholder="Quantidade de créditos (padrão: 5)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cada envio de redação consome 1 crédito por corretor selecionado
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={!isFormValid || loading}
                className="w-full"
              >
                {loading ? "Salvando..." : "Cadastrar Aluno"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="csv">
        <AlunoCSVImport onSuccess={onSuccess} />
      </TabsContent>
    </Tabs>
  );
};
