import { useState, useEffect } from "react";
import { Video, Clock, Users, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AulaVirtual } from "./types";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { PresenciaStatus } from "./PresenciaStatus";
import { usePresencaComToken } from "@/hooks/usePresencaComToken";
import { PresencaDialog } from "@/components/aula-virtual/PresencaDialog";

interface AulaAoVivoCardProps {
  aula: AulaVirtual;
  turmaCode: string;
}

export const AulaAoVivoCard = ({ aula, turmaCode }: AulaAoVivoCardProps) => {
  const { toast } = useToast();
  const { studentData } = useStudentAuth();
  
  // Estado local para tracking de presença (compatibilidade)
  const [timestampEntrada, setTimestampEntrada] = useState<string | null>(null);
  const [timestampSaida, setTimestampSaida] = useState<string | null>(null);
  
  // Usar novo hook de presença com token
  const {
    openDialog,
    formData,
    setOpenDialog,
    setFormData,
    registrarPresenca,
    jaRegistrou,
    openPresencaDialog,
    fetchRegistrosPresenca
  } = usePresencaComToken();

  // Verificar registros existentes ao carregar o componente
  useEffect(() => {
    if (studentData.email) {
      verificarRegistrosExistentes();
      fetchRegistrosPresenca(); // Atualizar hook também
    }
  }, [studentData.email, aula.id, fetchRegistrosPresenca]);

  const verificarRegistrosExistentes = async () => {
    try {
      if (!studentData.email) return;

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('entrada_at, saida_at')
        .eq('aula_id', aula.id)
        .eq('email_aluno', studentData.email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar registros:', error);
        return;
      }

      if (data) {
        setTimestampEntrada(data.entrada_at);
        setTimestampSaida(data.saida_at);
      }
    } catch (error) {
      console.error('Erro ao verificar registros:', error);
    }
  };

  const handleRegistrarPresenca = async (tipo: 'entrada' | 'saida') => {
    await registrarPresenca(tipo, aula.id);
    // Atualizar timestamps locais após registro
    setTimeout(() => verificarRegistrosExistentes(), 500);
  };

  const isAgendada = aula.status_transmissao === 'agendada';
  const isEmTransmissao = aula.status_transmissao === 'em_transmissao';

  return (
    <>
      <Card className="rounded-2xl shadow-sm border bg-card p-4 md:p-5 hover:shadow-md transition-shadow duration-300 mb-8">
        <div className="grid md:grid-cols-[320px_minmax(0,1fr)] gap-4 md:gap-5 items-start">
          {/* Thumbnail/Capa */}
          <div className="relative w-full aspect-video overflow-hidden rounded-xl">
            <img
              src={aula.imagem_capa_url || "/placeholders/aula-cover.png"}
              alt={`Capa da aula: ${aula.titulo}`}
              className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src = "/placeholders/aula-cover.png";
              }}
            />
            
            {/* Status badge overlay */}
            {isEmTransmissao && (
              <div className="absolute top-3 left-3">
                <Badge variant="destructive" className="bg-red-600 text-white animate-pulse font-bold shadow-lg">
                  🔴 AO VIVO
                </Badge>
              </div>
            )}
          </div>

          {/* Conteúdo */}
          <div className="flex flex-col gap-3">
            {/* Badges e Status */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={
                isEmTransmissao 
                  ? "bg-red-600 text-white animate-pulse" 
                  : "bg-blue-600 text-white"
              }>
                {isEmTransmissao ? "🔴 AO VIVO" : "📅 AGENDADA"}
              </Badge>
              <Badge variant="outline" className="text-xs">Google Meet</Badge>
              {turmaCode && turmaCode !== "Visitante" && (
                <Badge variant="outline" className="text-xs">{turmaCode}</Badge>
              )}
            </div>

            {/* Título */}
            <h3 className="text-lg md:text-xl font-semibold leading-tight text-foreground">
              📺 {aula.titulo}
            </h3>

            {/* Descrição */}
            {aula.descricao && (
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {aula.descricao}
              </p>
            )}

            {/* Metadados */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(aula.data_aula).toLocaleDateString('pt-BR')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {aula.horario_inicio} – {aula.horario_fim}
              </span>
              {turmaCode && (
                <span className="inline-flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {turmaCode === "Visitante" ? "Visitantes" : turmaCode}
                </span>
              )}
            </div>

            {/* Status de Presença */}
            {(timestampEntrada || timestampSaida) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-800">
                  <p className="font-medium">Status da Presença:</p>
                  <PresenciaStatus entrada={timestampEntrada} saida={timestampSaida} />
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="mt-1 flex flex-col gap-2">
              {/* Botão principal - Entrar na aula */}
              <Button 
                onClick={() => window.open(aula.link_meet, '_blank')}
                className="w-full font-medium"
                variant={isEmTransmissao ? 'default' : 'outline'}
              >
                <Video className="w-4 h-4 mr-2" />
                {isEmTransmissao ? '🔴 ENTRAR NA AULA AO VIVO' : '🎥 Entre na sala e aguarde o professor'}
              </Button>

              {/* Botões de presença usando novo componente */}
              <div className="grid md:grid-cols-2 gap-2">
                <PresencaDialog
                  tipo="entrada"
                  aulaId={aula.id}
                  jaRegistrou={jaRegistrou('entrada', aula.id)}
                  openDialog={openDialog}
                  onOpenChange={(open) => !open && setOpenDialog(null)}
                  onOpenPresencaDialog={openPresencaDialog}
                  formData={formData}
                  onFormDataChange={(field, value) => setFormData({...formData, [field]: value})}
                  onRegistrarPresenca={handleRegistrarPresenca}
                />

                {jaRegistrou('entrada', aula.id) && (
                  <PresencaDialog
                    tipo="saida"
                    aulaId={aula.id}
                    jaRegistrou={jaRegistrou('saida', aula.id)}
                    openDialog={openDialog}
                    onOpenChange={(open) => !open && setOpenDialog(null)}
                    onOpenPresencaDialog={openPresencaDialog}
                    formData={formData}
                    onFormDataChange={(field, value) => setFormData({...formData, [field]: value})}
                    onRegistrarPresenca={handleRegistrarPresenca}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};