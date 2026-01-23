import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { TURMAS_VALIDAS, getTurmaColorClasses } from "@/utils/turmaUtils";

interface AlunoSelfServiceModernProps {
  onSuccess: () => void;
}

type TurmasConfig = Record<string, boolean>;

const LinkTurmaBlock = ({
  turma,
  link,
  onCopy,
  onOpen,
  copied,
  habilitado
}: {
  turma: string;
  link: string;
  onCopy: () => void;
  onOpen: () => void;
  copied: boolean;
  habilitado: boolean;
}) => (
  <div className={`border rounded-xl p-5 mb-4 ${habilitado ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
    <div className="flex items-center justify-between mb-3">
      <Label className="text-base font-medium">{turma}</Label>
      {!habilitado && (
        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
          Desabilitado
        </span>
      )}
    </div>

    <div className="flex gap-2 mb-3">
      <Input
        value={link}
        readOnly
        className="flex-1 text-sm"
      />
      <Button
        onClick={onCopy}
        variant="outline"
        size="icon"
        className="shrink-0"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>

    <div className="flex gap-2">
      <Button
        onClick={onCopy}
        className="flex-1 bg-[#3F0077] text-white hover:bg-[#662F96]"
        size="sm"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copiar Link
      </Button>
      <Button
        onClick={onOpen}
        variant="outline"
        className="flex-1"
        size="sm"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Abrir Link
      </Button>
    </div>
  </div>
);

export const AlunoSelfServiceModern = ({ onSuccess }: AlunoSelfServiceModernProps) => {
  const [copiado, setCopiado] = useState<{[key: string]: boolean}>({});
  const [turmasConfig, setTurmasConfig] = useState<TurmasConfig>({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingTurma, setSavingTurma] = useState<string | null>(null);
  const { toast } = useToast();

  const turmas = [...TURMAS_VALIDAS];

  // Link de troca de email
  const linkTrocaEmail = `${window.location.origin}/atualizar-email`;

  // Carregar configuração das turmas
  useEffect(() => {
    const carregarConfiguracao = async () => {
      try {
        const { data, error } = await supabase
          .from("configuracoes_sistema")
          .select("valor")
          .eq("chave", "autoatendimento_turmas")
          .maybeSingle();

        if (error) throw error;

        if (data?.valor) {
          setTurmasConfig(data.valor as TurmasConfig);
        } else {
          // Configuração padrão: todas habilitadas
          const configPadrao: TurmasConfig = {};
          TURMAS_VALIDAS.forEach(turma => {
            configPadrao[turma] = true;
          });
          setTurmasConfig(configPadrao);
        }
      } catch (error) {
        console.error("Erro ao carregar configuração:", error);
        // Em caso de erro, assume todas habilitadas
        const configPadrao: TurmasConfig = {};
        TURMAS_VALIDAS.forEach(turma => {
          configPadrao[turma] = true;
        });
        setTurmasConfig(configPadrao);
      } finally {
        setLoadingConfig(false);
      }
    };

    carregarConfiguracao();
  }, []);

  // Salvar configuração de uma turma
  const handleToggleTurma = async (turma: string, habilitado: boolean) => {
    setSavingTurma(turma);
    try {
      const novaConfig = {
        ...turmasConfig,
        [turma]: habilitado
      };

      const { error } = await supabase
        .from("configuracoes_sistema")
        .upsert({
          chave: "autoatendimento_turmas",
          valor: novaConfig,
          descricao: "Controla quais turmas têm o link de autoatendimento habilitado"
        }, {
          onConflict: "chave"
        });

      if (error) throw error;

      setTurmasConfig(novaConfig);
      toast({
        title: habilitado ? `Turma ${turma} habilitada` : `Turma ${turma} desabilitada`,
        description: habilitado
          ? `Alunos podem se cadastrar na Turma ${turma}.`
          : `Cadastro desativado para a Turma ${turma}.`
      });
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        title: "Erro ao salvar configuração",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setSavingTurma(null);
    }
  };

  const handleCopiarLink = async (link: string, key: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(prev => ({ ...prev, [key]: true }));
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência."
      });

      // Resetar o ícone após 2 segundos
      setTimeout(() => {
        setCopiado(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleAbrirLink = (link: string) => {
    window.open(link, '_blank');
  };

  // Contar turmas habilitadas
  const turmasHabilitadas = Object.values(turmasConfig).filter(Boolean).length;
  const totalTurmas = TURMAS_VALIDAS.length;

  return (
    <div className="space-y-6">
      {/* Controle de habilitação por turma */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Controle de Autoatendimento</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Habilite ou desabilite o cadastro para cada turma
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {loadingConfig ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-medium">{turmasHabilitadas}/{totalTurmas} habilitadas</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TURMAS_VALIDAS.map((turma) => {
              const habilitado = turmasConfig[turma] ?? true;
              const isSaving = savingTurma === turma;
              const colorClasses = getTurmaColorClasses(turma);

              return (
                <div
                  key={turma}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    habilitado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses}`}>
                      Turma {turma}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(loadingConfig || isSaving) && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={habilitado}
                      onCheckedChange={(checked) => handleToggleTurma(turma, checked)}
                      disabled={loadingConfig || isSaving}
                      className="scale-90"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Links de Cadastro por TURMA */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Links de Cadastro por TURMA</h3>

        {turmas.map((turma) => {
          const link = `${window.location.origin}/cadastro-aluno?turma=${turma}`;
          const key = `turma-${turma}`;
          const habilitado = turmasConfig[turma] ?? true;

          return (
            <LinkTurmaBlock
              key={turma}
              turma={`TURMA ${turma}`}
              link={link}
              onCopy={() => handleCopiarLink(link, key)}
              onOpen={() => handleAbrirLink(link)}
              copied={copiado[key] || false}
              habilitado={habilitado}
            />
          );
        })}
      </div>

      {/* Link de Troca de E-mail */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Link de Troca de E-mail</h3>

        <div className="border border-gray-200 rounded-xl p-5">
          <Label className="text-base font-medium mb-3 block">Link de Troca de E-mail</Label>

          <div className="flex gap-2 mb-3">
            <Input
              value={linkTrocaEmail}
              readOnly
              className="flex-1 text-sm"
            />
            <Button
              onClick={() => handleCopiarLink(linkTrocaEmail, 'troca-email')}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              {copiado['troca-email'] ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleCopiarLink(linkTrocaEmail, 'troca-email')}
              className="flex-1 bg-[#3F0077] text-white hover:bg-[#662F96]"
              size="sm"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Link
            </Button>
            <Button
              onClick={() => handleAbrirLink(linkTrocaEmail)}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Link
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
