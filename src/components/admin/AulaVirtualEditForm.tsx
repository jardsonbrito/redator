import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Save, X } from "lucide-react";

const turmasDisponiveis = [
  "Turma A", "Turma B", "Turma C", "Turma D", "Turma E"
];

interface AulaVirtual {
  id: string;
  titulo: string;
  descricao: string;
  data_aula: string;
  horario_inicio: string;
  horario_fim: string;
  turmas_autorizadas: string[];
  imagem_capa_url: string;
  link_meet: string;
  abrir_aba_externa: boolean;
  permite_visitante: boolean;
  ativo: boolean;
}

interface AulaVirtualEditFormProps {
  aula: AulaVirtual;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AulaVirtualEditForm = ({ aula, onSuccess, onCancel }: AulaVirtualEditFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data_aula: "",
    horario_inicio: "",
    horario_fim: "",
    turmas_autorizadas: [] as string[],
    imagem_capa_url: "",
    link_meet: "",
    abrir_aba_externa: false,
    permite_visitante: false,
    ativo: true
  });

  useEffect(() => {
    if (aula) {
      setFormData({
        titulo: aula.titulo,
        descricao: aula.descricao || "",
        data_aula: aula.data_aula,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim,
        turmas_autorizadas: aula.turmas_autorizadas,
        imagem_capa_url: aula.imagem_capa_url || "",
        link_meet: aula.link_meet,
        abrir_aba_externa: aula.abrir_aba_externa,
        permite_visitante: aula.permite_visitante || false,
        ativo: aula.ativo
      });
    }
  }, [aula]);

  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        turmas_autorizadas: [...prev.turmas_autorizadas, turma]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        turmas_autorizadas: prev.turmas_autorizadas.filter(t => t !== turma)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.link_meet.trim() || !formData.data_aula || 
        !formData.horario_inicio || !formData.horario_fim || formData.turmas_autorizadas.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('aulas_virtuais')
        .update({
          titulo: formData.titulo.trim(),
          descricao: formData.descricao.trim(),
          data_aula: formData.data_aula,
          horario_inicio: formData.horario_inicio,
          horario_fim: formData.horario_fim,
          turmas_autorizadas: formData.turmas_autorizadas,
          imagem_capa_url: formData.imagem_capa_url.trim(),
          link_meet: formData.link_meet.trim(),
          abrir_aba_externa: formData.abrir_aba_externa,
          permite_visitante: formData.permite_visitante,
          ativo: formData.ativo
        })
        .eq('id', aula.id);

      if (error) throw error;

      toast.success("Aula virtual atualizada com sucesso!");
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao atualizar aula virtual:', error);
      toast.error('Erro ao atualizar aula virtual');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Editar Aula Virtual
          </span>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="titulo">Título da Aula *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Aula de Redação - Argumentação"
                required
              />
            </div>
            <div>
              <Label htmlFor="link_meet">Link do Google Meet *</Label>
              <Input
                id="link_meet"
                value={formData.link_meet}
                onChange={(e) => setFormData(prev => ({ ...prev, link_meet: e.target.value }))}
                placeholder="https://meet.google.com/..."
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição da aula (opcional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="data_aula">Data da Aula *</Label>
              <Input
                id="data_aula"
                type="date"
                value={formData.data_aula}
                onChange={(e) => setFormData(prev => ({ ...prev, data_aula: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="horario_inicio">Horário de Início *</Label>
              <Input
                id="horario_inicio"
                type="time"
                value={formData.horario_inicio}
                onChange={(e) => setFormData(prev => ({ ...prev, horario_inicio: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="horario_fim">Horário de Fim *</Label>
              <Input
                id="horario_fim"
                type="time"
                value={formData.horario_fim}
                onChange={(e) => setFormData(prev => ({ ...prev, horario_fim: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label>Turmas Autorizadas *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {turmasDisponiveis.map((turma) => (
                <div key={turma} className="flex items-center space-x-2">
                  <Checkbox
                    id={`turma-${turma}`}
                    checked={formData.turmas_autorizadas.includes(turma)}
                    onCheckedChange={(checked) => handleTurmaChange(turma, checked as boolean)}
                  />
                  <Label htmlFor={`turma-${turma}`}>{turma}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="permite_visitante"
              checked={formData.permite_visitante}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, permite_visitante: checked as boolean }))}
            />
            <Label htmlFor="permite_visitante" className="text-sm">
              Aceitar visitantes (usuários sem login por turma)
            </Label>
          </div>

          <div>
            <Label htmlFor="imagem_capa_url">URL da Imagem de Capa</Label>
            <Input
              id="imagem_capa_url"
              value={formData.imagem_capa_url}
              onChange={(e) => setFormData(prev => ({ ...prev, imagem_capa_url: e.target.value }))}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="abrir_aba_externa"
                checked={formData.abrir_aba_externa}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, abrir_aba_externa: checked as boolean }))}
              />
              <Label htmlFor="abrir_aba_externa">Abrir em nova aba</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked as boolean }))}
              />
              <Label htmlFor="ativo">Aula ativa</Label>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};