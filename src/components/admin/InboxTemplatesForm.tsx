import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InboxTemplate {
  acao: string;
  label: string;
  message: string;
  type: string;
  delay_horas: number | null;
}

const ACAO_INFO: Record<string, { delay: string; tipo: string }> = {
  justificativa_ausencia: { delay: "Enviada imediatamente ao clicar em 'Notificar ausentes'", tipo: "Bloqueante" },
  followup_gravacao: { delay: "Enviada 48h após o fim da aula", tipo: "Amigável" },
  followup_duvidas: { delay: "Enviada 5 dias após o fim da aula", tipo: "Amigável" },
};

export function InboxTemplatesForm() {
  const [templates, setTemplates] = useState<InboxTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inbox_templates' as any)
        .select('*')
        .order('delay_horas', { ascending: true, nullsFirst: true });

      if (error) throw error;
      setTemplates((data as InboxTemplate[]) || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      toast.error('Erro ao carregar templates automáticos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageChange = (acao: string, value: string) => {
    setTemplates(prev =>
      prev.map(t => t.acao === acao ? { ...t, message: value } : t)
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const tpl of templates) {
        const { error } = await supabase
          .from('inbox_templates' as any)
          .upsert({ ...tpl, updated_at: new Date().toISOString() }, { onConflict: 'acao' });

        if (error) throw error;
      }
      toast.success('Templates salvos com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar templates:', err);
      toast.error('Erro ao salvar templates');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mensagens Automáticas</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Textos enviados automaticamente ao clicar em "Notificar ausentes" na frequência de uma aula ao vivo.
            Use <code className="bg-muted px-1 rounded text-xs">{"{{titulo}}"}</code> para inserir o título da aula.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar tudo"}
        </Button>
      </div>

      <div className="space-y-4">
        {templates.map((tpl) => {
          const info = ACAO_INFO[tpl.acao];
          return (
            <Card key={tpl.acao}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{tpl.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        tpl.type === 'bloqueante'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }
                    >
                      {tpl.type === 'bloqueante' ? 'Bloqueante' : 'Amigável'}
                    </Badge>
                  </div>
                </CardTitle>
                {info && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    {info.delay}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor={`tpl-${tpl.acao}`}>Texto da mensagem</Label>
                  <Textarea
                    id={`tpl-${tpl.acao}`}
                    value={tpl.message}
                    onChange={(e) => handleMessageChange(tpl.acao, e.target.value)}
                    rows={4}
                    className="resize-none"
                    placeholder={`Texto da mensagem "${tpl.label}"...`}
                  />
                  {tpl.acao !== 'justificativa_ausencia' && (
                    <p className="text-xs text-muted-foreground">
                      Respostas disponíveis ao aluno:{" "}
                      {tpl.acao === 'followup_gravacao'
                        ? '"Sim, já assisti ✓" ou "Ainda não assisti"'
                        : '"Tenho dúvidas, vou entrar em contato" ou "Sem dúvidas por enquanto ✓"'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
