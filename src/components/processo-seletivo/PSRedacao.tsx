import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle,
  Lock
} from 'lucide-react';
import { Candidato, EtapaFinal } from '@/hooks/useProcessoSeletivo';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

const TZ = 'America/Fortaleza';

interface PSRedacaoProps {
  candidato: Candidato;
  etapaFinal: EtapaFinal | null;
  hasSubmittedRedacao?: boolean;
}

type JanelaStatus = 'sem_config' | 'antes' | 'durante' | 'depois';

interface JanelaInfo {
  dentroJanela: boolean;
  status: JanelaStatus;
  inicio?: Date;
  fim?: Date;
}

// Componente de Countdown (igual ao SimuladoCardPadrao)
const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = dayjs.tz(dayjs(), TZ);
      const target = dayjs.tz(targetDate, 'YYYY-MM-DD HH:mm', TZ);

      const diff = target.diff(now);

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const durationObj = dayjs.duration(diff);
      setTimeLeft({
        days: Math.floor(durationObj.asDays()),
        hours: durationObj.hours(),
        minutes: durationObj.minutes()
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="w-full h-40 flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600 rounded-t-xl text-white shadow-lg">
      <div className="text-center px-4">
        <p className="text-sm font-medium mb-4 opacity-90 tracking-wide">Faltam para o início:</p>
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <div className="text-center bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums leading-none">
              {timeLeft.days}
            </div>
            <div className="text-xs opacity-80 mt-1 font-medium">dias</div>
          </div>
          <div className="text-center bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums leading-none">
              {timeLeft.hours}
            </div>
            <div className="text-xs opacity-80 mt-1 font-medium">horas</div>
          </div>
          <div className="text-center bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums leading-none">
              {timeLeft.minutes}
            </div>
            <div className="text-xs opacity-80 mt-1 font-medium">min</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Função para obter URL da capa do tema
const getTemaCoverUrl = (tema: any): string => {
  if (tema?.cover_file_path) {
    const { data } = supabase.storage
      .from('tema-covers')
      .getPublicUrl(tema.cover_file_path);
    return data?.publicUrl || '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
  }
  if (tema?.cover_url) {
    return tema.cover_url;
  }
  return '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
};

export const PSRedacao: React.FC<PSRedacaoProps> = ({
  candidato,
  etapaFinal,
  hasSubmittedRedacao = false
}) => {
  const navigate = useNavigate();

  // Buscar dados do tema vinculado
  const { data: tema } = useQuery({
    queryKey: ['ps-tema', etapaFinal?.tema_id],
    queryFn: async () => {
      if (!etapaFinal?.tema_id) return null;
      const { data, error } = await supabase
        .from('temas')
        .select('id, frase_tematica, eixo_tematico, cover_file_path, cover_url')
        .eq('id', etapaFinal.tema_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!etapaFinal?.tema_id
  });

  // Verificar janela de tempo
  const verificarJanela = (): JanelaInfo => {
    if (!etapaFinal || !etapaFinal.data_inicio || !etapaFinal.hora_inicio || !etapaFinal.data_fim || !etapaFinal.hora_fim) {
      return { dentroJanela: false, status: 'sem_config' };
    }

    const agora = new Date();
    const inicio = new Date(`${etapaFinal.data_inicio}T${etapaFinal.hora_inicio}`);
    const fim = new Date(`${etapaFinal.data_fim}T${etapaFinal.hora_fim}`);

    if (agora < inicio) {
      return { dentroJanela: false, status: 'antes', inicio, fim };
    }
    if (agora > fim) {
      return { dentroJanela: false, status: 'depois', inicio, fim };
    }
    return { dentroJanela: true, status: 'durante', inicio, fim };
  };

  const janela = verificarJanela();

  // Determinar status e badge
  const getStatusInfo = () => {
    if (hasSubmittedRedacao) {
      return { label: 'Concluído', bgColor: 'bg-blue-600' };
    }
    switch (janela.status) {
      case 'antes':
        return { label: 'Agendado', bgColor: 'bg-yellow-500' };
      case 'durante':
        return { label: 'Em andamento', bgColor: 'bg-green-600' };
      case 'depois':
        return { label: 'Ausente', bgColor: 'bg-red-600' };
      default:
        return { label: 'Aguardando', bgColor: 'bg-gray-400' };
    }
  };

  const statusInfo = getStatusInfo();
  const isAgendado = janela.status === 'antes';
  const isAtivo = janela.status === 'durante' && !hasSubmittedRedacao;
  const isEncerrado = janela.status === 'depois' || hasSubmittedRedacao;

  // Formatar datas
  const getFormattedDates = () => {
    if (!janela.inicio || !janela.fim) {
      return { inicio: 'Data não definida', fim: 'Data não definida' };
    }
    try {
      return {
        inicio: format(janela.inicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
        fim: format(janela.fim, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      };
    } catch {
      return { inicio: 'Data inválida', fim: 'Data inválida' };
    }
  };

  const dates = getFormattedDates();

  const handleParticipar = () => {
    if (!etapaFinal?.tema_id) {
      console.error('Tema não configurado para a etapa final');
      return;
    }
    navigate(`/temas/${etapaFinal.tema_id}?processo_seletivo=${candidato.id}`);
  };

  // Sem configuração de etapa final
  if (!etapaFinal || !etapaFinal.ativo) {
    return (
      <Card className="bg-white rounded-xl shadow-md overflow-hidden border-gray-200 max-w-md mx-auto">
        <CardContent className="py-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">Etapa Final</h3>
          <p className="text-muted-foreground">
            A etapa final ainda não foi configurada. Aguarde mais informações.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 flex flex-col max-w-md mx-auto">
      {/* Imagem/Timer + badges */}
      <div className="relative">
        {isAgendado ? (
          // Timer para processo seletivo agendado
          <CountdownTimer targetDate={`${etapaFinal.data_inicio} ${etapaFinal.hora_inicio}`} />
        ) : (
          // Imagem normal para outros status
          <div className="w-full h-40 overflow-hidden">
            <img
              src={getTemaCoverUrl(tema)}
              alt="Capa do Processo Seletivo"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
              }}
            />
          </div>
        )}

        {/* Badge de status */}
        <Badge className={`absolute top-2 right-2 text-white text-xs px-2 py-1 shadow-sm ${statusInfo.bgColor}`}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 mb-2 leading-tight">
          Processo Seletivo
        </h3>

        {/* Frase temática - não mostrar quando agendado */}
        {!isAgendado && (tema?.frase_tematica || etapaFinal.tema_redacao) && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {tema?.frase_tematica || etapaFinal.tema_redacao}
          </p>
        )}

        {/* Meta info - datas */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Início: {dates.inicio}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Fim: {dates.fim}</span>
          </div>
        </div>

        <div className="flex-1"></div>
      </div>

      {/* Rodapé com botões */}
      <div className="px-4 py-3 border-t border-gray-100 mt-auto">
        {/* Estado: Em andamento - Botão participar */}
        {isAtivo && (
          <Button
            onClick={handleParticipar}
            className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
            disabled={!etapaFinal.tema_id}
          >
            Participar da Seleção
          </Button>
        )}

        {/* Estado: Concluído - Já enviou redação */}
        {hasSubmittedRedacao && (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Redação Enviada</span>
            </div>
            <p className="text-xs text-gray-500">
              Aguarde o resultado da avaliação
            </p>
          </div>
        )}

        {/* Estado: Encerrado sem envio - Ausente */}
        {janela.status === 'depois' && !hasSubmittedRedacao && (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
              <Lock className="h-5 w-5" />
              <span className="font-medium">Janela Encerrada</span>
            </div>
            <p className="text-xs text-gray-500">
              Você não enviou sua redação para esta seleção
            </p>
          </div>
        )}

        {/* Estado: Agendado - Mostrar instrução */}
        {isAgendado && (
          <div className="text-center text-xs text-gray-500 py-2">
            Volte quando a janela de envio estiver aberta
          </div>
        )}
      </div>
    </Card>
  );
};

export default PSRedacao;
