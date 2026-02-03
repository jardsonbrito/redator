import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TURMAS_VALIDAS, normalizeTurmaToLetter } from '@/utils/turmaUtils';
import { Info } from "lucide-react";

const TURMAS = TURMAS_VALIDAS;

interface AulaVirtualFormProps {
  onSuccess?: () => void;
}

export const AulaVirtualForm = ({ onSuccess }: AulaVirtualFormProps) => {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('detalhes');

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
    eh_aula_ao_vivo: true
  });

  // Função para verificar etapas vigentes para as turmas selecionadas
  const verificarEtapasVigentes = async (): Promise<{ valido: boolean; turmasSemEtapa: string[] }> => {
    if (!formData.eh_aula_ao_vivo || formData.turmas_autorizadas.length === 0) {
      return { valido: true, turmasSemEtapa: [] };
    }

    const turmasSemEtapa: string[] = [];

    for (const turma of formData.turmas_autorizadas) {
      const turmaNormalizada = normalizeTurmaToLetter(turma) || turma;

      // Buscar etapa vigente para esta turma na data da aula
      const { data: etapa } = await supabase
        .from('etapas_estudo')
        .select('id')
        .eq('turma', turmaNormalizada)
        .eq('ativo', true)
        .lte('data_inicio', formData.data_aula)
        .gte('data_fim', formData.data_aula)
        .limit(1)
        .maybeSingle();

      if (!etapa) {
        turmasSemEtapa.push(turma);
      }
    }

    return {
      valido: turmasSemEtapa.length === 0,
      turmasSemEtapa
    };
  };

  const handleAction = async () => {
    // Validações básicas
    if (!formData.titulo.trim()) {
      toast.error('Título é obrigatório');
      setActiveSection('detalhes');
      return;
    }

    if (!formData.data_aula || !formData.horario_inicio || !formData.horario_fim) {
      toast.error('Data e horários são obrigatórios');
      setActiveSection('detalhes');
      return;
    }

    if (!formData.link_meet.trim()) {
      toast.error('Link do Meet é obrigatório');
      setActiveSection('configuracao');
      return;
    }

    if (formData.turmas_autorizadas.length === 0 && !formData.permite_visitante) {
      toast.error('Pelo menos uma turma deve ser selecionada OU visitantes permitidos');
      setActiveSection('turmas');
      return;
    }

    if (formData.horario_inicio >= formData.horario_fim) {
      toast.error('Horário de início deve ser anterior ao horário de fim');
      setActiveSection('detalhes');
      return;
    }

    // Validação de etapa vigente (apenas para aulas ao vivo)
    if (formData.eh_aula_ao_vivo && formData.turmas_autorizadas.length > 0) {
      setLoading(true);
      const { valido, turmasSemEtapa } = await verificarEtapasVigentes();

      if (!valido) {
        setLoading(false);
        toast.error(
          `As seguintes turmas não têm etapa configurada para a data ${formData.data_aula}: ${turmasSemEtapa.join(', ')}. Configure as etapas no Diário Online primeiro.`,
          { duration: 6000 }
        );
        setActiveSection('turmas');
        return;
      }
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const aulaData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        data_aula: formData.data_aula,
        horario_inicio: formData.horario_inicio,
        horario_fim: formData.horario_fim,
        turmas_autorizadas: formData.turmas_autorizadas,
        imagem_capa_url: formData.imagem_capa_url.trim() || null,
        link_meet: formData.link_meet.trim(),
        abrir_aba_externa: formData.abrir_aba_externa,
        permite_visitante: formData.permite_visitante,
        ativo: formData.ativo,
        eh_aula_ao_vivo: formData.eh_aula_ao_vivo
      };

      const { error } = await supabase
        .from('aulas_virtuais')
        .insert([aulaData]);

      if (error) throw error;

      toast.success('Aula ao vivo criada com sucesso!');

      // Limpar formulário
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
        eh_aula_ao_vivo: true
      });
      setActiveSection('detalhes');

      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar aula ao vivo:', error);
      toast.error('Erro ao criar aula ao vivo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'configuracao', label: 'Configuração' },
    { id: 'turmas', label: 'Turmas' },
  ];

  const toggleSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  return (
    <div className="min-h-screen" style={{ background: '#f7f7fb' }}>
      <div className="max-w-6xl mx-auto p-5">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Header with chips and action buttons */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeSection === section.id
                      ? "text-white"
                      : "text-white",
                    activeSection === section.id
                      ? "bg-[#662F96]"
                      : "bg-[#B175FF] hover:bg-[#662F96]"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                type="button"
                onClick={handleAction}
                disabled={loading}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {loading ? 'Criando...' : 'Criar Aula ao Vivo'}
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-5">
            {/* Detalhes Section */}
            {activeSection === 'detalhes' && (
              <div className="space-y-4">
                {/* Título */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Input
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="text-sm"
                    placeholder="Título da aula ao vivo"
                    spellCheck={true}
                  />
                </div>

                {/* Descrição */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    className="text-sm min-h-[100px]"
                    placeholder="Descrição da aula"
                    spellCheck={true}
                  />
                </div>

                {/* Data e Horários */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data da Aula</label>
                      <Input
                        type="date"
                        value={formData.data_aula}
                        onChange={(e) => setFormData({...formData, data_aula: e.target.value})}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Horário de Início</label>
                      <Input
                        type="time"
                        value={formData.horario_inicio}
                        onChange={(e) => setFormData({...formData, horario_inicio: e.target.value})}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Horário de Fim</label>
                      <Input
                        type="time"
                        value={formData.horario_fim}
                        onChange={(e) => setFormData({...formData, horario_fim: e.target.value})}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Configuração Section */}
            {activeSection === 'configuracao' && (
              <div className="space-y-6">
                {/* Alerta informativo sobre presença automática */}
                {formData.eh_aula_ao_vivo && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Presença Automática:</strong> Quando "Aula ao vivo" está ativada, a presença dos alunos será
                      registrada automaticamente no Diário Online quando eles entrarem e saírem da aula.
                      Certifique-se de que as turmas selecionadas tenham etapas configuradas para a data da aula.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Link do Meet */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Link do Google Meet</label>
                    <Input
                      value={formData.link_meet}
                      onChange={(e) => setFormData({...formData, link_meet: e.target.value})}
                      className="text-sm"
                      spellCheck={false}
                    />
                  </div>
                </div>

                {/* Imagem de Capa */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL da Imagem de Capa</label>
                    <Input
                      value={formData.imagem_capa_url}
                      onChange={(e) => setFormData({...formData, imagem_capa_url: e.target.value})}
                      className="text-sm"
                      spellCheck={false}
                    />
                  </div>
                </div>

                {/* Configurações */}
                <div className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Aula ao vivo</div>
                        <div className="text-xs text-gray-500">Ativar controle de frequência</div>
                      </div>
                      <Switch
                        checked={formData.eh_aula_ao_vivo}
                        onCheckedChange={(checked) => setFormData({...formData, eh_aula_ao_vivo: checked})}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Abrir em nova aba</div>
                        <div className="text-xs text-gray-500">Link abrirá em aba externa</div>
                      </div>
                      <Switch
                        checked={formData.abrir_aba_externa}
                        onCheckedChange={(checked) => setFormData({...formData, abrir_aba_externa: checked})}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Status Ativo</div>
                        <div className="text-xs text-gray-500">Aula ativa pode ser acessada pelos alunos</div>
                      </div>
                      <Switch
                        checked={formData.ativo}
                        onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Turmas Section */}
            {activeSection === 'turmas' && (
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="space-y-6">
                  {/* Turmas Autorizadas */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Turmas Autorizadas</div>
                    <div className="grid grid-cols-3 gap-2">
                      {TURMAS.map((turma) => (
                        <div key={turma} className="flex items-center space-x-2">
                          <Checkbox
                            id={`turma-${turma}`}
                            checked={formData.turmas_autorizadas.includes(turma)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({...formData, turmas_autorizadas: [...formData.turmas_autorizadas, turma]});
                              } else {
                                setFormData({...formData, turmas_autorizadas: formData.turmas_autorizadas.filter(t => t !== turma)});
                              }
                            }}
                          />
                          <label htmlFor={`turma-${turma}`} className="text-sm font-medium">
                            {turma}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Permitir Visitantes */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Permitir Visitantes</div>
                      <div className="text-xs text-gray-500">Visitantes podem acessar esta aula</div>
                    </div>
                    <Switch
                      checked={formData.permite_visitante}
                      onCheckedChange={(checked) => setFormData({...formData, permite_visitante: checked})}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};