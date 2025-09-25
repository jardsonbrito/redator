import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TURMAS = ['A', 'B', 'C', 'D', 'E'];

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
  eh_aula_ao_vivo?: boolean;
}

interface AulaVirtualEditFormProps {
  aula: AulaVirtual;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AulaVirtualEditForm = ({ aula, onSuccess, onCancel }: AulaVirtualEditFormProps) => {
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

  useEffect(() => {
    if (aula) {
      // Converter turmas do formato do banco "TURMA A" para formato do form "A"
      const turmasConvertidas = (aula.turmas_autorizadas || []).map(turma => {
        if (typeof turma === 'string' && turma.startsWith('TURMA ')) {
          return turma.replace('TURMA ', '');
        }
        return turma;
      });

      setFormData({
        titulo: aula.titulo,
        descricao: aula.descricao || "",
        data_aula: aula.data_aula,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim,
        turmas_autorizadas: turmasConvertidas,
        imagem_capa_url: aula.imagem_capa_url || "",
        link_meet: aula.link_meet,
        abrir_aba_externa: aula.abrir_aba_externa,
        permite_visitante: aula.permite_visitante || false,
        ativo: aula.ativo,
        eh_aula_ao_vivo: aula.eh_aula_ao_vivo ?? true
      });
    }
  }, [aula]);

  const handleAction = () => {
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

    handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Converter turmas para o formato do banco: "A" -> "TURMA A"
      const turmasFormatoBanco = formData.turmas_autorizadas.map(turma => `TURMA ${turma}`);

      const aulaData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        data_aula: formData.data_aula,
        horario_inicio: formData.horario_inicio,
        horario_fim: formData.horario_fim,
        turmas_autorizadas: turmasFormatoBanco,
        imagem_capa_url: formData.imagem_capa_url.trim() || null,
        link_meet: formData.link_meet.trim(),
        abrir_aba_externa: formData.abrir_aba_externa,
        permite_visitante: formData.permite_visitante,
        ativo: formData.ativo,
        eh_aula_ao_vivo: formData.eh_aula_ao_vivo
      };

      // Usar RPC para evitar problema com trigger
      const { error } = await supabase.rpc('update_aula_virtual_safe', {
        p_aula_id: aula.id,
        p_titulo: aulaData.titulo,
        p_descricao: aulaData.descricao,
        p_data_aula: aulaData.data_aula,
        p_horario_inicio: aulaData.horario_inicio,
        p_horario_fim: aulaData.horario_fim,
        p_turmas_autorizadas: aulaData.turmas_autorizadas,
        p_imagem_capa_url: aulaData.imagem_capa_url,
        p_link_meet: aulaData.link_meet,
        p_abrir_aba_externa: aulaData.abrir_aba_externa,
        p_permite_visitante: aulaData.permite_visitante,
        p_ativo: aulaData.ativo,
        p_eh_aula_ao_vivo: aulaData.eh_aula_ao_vivo
      });

      if (error) {
        throw error;
      }

      toast.success('Aula ao vivo atualizada com sucesso!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao atualizar aula ao vivo:', error);
      toast.error('Erro ao atualizar aula ao vivo: ' + error.message);
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
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                onClick={handleAction}
                disabled={loading}
                className="bg-[#3F0077] text-white hover:bg-[#662F96]"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
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
                            Turma {turma}
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