import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { InboxBasicoForm } from "./InboxBasicoForm";
import { InboxConfiguracaoForm, type InboxConfiguracao } from "./InboxConfiguracaoForm";
import { InboxDestinatariosListaAlunos, type AlunoSelecionado } from "./InboxDestinatariosListaAlunos";
import { InboxExtrasForm, type InboxExtras } from "./InboxExtrasForm";
import { InboxMensagensList } from "./InboxMensagensList";
import { InboxProgressIndicator } from "./InboxProgressIndicator";
import { InboxTemplatesForm } from "./InboxTemplatesForm";

interface InboxFormData {
  message: string;
  config: InboxConfiguracao;
  destinatarios: AlunoSelecionado[];
  extras: InboxExtras;
  turmasAlvo: string[];
  acao?: string;
}

export function InboxForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basico");

  const [formData, setFormData] = useState<InboxFormData>({
    message: "",
    config: {
      type: "amigavel",
      validity: "permanente",
    },
    destinatarios: [],
    extras: {},
    turmasAlvo: [],
  });

  // Mutação para criar mensagem
  const createMessageMutation = useMutation({
    mutationFn: async (data: InboxFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Validar dados obrigatórios
      if (!data.message.trim()) {
        throw new Error("Mensagem é obrigatória");
      }
      if (data.destinatarios.length === 0) {
        throw new Error("Selecione pelo menos um destinatário");
      }
      if (data.config.validity === "ate_data" && !data.config.validUntil) {
        throw new Error("Data de validade é obrigatória quando selecionada");
      }

      // Debug: verificar dados antes de enviar
      console.log('📤 Dados do formulário:', {
        message: data.message.trim(),
        type: data.config.type,
        extra_link: data.extras.extraLink,
        extra_image: data.extras.extraImage,
      });

      // Criar mensagem
      const { data: messageData, error: messageError } = await supabase
        .from('inbox_messages')
        .insert({
          message: data.message.trim(),
          type: data.config.type,
          valid_until: data.config.validity === "ate_data" ? data.config.validUntil?.toISOString() : null,
          extra_link: data.extras.extraLink || null,
          extra_image: data.extras.extraImage || null,
          created_by: user.id,
          turmas_alvo: data.turmasAlvo.length > 0 ? data.turmasAlvo : null,
          acao: data.acao || null,
        })
        .select()
        .single();

      console.log('✅ Mensagem criada:', messageData);

      if (messageError) throw messageError;

      // Criar destinatários
      const recipients = data.destinatarios.map(aluno => ({
        message_id: messageData.id,
        student_email: aluno.email,
        status: 'pendente' as const,
      }));

      const { error: recipientsError } = await supabase
        .from('inbox_recipients')
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      return messageData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-cards'] });
      toast.success(`Mensagem enviada com sucesso para ${formData.destinatarios.length} destinatários!`);

      // Limpar formulário
      setFormData({
        message: "",
        config: { type: "amigavel", validity: "permanente" },
        destinatarios: [],
        extras: {},
        turmasAlvo: [],
        acao: undefined,
      });

      // Voltar para aba de mensagens
      setActiveTab("mensagens");
    },
    onError: (error: Error) => {
      console.error('Erro ao criar mensagem:', error);
      toast.error(error.message || "Erro ao enviar mensagem");
    },
  });

  const handleMessageChange = (message: string) => {
    setFormData(prev => ({ ...prev, message }));
  };

  const handleConfigChange = (config: InboxConfiguracao) => {
    setFormData(prev => ({ ...prev, config }));
  };

  const handleDestinatariosChange = (destinatarios: AlunoSelecionado[]) => {
    setFormData(prev => ({ ...prev, destinatarios }));
  };

  const handleExtrasChange = (extras: InboxExtras) => {
    setFormData(prev => ({ ...prev, extras }));
  };

  const handleTurmasAlvoChange = (turmasAlvo: string[]) => {
    setFormData(prev => ({ ...prev, turmasAlvo }));
  };

  const handleSendMessage = () => {
    createMessageMutation.mutate(formData);
  };

  const canSendMessage = () => {
    return (
      formData.message.trim().length >= 1 &&
      formData.destinatarios.length > 0 &&
      formData.turmasAlvo.length > 0 &&
      (formData.config.validity !== "ate_data" || formData.config.validUntil)
    );
  };

  const handleEditMessage = (message: { id: string; message: string; type: string; valid_until: string | null; extra_link: string | null; extra_image: string | null }) => {
    // Preencher formulário com dados da mensagem para edição
    setFormData({
      message: message.message,
      config: {
        type: message.type,
        validity: message.valid_until ? "ate_data" : "permanente",
        validUntil: message.valid_until ? new Date(message.valid_until) : undefined,
      },
      destinatarios: [], // Não carregamos destinatários na edição
      extras: {
        extraLink: message.extra_link || undefined,
        extraImage: message.extra_image || undefined,
      },
    });

    setActiveTab("basico");
    toast.info("Mensagem carregada para edição. Ajuste os dados e envie novamente.");
  };

  const handleDuplicateMessage = (message: { message: string; type: string; valid_until: string | null; extra_link: string | null; extra_image: string | null }) => {
    // Preencher formulário com dados da mensagem
    setFormData({
      message: message.message,
      config: {
        type: message.type,
        validity: message.valid_until ? "ate_data" : "permanente",
        validUntil: message.valid_until ? new Date(message.valid_until) : undefined,
      },
      destinatarios: [],
      extras: {
        extraLink: message.extra_link || undefined,
        extraImage: message.extra_image || undefined,
      },
    });

    setActiveTab("basico");
    toast.success("Mensagem duplicada! Ajuste os dados e selecione novos destinatários.");
  };

  const tabs = [
    { value: 'basico', label: 'Básico' },
    { value: 'configuracao', label: 'Configuração' },
    { value: 'destinatarios', label: 'Destinatários' },
    { value: 'extras', label: 'Extras' },
    { value: 'mensagens', label: 'Mensagens' },
    { value: 'automaticas', label: 'Automáticas' },
  ];

  const handleAtalhoPreencherPerfil = () => {
    setFormData(prev => ({
      ...prev,
      message:
        "Olá! Para continuar aproveitando ao máximo a plataforma, precisamos que você complete seu perfil.\n\n" +
        "Por favor, acesse a página de perfil e preencha todos os campos:\n" +
        "• Foto de perfil\n" +
        "• WhatsApp\n" +
        "• Data de nascimento\n" +
        "• Cidade\n" +
        "• Escola\n" +
        "• Série\n" +
        "• Identificação (Aluno/Aluna)\n\n" +
        "Clique no botão abaixo para ir direto ao perfil.",
      config: { type: "bloqueante", validity: "permanente" },
      acao: "preencher_perfil",
    }));
    setActiveTab("destinatarios");
    toast.info("Mensagem pré-preenchida. Selecione os destinatários e envie.");
  };

  return (
    <div className="space-y-6">
      {/* Atalho rápido: mensagem bloqueante de completar perfil */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-800">Completar perfil — mensagem bloqueante</p>
          <p className="text-xs text-violet-600 mt-0.5">
            Pré-preenche a mensagem, define tipo bloqueante e ação <code>preencher_perfil</code>.
            O bloqueio só é removido quando o aluno salvar todos os campos + foto.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-violet-300 text-violet-700 hover:bg-violet-100 gap-1.5"
          onClick={handleAtalhoPreencherPerfil}
        >
          <UserCheck className="w-4 h-4" />
          Usar atalho
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Tabs com scroll horizontal no mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.value
                    ? "bg-[#662F96] text-white"
                    : "bg-[#B175FF] text-white hover:bg-[#662F96]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Botão de enviar */}
          {activeTab !== "mensagens" && activeTab !== "automaticas" && (
            <Button
              onClick={handleSendMessage}
              disabled={!canSendMessage() || createMessageMutation.isPending}
              className="shrink-0"
            >
              {createMessageMutation.isPending ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          )}
        </div>

        <TabsContent value="basico" className="space-y-6">
          <InboxBasicoForm
            onMessageChange={handleMessageChange}
            initialMessage={formData.message}
          />

          {/* Indicador de progresso visual */}
          <InboxProgressIndicator
            messageLength={formData.message.trim().length}
            hasDestinarios={formData.destinatarios.length > 0}
            destinatariosCount={formData.destinatarios.length}
          />
        </TabsContent>

        <TabsContent value="configuracao" className="space-y-6">
          <InboxConfiguracaoForm
            onConfigChange={handleConfigChange}
            initialConfig={formData.config}
          />
        </TabsContent>

        <TabsContent value="destinatarios" className="space-y-6">
          <InboxDestinatariosListaAlunos
            onDestinatariosChange={handleDestinatariosChange}
            destinatariosSelecionados={formData.destinatarios}
            onTurmasAlvoChange={handleTurmasAlvoChange}
            turmasAlvoSelecionadas={formData.turmasAlvo}
          />
        </TabsContent>

        <TabsContent value="extras" className="space-y-6">
          <InboxExtrasForm
            onExtrasChange={handleExtrasChange}
            initialExtras={formData.extras}
          />
        </TabsContent>

        <TabsContent value="mensagens" className="space-y-6">
          <InboxMensagensList
            onEdit={handleEditMessage}
            onDuplicate={handleDuplicateMessage}
          />
        </TabsContent>

        <TabsContent value="automaticas" className="space-y-6">
          <InboxTemplatesForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}