import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { useToast } from '@/hooks/use-toast';

interface Corretor {
  id: string;
  nome_completo: string;
}

interface NovaConversaProps {
  alunoId: string;
  onVoltar: () => void;
  onConversaCriada: (corretorId: string, corretorNome: string) => void;
}

export const NovaConversa = ({ alunoId, onVoltar, onConversaCriada }: NovaConversaProps) => {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [corretorSelecionado, setCorretorSelecionado] = useState<string>('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const { enviarMensagem } = useAjudaRapida();
  const { toast } = useToast();

  useEffect(() => {
    const buscarCorretores = async () => {
      try {
        const { data, error } = await supabase
          .from('corretores')
          .select('id, nome_completo')
          .eq('ativo', true)
          .order('nome_completo');

        if (error) throw error;
        setCorretores(data || []);
      } catch (error) {
        console.error('Erro ao buscar corretores:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os corretores",
          variant: "destructive"
        });
      }
    };

    buscarCorretores();
  }, []);

  const handleEnviar = async () => {
    if (!corretorSelecionado || !mensagem.trim()) {
      toast({
        title: "Atenção",
        description: "Selecione um corretor e digite uma mensagem",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await enviarMensagem(alunoId, corretorSelecionado, mensagem.trim(), 'aluno');
      
      const corretorNome = corretores.find(c => c.id === corretorSelecionado)?.nome_completo || '';
      onConversaCriada(corretorSelecionado, corretorNome);
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onVoltar}
              className="mr-4 p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle>Nova Conversa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Selecione um corretor
              </label>
              <Select value={corretorSelecionado} onValueChange={setCorretorSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um corretor..." />
                </SelectTrigger>
                <SelectContent>
                  {corretores.map((corretor) => (
                    <SelectItem key={corretor.id} value={corretor.id}>
                      {corretor.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Sua mensagem
              </label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite sua dúvida ou mensagem..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleEnviar}
                disabled={loading || !corretorSelecionado || !mensagem.trim()}
                className="rounded-full w-12 h-12 p-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};