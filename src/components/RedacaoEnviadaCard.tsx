
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, Award, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type RedacaoEnviada = {
  id: string;
  frase_tematica: string;
  redacao_texto: string;
  data_envio: string;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  nota_total: number | null;
  comentario_admin: string | null;
  corrigida: boolean;
  data_correcao: string | null;
};

interface RedacaoEnviadaCardProps {
  redacao: RedacaoEnviada;
}

export const RedacaoEnviadaCard = ({ redacao }: RedacaoEnviadaCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotaColor = (nota: number | null) => {
    if (nota === null) return "bg-gray-200 text-gray-600";
    if (nota >= 160) return "bg-green-100 text-green-800";
    if (nota >= 120) return "bg-yellow-100 text-yellow-800";
    if (nota >= 80) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getTotalNotaColor = (nota: number | null) => {
    if (nota === null) return "bg-gray-200 text-gray-600";
    if (nota >= 800) return "bg-green-500 text-white";
    if (nota >= 600) return "bg-yellow-500 text-white";
    if (nota >= 400) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <Card className="border-redator-accent/20 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-redator-primary text-lg line-clamp-2">
            {redacao.frase_tematica}
          </CardTitle>
          {redacao.corrigida ? (
            <Badge className="bg-green-100 text-green-800 shrink-0">Corrigida</Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-800 shrink-0">Aguardando</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-redator-accent">
          <Calendar className="w-4 h-4" />
          <span>Enviada em {formatDate(redacao.data_envio)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Notas por competência - só exibir se corrigida */}
        {redacao.corrigida && (
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'C1', value: redacao.nota_c1 },
                { label: 'C2', value: redacao.nota_c2 },
                { label: 'C3', value: redacao.nota_c3 },
                { label: 'C4', value: redacao.nota_c4 },
                { label: 'C5', value: redacao.nota_c5 },
              ].map((competencia) => (
                <div key={competencia.label} className="text-center">
                  <div className="text-xs text-redator-accent mb-1">{competencia.label}</div>
                  <Badge className={`w-full justify-center ${getNotaColor(competencia.value)}`}>
                    {competencia.value ?? '0'}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Nota total */}
            <div className="flex items-center justify-center gap-2">
              <Award className="w-5 h-5 text-redator-accent" />
              <span className="text-sm text-redator-accent">Nota Total:</span>
              <Badge className={`px-3 py-1 ${getTotalNotaColor(redacao.nota_total)}`}>
                {redacao.nota_total ?? 0}/1000
              </Badge>
            </div>
          </div>
        )}

        {/* Botão para ver redação completa */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full border-redator-accent/50 text-redator-primary hover:bg-redator-accent/10"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Redação Completa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-redator-primary">
                {redacao.frase_tematica}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Texto da redação */}
              <div>
                <h3 className="font-semibold text-redator-primary mb-3">Sua Redação</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-redator-accent/20">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {redacao.redacao_texto}
                  </p>
                </div>
              </div>

              {/* Correção detalhada - só exibir se corrigida */}
              {redacao.corrigida && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-redator-primary">Nota por competência</h3>
                  
                  {/* Notas por competência em formato detalhado */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    {[
                      { label: 'Competência 1', key: 'C1', value: redacao.nota_c1, description: 'Demonstrar domínio da modalidade escrita formal da língua portuguesa.' },
                      { label: 'Competência 2', key: 'C2', value: redacao.nota_c2, description: 'Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento.' },
                      { label: 'Competência 3', key: 'C3', value: redacao.nota_c3, description: 'Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos.' },
                      { label: 'Competência 4', key: 'C4', value: redacao.nota_c4, description: 'Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.' },
                      { label: 'Competência 5', key: 'C5', value: redacao.nota_c5, description: 'Elaborar proposta de intervenção para o problema abordado.' },
                    ].map((comp) => (
                      <div key={comp.key} className="bg-redator-accent/5 p-3 rounded-lg border border-redator-accent/20">
                        <div className="text-center mb-2">
                          <div className="text-xs text-redator-accent mb-1">{comp.key}</div>
                          <div className="text-lg font-bold text-redator-primary">{comp.value ?? 0}</div>
                          <div className="text-xs text-redator-accent">/200</div>
                        </div>
                        <div className="text-xs text-redator-accent text-center">
                          {comp.description}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Nota total destacada */}
                  <div className="bg-redator-secondary/10 p-4 rounded-lg border border-redator-secondary/20 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Award className="w-6 h-6 text-redator-primary" />
                      <span className="text-lg font-bold text-redator-primary">
                        Nota Final: {redacao.nota_total ?? 0}/1000
                      </span>
                    </div>
                    <div className="text-sm text-redator-accent">
                      {redacao.data_correcao && `Corrigida em: ${formatDate(redacao.data_correcao)}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Comentário do admin */}
              {redacao.comentario_admin && (
                <div>
                  <h3 className="font-semibold text-redator-primary mb-3 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Correção pedagógica detalhada – Plataforma App do Redator
                  </h3>
                  <div className="bg-redator-accent/5 p-4 rounded-lg border border-redator-accent/20">
                    <div className="text-sm leading-relaxed text-redator-primary whitespace-pre-wrap">
                      {redacao.comentario_admin}
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagem para redações não corrigidas */}
              {!redacao.corrigida && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Aguardando Correção</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Sua redação foi enviada em {formatDate(redacao.data_envio)} e está aguardando correção. 
                    Assim que for corrigida, você verá suas notas e o feedback do corretor aqui.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
