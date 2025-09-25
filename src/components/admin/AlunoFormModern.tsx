import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AlunoCSVImport } from "./AlunoCSVImport";
import { AlunoSelfServiceModern } from "./AlunoSelfServiceModern";

interface AlunoFormModernProps {
  onSuccess: () => void;
  alunoEditando?: any;
  onCancelEdit?: () => void;
}

export const AlunoFormModern = ({ onSuccess, alunoEditando, onCancelEdit }: AlunoFormModernProps) => {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('cm');
  const { toast } = useToast();

  // Estados do formulário manual
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    turma: ''
  });

  const turmas = [
    "TURMA A",
    "TURMA B",
    "TURMA C",
    "TURMA D",
    "TURMA E"
  ];

  // Preencher formulário quando um aluno for selecionado para edição
  useEffect(() => {
    if (alunoEditando) {
      setFormData({
        nome: alunoEditando.nome || '',
        email: alunoEditando.email || '',
        turma: alunoEditando.turma || ''
      });
      setActiveSection('cm');
    } else {
      setFormData({
        nome: '',
        email: '',
        turma: ''
      });
    }
  }, [alunoEditando]);

  const isFormValid = () => {
    return formData.nome.trim() && formData.email.trim() && formData.turma;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setLoading(true);
    try {
      if (alunoEditando) {
        // Modo de edição - fazer UPDATE
        const dadosAluno = {
          nome: formData.nome.trim(),
          sobrenome: "", // Mantém campo vazio para compatibilidade
          email: formData.email.trim().toLowerCase(),
          turma: formData.turma,
          user_type: "aluno",
          is_authenticated_student: true,
          ativo: true // Cadastros manuais são sempre ativos
        };

        const { error } = await supabase
          .from("profiles")
          .update(dadosAluno)
          .eq("id", alunoEditando.id);

        if (error) {
          throw error;
        }

        toast({
          title: "Aluno atualizado com sucesso!",
          description: `${formData.nome} foi atualizado na ${formData.turma}.`
        });

        // Chama onSuccess para atualizar a lista
        onSuccess();
      } else {
        // Modo de cadastro - fazer INSERT
        // Verificar se já existe aluno com este email
        const { data: existingAluno } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", formData.email.trim().toLowerCase())
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
          nome: formData.nome.trim(),
          sobrenome: "", // Mantém campo vazio para compatibilidade
          email: formData.email.trim().toLowerCase(),
          turma: formData.turma,
          user_type: "aluno",
          is_authenticated_student: true,
          ativo: true // Cadastros manuais são sempre ativos
        };

        const { error } = await supabase
          .from("profiles")
          .insert(dadosAluno);

        if (error) throw error;

        toast({
          title: "Aluno cadastrado com sucesso!",
          description: `${formData.nome} foi adicionado à ${formData.turma}.`
        });

        // Chama onSuccess para atualizar a lista
        onSuccess();
      }

      // Limpar formulário e sair do modo de edição (somente no modo cadastro)
      if (!alunoEditando) {
        setFormData({
          nome: '',
          email: '',
          turma: ''
        });
      }

      if (onCancelEdit) {
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
    setFormData({
      nome: '',
      email: '',
      turma: ''
    });
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  // Se está editando, mostrar apenas o formulário manual
  if (alunoEditando) {
    return (
      <div className="min-h-screen" style={{ background: '#f7f7fb' }}>
        <div className="max-w-6xl mx-auto p-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            {/* Header com botões de ação */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Editar Aluno: {alunoEditando.nome}
              </h2>

              <div className="flex gap-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !isFormValid()}
                  className="bg-[#3F0077] text-white hover:bg-[#662F96]"
                >
                  {loading ? 'Salvando...' : 'Atualizar Aluno'}
                </Button>
              </div>
            </div>

            {/* Content area */}
            <div className="p-5">
              <div className="space-y-4">
                {/* Nome */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    className="text-sm mt-2"
                    spellCheck={true}
                  />
                </div>

                {/* Email */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="text-sm mt-2"
                  />
                </div>

                {/* TURMA */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="turma">TURMA</Label>
                  <Select
                    value={formData.turma}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, turma: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'cm', label: 'CM' },
    { id: 'importar', label: 'Importar' },
    { id: 'autoatendimento', label: 'Autoatendimento' }
  ];

  const toggleSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  return (
    <div className="min-h-screen" style={{ background: '#f7f7fb' }}>
      <div className="max-w-6xl mx-auto p-5">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Header com chips de navegação */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeSection === section.id
                      ? "text-white"
                      : "text-white",
                    activeSection === section.id
                      ? "bg-[#662F96]"
                      : "bg-[#B175FF] hover:bg-[#662F96]"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="p-5">
            {/* CM Section (Cadastro Manual) */}
            {activeSection === 'cm' && (
              <div className="space-y-4">
                {/* Nome */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    className="text-sm mt-2"
                    spellCheck={true}
                  />
                </div>

                {/* Email */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="text-sm mt-2"
                  />
                </div>

                {/* TURMA */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Label htmlFor="turma">TURMA</Label>
                  <Select
                    value={formData.turma}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, turma: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
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

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !isFormValid()}
                    className="bg-[#3F0077] text-white hover:bg-[#662F96]"
                  >
                    {loading ? 'Salvando...' : 'Cadastrar Aluno'}
                  </Button>
                </div>
              </div>
            )}

            {/* Importar Section */}
            {activeSection === 'importar' && (
              <div>
                <AlunoCSVImport onSuccess={onSuccess} />
              </div>
            )}

            {/* Autoatendimento Section */}
            {activeSection === 'autoatendimento' && (
              <div>
                <AlunoSelfServiceModern onSuccess={onSuccess} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};