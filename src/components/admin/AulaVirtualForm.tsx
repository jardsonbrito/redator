
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Clock, Users, Link as LinkIcon, Radio } from "lucide-react";

export const AulaVirtualForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [turmas, setTurmas] = useState<string[]>([]);
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
    ativo: true,
    eh_aula_ao_vivo: false
  });

  // Buscar turmas ao carregar componente
  useEffect(() => {
    setTurmas(['TURMA A', 'TURMA B', 'TURMA C', 'TURMA D', 'TURMA E']);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.data_aula || !formData.horario_inicio || !formData.horario_fim || !formData.link_meet || formData.turmas_autorizadas.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('aulas_virtuais')
        .insert([formData]);

      if (error) throw error;

      toast.success("Aula virtual criada com sucesso!");
      setFormData({
        titulo: "",
        descricao: "",
        data_aula: "",
        horario_inicio: "",
        horario_fim: "",
        turmas_autorizadas: [],
        imagem_capa_url: "",
        link_meet: "",
        abrir_aba_externa: false,
        permite_visitante: false,
        ativo: true,
        eh_aula_ao_vivo: false
      });
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar aula virtual:', error);
      toast.error('Erro ao criar aula virtual: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Criar Aula Virtual
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
                placeholder="Ex: Aula de Redação - Dissertação"
              />
            </div>

            <div>
              <Label htmlFor="data_aula">Data da Aula *</Label>
              <Input
                id="data_aula"
                type="date"
                value={formData.data_aula}
                onChange={(e) => setFormData(prev => ({ ...prev, data_aula: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Breve descrição da aula..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="horario_inicio">
                <Clock className="w-4 h-4 inline mr-1" />
                Horário de Início *
              </Label>
              <Input
                id="horario_inicio"
                type="time"
                value={formData.horario_inicio}
                onChange={(e) => setFormData(prev => ({ ...prev, horario_inicio: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="horario_fim">
                <Clock className="w-4 h-4 inline mr-1" />
                Horário de Fim *
              </Label>
              <Input
                id="horario_fim"
                type="time"
                value={formData.horario_fim}
                onChange={(e) => setFormData(prev => ({ ...prev, horario_fim: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>
              <Users className="w-4 h-4 inline mr-1" />
              Turmas Autorizadas *
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {turmas.map((turma) => (
                <div key={turma} className="flex items-center space-x-2">
                  <Checkbox
                    id={turma}
                    checked={formData.turmas_autorizadas.includes(turma)}
                    onCheckedChange={(checked) => handleTurmaChange(turma, checked as boolean)}
                  />
                  <Label htmlFor={turma} className="text-sm">{turma}</Label>
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
            <Label htmlFor="link_meet">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Link do Google Meet *
            </Label>
            <Input
              id="link_meet"
              value={formData.link_meet}
              onChange={(e) => setFormData(prev => ({ ...prev, link_meet: e.target.value }))}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div>
            <Label htmlFor="imagem_capa_url">URL da Imagem de Capa</Label>
            <Input
              id="imagem_capa_url"
              value={formData.imagem_capa_url}
              onChange={(e) => setFormData(prev => ({ ...prev, imagem_capa_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="abrir_aba_externa"
              checked={formData.abrir_aba_externa}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, abrir_aba_externa: checked }))}
            />
            <Label htmlFor="abrir_aba_externa">Abrir aula em aba externa</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
            />
            <Label htmlFor="ativo">Aula ativa</Label>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="eh_aula_ao_vivo"
                checked={formData.eh_aula_ao_vivo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, eh_aula_ao_vivo: checked }))}
              />
              <Label htmlFor="eh_aula_ao_vivo" className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Aula ao vivo (com controle de frequência)
              </Label>
            </div>

          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Criando..." : "Criar Aula Virtual"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
