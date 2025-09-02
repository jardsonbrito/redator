import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Phone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NovoVisitanteModalProps {
  isOpen: boolean;
  email: string;
  onComplete: (data: { nome: string; email: string; whatsapp?: string }) => void;
  loading: boolean;
}

export const NovoVisitanteModal = ({ isOpen, email, onComplete, loading }: NovoVisitanteModalProps) => {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleComplete = async () => {
    if (!nome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu nome.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      console.log('📝 Criando novo visitante:', { nome: nome.trim(), email, whatsapp: whatsapp.trim() });
      
      // Dados para criar o visitante
      const dadosVisitante = {
        nome: nome.trim(),
        email: email,
        whatsapp: whatsapp.trim() || undefined
      };

      onComplete(dadosVisitante);

    } catch (error) {
      console.error('❌ Erro ao criar visitante:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar seu acesso. Tente novamente.",
        variant: "destructive"
      });
      setSaving(false);
    }
  };

  const formatWhatsApp = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara (xx) xxxxx-xxxx
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-redator-primary">
            👋 Primeiro Acesso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center mb-6">
            <p className="text-sm text-redator-accent">
              Olá! Notei que esse é seu primeiro acesso à plataforma.
              <br />
              Vamos criar seu perfil de visitante:
            </p>
          </div>

          <div>
            <Label htmlFor="visitor-name" className="text-redator-primary font-medium">
              Nome Completo *
            </Label>
            <div className="relative">
              <Input
                id="visitor-name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo"
                className="mt-1 border-redator-accent/30 pl-10"
                disabled={saving || loading}
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          <div>
            <Label htmlFor="visitor-whatsapp" className="text-redator-primary font-medium">
              WhatsApp (Opcional)
            </Label>
            <div className="relative">
              <Input
                id="visitor-whatsapp"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="(11) 99999-9999"
                className="mt-1 border-redator-accent/30 pl-10"
                disabled={saving || loading}
                maxLength={15}
              />
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <p className="text-xs text-redator-accent mt-1">
              Para contato sobre novidades e turmas oficiais
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Email:</strong> {email}
              <br />
              <strong>Tipo de acesso:</strong> Visitante
            </p>
          </div>

          <Button 
            onClick={handleComplete}
            disabled={saving || loading}
            className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando acesso...
              </>
            ) : (
              '✨ Criar Acesso'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};