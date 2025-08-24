
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TurmaSelector } from '@/components/TurmaSelector';

interface SimuladoEditando {
  id: string;
  titulo: string;
  tema_id?: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  turmas_autorizadas?: string[];
  permite_visitante?: boolean;
  ativo?: boolean;
}

interface SimuladoFormProps {
  simuladoEditando?: SimuladoEditando | null;
  onSuccess?: () => void;
  onCancelEdit?: () => void;
}

export const SimuladoForm = ({ simuladoEditando, onSuccess, onCancelEdit }: SimuladoFormProps) => {
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

  // Preencher formulário ao editar
  useEffect(() => {
    if (simuladoEditando) {
      setFormData({
        titulo: simuladoEditando.titulo || '',
        tema_id: simuladoEditando.tema_id || '',
        data_inicio: simuladoEditando.data_inicio || '',
        hora_inicio: simuladoEditando.hora_inicio || '',
        data_fim: simuladoEditando.data_fim || '',
        hora_fim: simuladoEditando.hora_fim || '',
        turmas_autorizadas: simuladoEditando.turmas_autorizadas || [],
        permite_visitante: simuladoEditando.permite_visitante || false,
        ativo: simuladoEditando.ativo !== false
      });
    }
  }, [simuladoEditando]);


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

  const handleTurmasChange = (turmas: string[]) => {
    setFormData(prev => ({
      ...prev,
      turmas_autorizadas: turmas
    }));
  };

  const handlePermiteVisitanteChange = (permite: boolean) => {
    setFormData(prev => ({
      ...prev,
      permite_visitante: permite
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

      let error;

      if (simuladoEditando) {
        // Atualizar simulado existente
        const result = await supabase
          .from('simulados')
          .update(dataToInsert)
          .eq('id', simuladoEditando.id);
        error = result.error;
      } else {
        // Criar novo simulado
        const result = await supabase
          .from('simulados')
          .insert([dataToInsert]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: simuladoEditando ? "✅ Simulado atualizado!" : "✅ Simulado criado!",
        description: simuladoEditando ? "O simulado foi atualizado com sucesso." : "O simulado foi cadastrado com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ['admin-simulados'] });

      if (onSuccess) {
        onSuccess();
      }

      // Limpar formulário se não estiver editando
      if (!simuladoEditando) {
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
      }

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {simuladoEditando ? "Editar Simulado" : "Criar Novo Simulado"}
          {simuladoEditando && onCancelEdit && (
            <Button variant="outline" onClick={onCancelEdit} size="sm">
              Cancelar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
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

      <TurmaSelector
        selectedTurmas={formData.turmas_autorizadas}
        onTurmasChange={handleTurmasChange}
        permiteeVisitante={formData.permite_visitante}
        onPermiteVisitanteChange={handlePermiteVisitanteChange}
      />

          <Button type="submit" disabled={loading} className="w-full">
            {loading 
              ? (simuladoEditando ? 'Salvando...' : 'Criando simulado...')
              : (simuladoEditando ? 'Salvar Alterações' : 'Criar Simulado')
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
