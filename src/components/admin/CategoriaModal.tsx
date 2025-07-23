import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CategoriaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CategoriaModal = ({ open, onOpenChange }: CategoriaModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    nome: '',
    ordem: '',
    ativa: true
  });

  const generateSlug = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-'); // Substitui espaços por hífens
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da categoria é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const slug = generateSlug(formData.nome);
      const ordem = formData.ordem ? parseInt(formData.ordem) : 999;

      const { error } = await supabase
        .from('categorias')
        .insert([{
          nome: formData.nome.trim(),
          slug,
          ordem,
          ativa: formData.ativa
        }]);

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Erro ao criar categoria: ${error.message}`);
      }

      toast({
        title: "✅ Categoria criada!",
        description: "A nova categoria foi adicionada com sucesso.",
      });

      // Invalidar queries para atualizar as listas
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      
      // Limpar formulário e fechar modal
      setFormData({
        nome: '',
        ordem: '',
        ativa: true
      });
      onOpenChange(false);

    } catch (error: any) {
      console.error('Erro ao criar categoria:', error);
      toast({
        title: "❌ Erro ao criar categoria",
        description: error.message || "Não foi possível criar a categoria.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Categoria *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              placeholder="Ex: Livro Digital, Apostila, etc."
              required
            />
          </div>

          <div>
            <Label htmlFor="ordem">Ordem de Exibição (opcional)</Label>
            <Input
              id="ordem"
              type="number"
              value={formData.ordem}
              onChange={(e) => setFormData({...formData, ordem: e.target.value})}
              placeholder="999"
              min="1"
              max="9999"
            />
            <p className="text-sm text-gray-500 mt-1">
              Menor número = aparece primeiro na lista
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="ativa"
              checked={formData.ativa}
              onCheckedChange={(checked) => setFormData({...formData, ativa: !!checked})}
            />
            <Label htmlFor="ativa">Categoria ativa</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};