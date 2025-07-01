
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';

export const SimuladoForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    titulo: '',
    tema_id: '',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
    turmas_autorizadas: [] as string[],
    permite_visitante: false,
    ativo: true
  });

  const [buscaTema, setBuscaTema] = useState('');
  const [turmaSelecionada, setTurmaSelecionada] = useState('');

  // Lista oficial de turmas do sistema - NOMES CORRETOS (sem anos)
  const turmasOficiais = [
    'Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E'
  ];

  // Buscar temas disponíveis (incluindo rascunhos para uso em simulados)
  const { data: temas, isLoading: loadingTemas } = useQuery({
    queryKey: ['admin-temas-simulado', buscaTema],
    queryFn: async () => {
      let query = supabase
        .from('temas')
        .select('*')
        .order('publicado_em', { ascending: false });

      if (buscaTema) {
        query = query.ilike('frase_tematica', `%${buscaTema}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    }
  });

  const temaEscolhido = temas?.find(tema => tema.id === formData.tema_id);

  const adicionarTurma = () => {
    if (turmaSelecionada && !formData.turmas_autorizadas.includes(turmaSelecionada)) {
      setFormData(prev => ({
        ...prev,
        turmas_autorizadas: [...prev.turmas_autorizadas, turmaSelecionada]
      }));
      setTurmaSelecionada('');
    }
  };

  const removerTurma = (turma: string) => {
    setFormData(prev => ({
      ...prev,
      turmas_autorizadas: prev.turmas_autorizadas.filter(t => t !== turma)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tema_id) {
      toast({
        title: "Erro",
        description: "Selecione um tema para o simulado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const dataToInsert = {
        titulo: formData.titulo || 'Simulado', // Valor padrão se opcional não preenchido
        tema_id: formData.tema_id,
        frase_tematica: temaEscolhido?.frase_tematica || '',
        data_inicio: formData.data_inicio,
        hora_inicio: formData.hora_inicio,
        data_fim: formData.data_fim,
        hora_fim: formData.hora_fim,
        turmas_autorizadas: formData.turmas_autorizadas,
        permite_visitante: formData.permite_visitante,
        ativo: formData.ativo
      };

      const { error } = await supabase
        .from('simulados')
        .insert([dataToInsert]);

      if (error) throw error;

      toast({
        title: "✅ Simulado criado!",
        description: "O simulado foi cadastrado com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ['admin-simulados'] });

      // Limpar formulário
      setFormData({
        titulo: '',
        tema_id: '',
        data_inicio: '',
        hora_inicio: '',
        data_fim: '',
        hora_fim: '',
        turmas_autorizadas: [],
        permite_visitante: false,
        ativo: true
      });

    } catch (error: any) {
      console.error('Erro ao criar simulado:', error);
      toast({
        title: "❌ Erro ao criar simulado",
        description: error.message || "Não foi possível criar o simulado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="titulo">Título do Simulado (opcional)</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => setFormData({...formData, titulo: e.target.value})}
          placeholder="Ex: Simulado ENEM - Novembro"
        />
        <p className="text-xs text-gray-500 mt-1">Se não preenchido, será usado "Simulado" como padrão</p>
      </div>

      <div>
        <Label htmlFor="tema">Selecionar Tema *</Label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar tema pela frase temática..."
              value={buscaTema}
              onChange={(e) => setBuscaTema(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="icon">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          {loadingTemas ? (
            <div className="text-sm text-gray-500">Carregando temas...</div>
          ) : (
            <Select value={formData.tema_id} onValueChange={(value) => setFormData({...formData, tema_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um tema" />
              </SelectTrigger>
              <SelectContent>
                {temas?.map((tema) => (
                  <SelectItem key={tema.id} value={tema.id}>
                    <div className="flex items-center gap-2">
                      <span className="truncate">{tema.frase_tematica}</span>
                      <Badge variant={tema.status === 'rascunho' ? 'secondary' : 'default'} className="text-xs">
                        {tema.status === 'rascunho' ? 'Rascunho' : 'Publicado'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {temaEscolhido && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium text-sm mb-2">Tema Selecionado:</h4>
              <p className="text-sm text-gray-700 mb-2">{temaEscolhido.frase_tematica}</p>
              <div className="flex items-center gap-2">
                <Badge variant={temaEscolhido.status === 'rascunho' ? 'secondary' : 'default'}>
                  {temaEscolhido.status === 'rascunho' ? 'Rascunho' : 'Publicado'}
                </Badge>
                <span className="text-xs text-gray-500">
                  Eixo: {temaEscolhido.eixo_tematico}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="data_inicio">Data de Início *</Label>
          <Input
            id="data_inicio"
            type="date"
            value={formData.data_inicio}
            onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="hora_inicio">Hora de Início *</Label>
          <Input
            id="hora_inicio"
            type="time"
            value={formData.hora_inicio}
            onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="data_fim">Data de Término *</Label>
          <Input
            id="data_fim"
            type="date"
            value={formData.data_fim}
            onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="hora_fim">Hora de Término *</Label>
          <Input
            id="hora_fim"
            type="time"
            value={formData.hora_fim}
            onChange={(e) => setFormData({...formData, hora_fim: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <Label>Turmas Autorizadas</Label>
        <div className="flex gap-2 mt-2">
          <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar turma" />
            </SelectTrigger>
            <SelectContent>
              {turmasOficiais.map((turma) => (
                <SelectItem key={turma} value={turma}>{turma}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={adicionarTurma} variant="outline">
            Adicionar
          </Button>
        </div>
        
        {formData.turmas_autorizadas.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.turmas_autorizadas.map((turma) => (
              <Badge key={turma} variant="secondary" className="flex items-center gap-1">
                {turma}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-500" 
                  onClick={() => removerTurma(turma)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="permite_visitante"
          checked={formData.permite_visitante}
          onCheckedChange={(checked) => setFormData({...formData, permite_visitante: !!checked})}
        />
        <Label htmlFor="permite_visitante">Permitir visitantes</Label>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Criando simulado...' : 'Criar Simulado'}
      </Button>
    </form>
  );
};
