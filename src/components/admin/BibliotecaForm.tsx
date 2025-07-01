
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface BibliotecaFormProps {
  materialEditando?: any;
  onSuccess?: () => void;
  onCancelEdit?: () => void;
}

export const BibliotecaForm = ({ materialEditando, onSuccess, onCancelEdit }: BibliotecaFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    titulo: materialEditando?.titulo || '',
    descricao: materialEditando?.descricao || '',
    competencia: materialEditando?.competencia || '',
    turmas_autorizadas: materialEditando?.turmas_autorizadas || [] as string[],
    permite_visitante: materialEditando?.permite_visitante || false,
    status: materialEditando?.status || 'publicado' as 'publicado' | 'rascunho'
  });

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');

  // Lista oficial de turmas do sistema
  const turmasOficiais = [
    'Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E'
  ];

  const competencias = ['C1', 'C2', 'C3', 'C4', 'C5'];

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setArquivo(file);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive",
      });
    }
  };

  const uploadArquivo = async (file: File): Promise<{ url: string; nome: string }> => {
    const fileExt = 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('biblioteca-pdfs')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    return {
      url: fileName,
      nome: file.name
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.competencia || (!arquivo && !materialEditando)) {
      toast({
        title: "Erro",
        description: materialEditando ? "Preencha todos os campos obrigatórios." : "Preencha todos os campos obrigatórios e selecione um arquivo PDF.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      let arquivo_url = materialEditando?.arquivo_url;
      let arquivo_nome = materialEditando?.arquivo_nome;

      // Upload do arquivo apenas se um novo foi selecionado
      if (arquivo) {
        const uploadResult = await uploadArquivo(arquivo);
        arquivo_url = uploadResult.url;
        arquivo_nome = uploadResult.nome;
      }

      if (materialEditando) {
        // Atualizar material existente
        const { error } = await supabase
          .from('biblioteca_materiais')
          .update({
            titulo: formData.titulo,
            descricao: formData.descricao || null,
            competencia: formData.competencia,
            arquivo_url,
            arquivo_nome,
            turmas_autorizadas: formData.turmas_autorizadas,
            permite_visitante: formData.permite_visitante,
            status: formData.status,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', materialEditando.id);

        if (error) {
          console.error('Database error:', error);
          throw new Error(`Erro ao atualizar: ${error.message}`);
        }

        toast({
          title: "✅ Material atualizado!",
          description: "O material foi atualizado com sucesso.",
        });
      } else {
        // Inserir novo material
        const { error } = await supabase
          .from('biblioteca_materiais')
          .insert([{
            titulo: formData.titulo,
            descricao: formData.descricao || null,
            competencia: formData.competencia,
            arquivo_url,
            arquivo_nome,
            turmas_autorizadas: formData.turmas_autorizadas,
            permite_visitante: formData.permite_visitante,
            status: formData.status
          }]);

        if (error) {
          console.error('Database error:', error);
          throw new Error(`Erro no banco de dados: ${error.message}`);
        }

        toast({
          title: "✅ Material cadastrado!",
          description: "O material foi adicionado à biblioteca com sucesso.",
        });

        // Limpar formulário apenas se for novo cadastro
        setFormData({
          titulo: '',
          descricao: '',
          competencia: '',
          turmas_autorizadas: [],
          permite_visitante: false,
          status: 'publicado'
        });
        setArquivo(null);
        
        // Limpar input de arquivo
        const fileInput = document.getElementById('arquivo') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }

      queryClient.invalidateQueries({ queryKey: ['admin-biblioteca'] });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Erro ao cadastrar material:', error);
      toast({
        title: "❌ Erro ao cadastrar material",
        description: error.message || "Não foi possível cadastrar o material.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {materialEditando && onCancelEdit && (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Editar Material</h2>
          <Button type="button" onClick={onCancelEdit} variant="outline">
            Cancelar
          </Button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="titulo">Título do Material *</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => setFormData({...formData, titulo: e.target.value})}
          placeholder="Ex: Guia de Competência 1 - Domínio da Norma Culta"
          required
        />
      </div>

      <div>
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea
          id="descricao"
          value={formData.descricao}
          onChange={(e) => setFormData({...formData, descricao: e.target.value})}
          placeholder="Breve descrição do material..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="competencia">Competência *</Label>
        <Select value={formData.competencia} onValueChange={(value) => setFormData({...formData, competencia: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a competência" />
          </SelectTrigger>
          <SelectContent>
            {competencias.map((comp) => (
              <SelectItem key={comp} value={comp}>
                Competência {comp.replace('C', '')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="arquivo">Arquivo PDF {materialEditando ? '(opcional - deixe vazio para manter o atual)' : '*'}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="arquivo"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          <Upload className="w-4 h-4 text-gray-500" />
        </div>
        {arquivo && (
          <p className="text-sm text-green-600 mt-1">
            Novo arquivo selecionado: {arquivo.name}
          </p>
        )}
        {materialEditando && !arquivo && (
          <p className="text-sm text-gray-600 mt-1">
            Arquivo atual: {materialEditando.arquivo_nome}
          </p>
        )}
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
        <Label htmlFor="permite_visitante">Permitir acesso a visitantes</Label>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value: 'publicado' | 'rascunho') => setFormData({...formData, status: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publicado">Publicado</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (materialEditando ? 'Atualizando...' : 'Cadastrando...') : (materialEditando ? 'Atualizar Material' : 'Cadastrar Material')}
      </Button>
    </form>
    </div>
  );
};
