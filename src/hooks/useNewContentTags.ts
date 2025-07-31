import { useState, useEffect } from 'react';
import { useStudentAuth } from './useStudentAuth';

interface NewContentState {
  [cardName: string]: boolean;
}

export const useNewContentTags = () => {
  const { studentData } = useStudentAuth();
  const [seenCards, setSeenCards] = useState<NewContentState>({});

  // Chave única para localStorage baseada no email do usuário
  const getStorageKey = () => {
    return `new_content_seen_${studentData.email || 'anonymous'}`;
  };

  // Carregar estado do localStorage na inicialização
  useEffect(() => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setSeenCards(JSON.parse(saved));
      } catch (error) {
        console.error('Erro ao carregar estado das tags NOVO:', error);
      }
    }
  }, [studentData.email]);

  // Marcar card como visto
  const markCardAsSeen = (cardName: string) => {
    const newState = { ...seenCards, [cardName]: true };
    setSeenCards(newState);
    
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(newState));
  };

  // Verificar se deve mostrar tag NOVO para um card específico
  const shouldShowNewTag = (cardName: string): boolean => {
    // Se já foi visto, não mostrar
    if (seenCards[cardName]) {
      return false;
    }

    // Lógica para determinar se há conteúdo novo baseado no tipo de card
    // Por enquanto, vamos simular que sempre há conteúdo novo se não foi visto
    // Em uma implementação real, isso seria baseado em datas de publicação do backend
    return hasNewContent(cardName);
  };

  // Função para determinar se há conteúdo novo baseado no tipo de card
  const hasNewContent = (cardName: string): boolean => {
    // Mapeamento de nomes de cards para suas respectivas verificações
    const cardTypeMap: { [key: string]: string } = {
      'Temas': 'temas',
      'Simulados': 'simulados', 
      'Exercícios': 'exercicios',
      'Redações Exemplares': 'redacoes',
      'Videoteca': 'videos',
      'Aulas': 'aulas',
      'Biblioteca': 'biblioteca',
      'Minhas Redações': 'minhas_redacoes',
      'Enviar Redação': 'enviar_redacao',
      'Enviar Redação – Tema Livre': 'enviar_redacao',
      'Enviar Redação Avulsa – Tema Livre': 'enviar_redacao',
      'Top 5': 'top5'
    };

    const cardType = cardTypeMap[cardName];
    if (!cardType) return false;

    return checkNewContentByType(cardType);
  };

  // Verificar conteúdo novo por tipo
  const checkNewContentByType = (type: string): boolean => {
    const lastCheckKey = `last_check_${type}_${studentData.email}`;
    const lastCheck = localStorage.getItem(lastCheckKey);
    
    if (!lastCheck) {
      // Se nunca checou antes, mostrar como novo por 7 dias
      // para dar tempo do aluno explorar o sistema
      const accountAge = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 dias atrás
      return Date.now() > accountAge;
    }

    // Considerar que há conteúdo novo se a última verificação 
    // foi há mais de 3 dias (simulação de publicação de conteúdo)
    const lastCheckDate = new Date(lastCheck);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60);
    
    // Diferentes intervalos para diferentes tipos de conteúdo
    const intervals: { [key: string]: number } = {
      'temas': 168, // 7 dias - temas são publicados semanalmente
      'simulados': 168, // 7 dias - simulados são periódicos
      'exercicios': 72, // 3 dias - exercícios mais frequentes
      'redacoes': 240, // 10 dias - redações exemplares menos frequentes
      'videos': 120, // 5 dias - vídeos publicados com frequência média
      'aulas': 168, // 7 dias - aulas semanais
      'biblioteca': 336, // 14 dias - materiais de biblioteca atualizados mensalmente
      'minhas_redacoes': 24, // 1 dia - correções são mais frequentes
    };
    
    const interval = intervals[type] || 168; // Default 7 dias
    return hoursDiff > interval;
  };

  // Atualizar última verificação de conteúdo para um tipo
  const updateLastCheck = (cardName: string) => {
    const cardTypeMap: { [key: string]: string } = {
      'Temas': 'temas',
      'Simulados': 'simulados', 
      'Exercícios': 'exercicios',
      'Redações Exemplares': 'redacoes',
      'Videoteca': 'videos',
      'Aulas': 'aulas',
      'Biblioteca': 'biblioteca',
      'Minhas Redações': 'minhas_redacoes',
      'Enviar Redação': 'enviar_redacao',
      'Top 5': 'top5'
    };

    const cardType = cardTypeMap[cardName];
    if (cardType) {
      const lastCheckKey = `last_check_${cardType}_${studentData.email}`;
      localStorage.setItem(lastCheckKey, new Date().toISOString());
    }
  };

  // Função principal para lidar com clique em card
  const handleCardClick = (cardName: string) => {
    markCardAsSeen(cardName);
    updateLastCheck(cardName);
  };

  return {
    shouldShowNewTag,
    handleCardClick,
    markCardAsSeen
  };
};