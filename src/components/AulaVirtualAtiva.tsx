import { Video, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parse, isWithinInterval, format } from "date-fns";
import { useAulaVirtual } from "./aula-virtual/useAulaVirtual";
import { usePresenca } from "./aula-virtual/usePresenca";
import { AulaStatusBadge } from "./aula-virtual/AulaStatusBadge";
import { AulaInfoGrid } from "./aula-virtual/AulaInfoGrid";
import { PresencaDialog } from "./aula-virtual/PresencaDialog";
import { AulaAoVivoCard } from "./aula-virtual/AulaAoVivoCard";
import { AulaVirtualAtivaProps, AulaVirtual } from "./aula-virtual/types";

export const AulaVirtualAtiva = ({ turmaCode }: AulaVirtualAtivaProps) => {
  const { aulaAtiva, isLoading, registrosPresenca, setRegistrosPresenca } = useAulaVirtual(turmaCode);
  const {
    openDialog,
    setOpenDialog,
    formData,
    setFormData,
    registrarPresenca,
    jaRegistrou,
    openPresencaDialog
  } = usePresenca(registrosPresenca, setRegistrosPresenca);

  const abrirAula = (aula: AulaVirtual) => {
    if (aula.abrir_aba_externa) {
      window.open(aula.link_meet, '_blank');
    } else {
      window.open(aula.link_meet, '_blank');
    }
  };

  // Se não há aula ou está carregando, não renderiza nada
  if (isLoading || !aulaAtiva) {
    return null;
  }

  // Se for aula ao vivo, renderizar o componente específico
  if (aulaAtiva.eh_aula_ao_vivo) {
    return <AulaAoVivoCard aula={aulaAtiva} turmaCode={turmaCode} />;
  }

  const agora = new Date();
  const inicioAula = parse(`${aulaAtiva.data_aula}T${aulaAtiva.horario_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
  const fimAula = parse(`${aulaAtiva.data_aula}T${aulaAtiva.horario_fim}`, "yyyy-MM-dd'T'HH:mm", new Date());
  
  const aulaEmAndamento = isWithinInterval(agora, { start: inicioAula, end: fimAula });
  const aulaFutura = agora < inicioAula;
  const aulaEncerrada = agora > fimAula;

  return (
    <div className="mb-8">
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
        <div className={`bg-gradient-to-r p-1 ${aulaEmAndamento ? 'from-red-400 to-pink-500' : aulaFutura ? 'from-blue-400 to-cyan-500' : 'from-gray-400 to-slate-500'}`}>
          <CardHeader className="bg-white/95 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-2xl blur ${aulaEmAndamento ? 'bg-red-400' : aulaFutura ? 'bg-blue-400' : 'bg-gray-400'} opacity-30`}></div>
                  <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl ${aulaEmAndamento ? 'bg-gradient-to-br from-red-500 to-pink-600' : aulaFutura ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 'bg-gradient-to-br from-gray-500 to-slate-600'}`}>
                    <Video className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <CardTitle className={`text-2xl font-extrabold ${aulaEmAndamento ? 'text-red-700' : aulaFutura ? 'text-blue-700' : 'text-gray-700'}`}>
                    📺 {aulaAtiva.titulo}
                  </CardTitle>
                  <p className={`text-lg font-semibold ${aulaEmAndamento ? 'text-red-600' : aulaFutura ? 'text-blue-600' : 'text-gray-600'}`}>
                    {aulaAtiva.descricao || "Aula Virtual"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <AulaStatusBadge aulaEmAndamento={aulaEmAndamento} aulaFutura={aulaFutura} />
                {aulaEmAndamento && (
                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    🔴 EM TRANSMISSÃO
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </div>
        
        <CardContent className="space-y-6">
          <AulaInfoGrid 
            aulaAtiva={aulaAtiva} 
            turmaCode={turmaCode} 
            aulaEmAndamento={aulaEmAndamento} 
            aulaFutura={aulaFutura} 
          />

          <div className="space-y-4">
            <Button 
              onClick={() => abrirAula(aulaAtiva)}
              className={`w-full font-bold text-lg py-3 shadow-lg transform hover:scale-105 transition-all duration-200 ${
                aulaEmAndamento 
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700' 
                  : aulaFutura 
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  : 'bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700'
              } text-white`}
            >
              <Video className="w-6 h-6 mr-3" />
              {aulaAtiva.abrir_aba_externa && <ExternalLink className="w-4 h-4 mr-2" />}
              {aulaEmAndamento ? '🔴 ENTRAR NA AULA AO VIVO' : aulaFutura ? '🎥 Entre na sala e aguarde o professor' : '📺 AULA ENCERRADA'}
            </Button>

            {(aulaEmAndamento || aulaEncerrada) && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <PresencaDialog
                    tipo="entrada"
                    aulaId={aulaAtiva.id}
                    jaRegistrou={jaRegistrou(aulaAtiva.id, 'entrada')}
                    openDialog={openDialog}
                    onOpenChange={(open) => !open && setOpenDialog(null)}
                    onOpenPresencaDialog={openPresencaDialog}
                    formData={formData}
                    onFormDataChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                    onRegistrarPresenca={(tipo, aulaId) => registrarPresenca(tipo, aulaId)}
                  />

                  <PresencaDialog
                    tipo="saida"
                    aulaId={aulaAtiva.id}
                    jaRegistrou={false} // Botão sempre habilitado, validação no clique
                    openDialog={openDialog}
                    onOpenChange={(open) => !open && setOpenDialog(null)}
                    onOpenPresencaDialog={openPresencaDialog}
                    formData={formData}
                    onFormDataChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                    onRegistrarPresenca={(tipo, aulaId) => registrarPresenca(tipo, aulaId)}
                  />
                </div>
                
                {/* Status da Presença */}
                {(jaRegistrou(aulaAtiva.id, 'entrada') || jaRegistrou(aulaAtiva.id, 'saida')) && (
                  <div className="bg-white/90 border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Status da Presença:</h4>
                    {jaRegistrou(aulaAtiva.id, 'entrada') && (
                      <div className="flex items-center gap-2 text-green-700 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>✅ Entrada: {registrosPresenca.find(r => r.aula_id === aulaAtiva.id)?.entrada_at && new Date(registrosPresenca.find(r => r.aula_id === aulaAtiva.id)!.entrada_at!).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                      </div>
                    )}
                    {jaRegistrou(aulaAtiva.id, 'saida') && (
                      <div className="flex items-center gap-2 text-blue-700 text-sm mt-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>🚪 Saída: {registrosPresenca.find(r => r.aula_id === aulaAtiva.id)?.saida_at && new Date(registrosPresenca.find(r => r.aula_id === aulaAtiva.id)!.saida_at!).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
