import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, Settings } from "lucide-react";

interface Props {
  userId: string;
  userEmail: string;
  currentJarvisCredits: number;
  onUpdate: () => void;
}

export const JarvisCreditManagement = ({
  userId,
  userEmail,
  currentJarvisCredits,
  onUpdate
}: Props) => {
  const [amount, setAmount] = useState<string>("");
  const [newTotal, setNewTotal] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    const qty = parseInt(amount);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Erro",
        description: "Quantidade inválida",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Buscar admin_id
      const adminSession = JSON.parse(localStorage.getItem('admin_session') || '{}');
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', adminSession.email)
        .single();

      if (!adminData) throw new Error('Admin não encontrado');

      // Adicionar créditos Jarvis
      const { data, error } = await supabase.rpc('add_jarvis_credits', {
        target_user_id: userId,
        credit_amount: qty,
        admin_user_id: adminData.id,
        reason_text: reason || 'Adição manual de créditos Jarvis'
      });

      if (error) throw error;

      toast({
        title: "✅ Créditos Jarvis Adicionados",
        description: `+${qty} créditos para ${userEmail}`,
        className: "border-green-200 bg-green-50 text-green-900"
      });

      setAmount("");
      setReason("");
      onUpdate();

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSet = async () => {
    const qty = parseInt(newTotal);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: "Erro",
        description: "Valor inválido",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const adminSession = JSON.parse(localStorage.getItem('admin_session') || '{}');
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', adminSession.email)
        .single();

      if (!adminData) throw new Error('Admin não encontrado');

      const { data, error } = await supabase.rpc('set_jarvis_credits', {
        target_user_id: userId,
        new_amount: qty,
        admin_user_id: adminData.id,
        reason_text: reason || 'Definição manual de créditos Jarvis'
      });

      if (error) throw error;

      toast({
        title: "✅ Créditos Jarvis Definidos",
        description: `Novo total: ${qty} créditos`,
        className: "border-blue-200 bg-blue-50 text-blue-900"
      });

      setNewTotal("");
      setReason("");
      onUpdate();

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          Créditos Jarvis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sistema independente do Jarvis
        </p>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Saldo Atual */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="text-sm text-indigo-700 mb-1">Saldo Atual</div>
          <div className="text-3xl font-bold text-indigo-900">
            {currentJarvisCredits}
          </div>
          <div className="text-xs text-indigo-600 mt-1">
            créditos exclusivos Jarvis
          </div>
        </div>

        {/* Adicionar Créditos */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Créditos
          </Label>
          <Input
            type="number"
            placeholder="Quantidade"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
          />
          <Textarea
            placeholder="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <Button
            onClick={handleAdd}
            disabled={loading || !amount}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? "Processando..." : "Adicionar"}
          </Button>
        </div>

        {/* Definir Total */}
        <div className="space-y-3 border-t pt-4">
          <Label className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Definir Total
          </Label>
          <Input
            type="number"
            placeholder="Novo total"
            value={newTotal}
            onChange={(e) => setNewTotal(e.target.value)}
            min="0"
          />
          <Button
            onClick={handleSet}
            disabled={loading || !newTotal}
            variant="outline"
            className="w-full"
          >
            {loading ? "Processando..." : "Definir"}
          </Button>
        </div>

        {/* Nota */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded">
          ℹ️ Estes créditos são exclusivos do Jarvis e não interferem nos
          créditos de redações.
        </div>

      </CardContent>
    </Card>
  );
};
