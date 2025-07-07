
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CorretorSelector } from "./CorretorSelector";
import { Upload, X } from "lucide-react";

interface EnvioRedacaoProps {
  isSimulado?: boolean;
  simuladoId?: string;
  fraseTematica?: string;
  exercicioId?: string;
  onSuccess?: () => void;
}

export const EnvioRedacaoWithCorretor = ({ 
  isSimulado = false, 
  simuladoId, 
  fraseTematica,
  exercicioId,
  onSuccess 
}: EnvioRedacaoProps) => {
  const [formData, setFormData] = useState({
    nome_aluno: "",
    email_aluno: "",
    turma: "",
    frase_tematica: fraseTematica || "",
    redacao_texto: "",
  });
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [redacaoManuscrita, setRedacaoManuscrita] = useState<File | null>(null);
  const [redacaoManuscritaUrl, setRedacaoManuscritaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRedacaoManuscritaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione apenas arquivos de imagem (JPG, JPEG ou PNG).",
        variant: "destructive"
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setRedacaoManuscrita(file);
    const tempUrl = URL.createObjectURL(file);
    setRedacaoManuscritaUrl(tempUrl);
  };

  const handleRemoveRedacaoManuscrita = () => {
    if (redacaoManuscritaUrl && redacaoManuscritaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(redacaoManuscritaUrl);
    }
    setRedacaoManuscrita(null);
    setRedacaoManuscritaUrl(null);
  };

  const uploadRedacaoManuscrita = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `redacoes-manuscritas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('biblioteca-pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('biblioteca-pdfs')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da redação manuscrita:', error);
      return null;
    }
  };

  const validateForm = () => {
    if (!formData.nome_aluno.trim() || !formData.email_aluno.trim() || 
        !formData.turma.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return false;
    }

    if (!fraseTematica && !formData.frase_tematica.trim()) {
      toast({
        title: "Frase temática obrigatória",
        description: "Informe a frase temática da redação.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.redacao_texto.trim() && !redacaoManuscrita) {
      toast({
        title: "Redação obrigatória",
        description: "Digite sua redação ou envie uma redação manuscrita para continuar.",
        variant: "destructive"
      });
      return false;
    }

    if (selectedCorretores.length === 0) {
      toast({
        title: "Selecione pelo menos um corretor",
        description: "É necessário selecionar pelo menos um corretor.",
        variant: "destructive"
      });
      return false;
    }

    if (isSimulado && selectedCorretores.length !== 2) {
      toast({
        title: "Simulado requer 2 corretores",
        description: "Para simulados, é obrigatório selecionar exatamente 2 corretores.",
        variant: "destructive"
      });
      return false;
    }

    if (selectedCorretores.length > 2) {
      toast({
        title: "Limite de corretores excedido",
        description: "Você pode selecionar no máximo 2 corretores.",
        variant: "destructive"
      });
      return false;
    }

    const uniqueCorretores = new Set(selectedCorretores);
    if (uniqueCorretores.size !== selectedCorretores.length) {
      toast({
        title: "Corretores duplicados",
        description: "Não é possível selecionar o mesmo corretor duas vezes.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      let manuscritaUrl = null;
      if (redacaoManuscrita) {
        manuscritaUrl = await uploadRedacaoManuscrita(redacaoManuscrita);
        if (!manuscritaUrl) {
          throw new Error("Erro ao fazer upload da redação manuscrita");
        }
      }

      const redacaoData = {
        nome_aluno: formData.nome_aluno.trim(),
        email_aluno: formData.email_aluno.trim().toLowerCase(),
        turma: formData.turma.trim(),
        frase_tematica: fraseTematica || formData.frase_tematica.trim(),
        redacao_texto: formData.redacao_texto.trim(),
        redacao_manuscrita_url: manuscritaUrl,
        corretor_id_1: selectedCorretores[0] || null,
        corretor_id_2: selectedCorretores[1] || null,
        tipo_envio: isSimulado ? 'simulado' : (exercicioId ? 'exercicio' : 'regular'),
        status: 'aguardando',
        corrigida: false,
      };

      let result;

      if (isSimulado && simuladoId) {
        result = await supabase
          .from("redacoes_simulado")
          .insert({
            ...redacaoData,
            id_simulado: simuladoId,
            texto: redacaoData.redacao_texto,
          });
      } else if (exercicioId) {
        result = await supabase
          .from("redacoes_exercicio")
          .insert({
            ...redacaoData,
            exercicio_id: exercicioId,
          });
      } else {
        result = await supabase
          .from("redacoes_enviadas")
          .insert(redacaoData);
      }

      if (result.error) throw result.error;

      toast({
        title: "Redação enviada com sucesso!",
        description: "Sua redação foi enviada e será corrigida pelos corretores selecionados.",
      });

      setFormData({
        nome_aluno: "",
        email_aluno: "",
        turma: "",
        frase_tematica: fraseTematica || "",
        redacao_texto: "",
      });
      setSelectedCorretores([]);
      handleRemoveRedacaoManuscrita();

      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao enviar redação:", error);
      toast({
        title: "Erro ao enviar redação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Enviar Redação {isSimulado ? "- Simulado" : exercicioId ? "- Exercício" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome_aluno">Nome do Aluno *</Label>
              <Input
                id="nome_aluno"
                value={formData.nome_aluno}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_aluno: e.target.value }))}
                placeholder="Digite seu nome completo"
                required
              />
            </div>

            <div>
              <Label htmlFor="email_aluno">E-mail *</Label>
              <Input
                id="email_aluno"
                type="email"
                value={formData.email_aluno}
                onChange={(e) => setFormData(prev => ({ ...prev, email_aluno: e.target.value }))}
                placeholder="Digite seu e-mail"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="turma">Turma *</Label>
            <Input
              id="turma"
              value={formData.turma}
              onChange={(e) => setFormData(prev => ({ ...prev, turma: e.target.value }))}
              placeholder="Digite sua turma"
              required
            />
          </div>

          {!fraseTematica && (
            <div>
              <Label htmlFor="frase_tematica">Frase Temática *</Label>
              <Input
                id="frase_tematica"
                value={formData.frase_tematica}
                onChange={(e) => setFormData(prev => ({ ...prev, frase_tematica: e.target.value }))}
                placeholder="Digite a frase temática"
                required
              />
            </div>
          )}

          <CorretorSelector
            selectedCorretores={selectedCorretores}
            onCorretoresChange={setSelectedCorretores}
            isSimulado={isSimulado}
            required={true}
          />

          <div>
            <Label className="text-base font-medium">Redação Manuscrita (opcional)</Label>
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-4">
                <label htmlFor="redacao-manuscrita" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Selecionar imagem</span>
                  </div>
                </label>
                <input
                  id="redacao-manuscrita"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleRedacaoManuscritaChange}
                  className="hidden"
                />
              </div>

              {redacaoManuscritaUrl && (
                <div className="relative inline-block">
                  <img 
                    src={redacaoManuscritaUrl} 
                    alt="Preview da redação manuscrita" 
                    className="max-w-xs max-h-60 rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                    onClick={handleRemoveRedacaoManuscrita}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceitos: JPG, JPEG, PNG
            </p>
          </div>

          <div>
            <Label htmlFor="redacao_texto">Texto da Redação</Label>
            <Textarea
              id="redacao_texto"
              value={formData.redacao_texto}
              onChange={(e) => setFormData(prev => ({ ...prev, redacao_texto: e.target.value }))}
              placeholder="Digite o texto da sua redação aqui..."
              className="min-h-[300px]"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar Redação"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
