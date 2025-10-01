import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, User, Plus } from "lucide-react";
import { toast } from "sonner";

export interface DestinatarioSelecionado {
  email: string;
  nome: string;
  tipo: 'aluno' | 'manual';
  turma?: string;
  turmaCodigo?: string;
}

interface InboxDestinatariosFormSimpleProps {
  onDestinatariosChange: (destinatarios: DestinatarioSelecionado[]) => void;
  destinatariosSelecionados?: DestinatarioSelecionado[];
}

export function InboxDestinatariosFormSimple({
  onDestinatariosChange,
  destinatariosSelecionados = []
}: InboxDestinatariosFormSimpleProps) {
  const [selectedDestinatarios, setSelectedDestinatarios] = useState<DestinatarioSelecionado[]>(destinatariosSelecionados);
  const [emailInput, setEmailInput] = useState("");
  const [nomeInput, setNomeInput] = useState("");

  useEffect(() => {
    onDestinatariosChange(selectedDestinatarios);
  }, [selectedDestinatarios, onDestinatariosChange]);

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    const nome = nomeInput.trim() || email.split('@')[0];

    if (!email) {
      toast.error("Digite um e-mail");
      return;
    }

    // Validação básica de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Digite um e-mail válido");
      return;
    }

    // Verificar se já existe
    if (selectedDestinatarios.some(d => d.email === email)) {
      toast.error("Este e-mail já foi adicionado");
      return;
    }

    const novoDestinatario: DestinatarioSelecionado = {
      email,
      nome,
      tipo: 'manual'
    };

    setSelectedDestinatarios(prev => [...prev, novoDestinatario]);
    setEmailInput("");
    setNomeInput("");
    toast.success(`${nome} adicionado aos destinatários`);
  };

  const handleRemoveDestinatario = (destinatario: DestinatarioSelecionado) => {
    setSelectedDestinatarios(prev =>
      prev.filter(d => d.email !== destinatario.email)
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent, field: 'email' | 'nome') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'email' && emailInput && !nomeInput) {
        // Focar no campo nome se email estiver preenchido
        document.getElementById('nome-input')?.focus();
      } else if (emailInput) {
        handleAddEmail();
      }
    }
  };

  // E-mails de exemplo para facilitar o teste
  const emailsExemplo = [
    { email: "aluno1@teste.com", nome: "João Silva" },
    { email: "aluno2@teste.com", nome: "Maria Santos" },
    { email: "aluno3@teste.com", nome: "Pedro Oliveira" },
    { email: "teste@teste.com", nome: "Usuário Teste" }
  ];

  const handleAddExemplo = (exemplo: { email: string; nome: string }) => {
    if (selectedDestinatarios.some(d => d.email === exemplo.email)) {
      toast.error("Este e-mail já foi adicionado");
      return;
    }

    const novoDestinatario: DestinatarioSelecionado = {
      email: exemplo.email,
      nome: exemplo.nome,
      tipo: 'manual'
    };

    setSelectedDestinatarios(prev => [...prev, novoDestinatario]);
    toast.success(`${exemplo.nome} adicionado aos destinatários`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Seleção de Destinatários (Modo Simplificado)</h3>

        {/* Adicionar por e-mail */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="email-input">E-mail *</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="aluno@exemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'email')}
              />
            </div>
            <div>
              <Label htmlFor="nome-input">Nome (opcional)</Label>
              <Input
                id="nome-input"
                placeholder="Nome do aluno"
                value={nomeInput}
                onChange={(e) => setNomeInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'nome')}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddEmail}
                disabled={!emailInput.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        {/* E-mails de exemplo para teste */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">E-mails de exemplo para teste:</Label>
          <div className="flex flex-wrap gap-2">
            {emailsExemplo.map((exemplo) => (
              <Button
                key={exemplo.email}
                variant="outline"
                size="sm"
                onClick={() => handleAddExemplo(exemplo)}
                disabled={selectedDestinatarios.some(d => d.email === exemplo.email)}
                className="text-xs"
              >
                {exemplo.nome} ({exemplo.email})
              </Button>
            ))}
          </div>
        </div>

        {/* Destinatários selecionados */}
        {selectedDestinatarios.length > 0 && (
          <div className="mb-6">
            <Label>Destinatários Selecionados ({selectedDestinatarios.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedDestinatarios.map((destinatario, index) => (
                <Badge key={`${destinatario.email}-${index}`} variant="secondary" className="pl-2 pr-1">
                  <User className="h-3 w-3 mr-1" />
                  {destinatario.nome}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDestinatario(destinatario)}
                    className="ml-1 h-auto p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <h4 className="font-medium mb-2">ℹ️ Modo Simplificado</h4>
          <ul className="space-y-1 text-xs">
            <li>• Use este modo se as turmas não estiverem carregando</li>
            <li>• Adicione e-mails manualmente para testar o sistema</li>
            <li>• O nome é opcional - será usado o e-mail se não informado</li>
            <li>• Use os e-mails de exemplo para testes rápidos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}