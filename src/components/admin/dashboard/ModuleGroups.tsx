import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import { DetailedDashboardCard } from '@/components/admin/DetailedDashboardCard';
import { RedacoesComentadasIcon } from '@/components/icons/RedacoesComentadasIcon';
import { ProfessorasIcon } from '@/components/icons/ProfessorasIcon';

interface IconProps {
  size?: number;
  color?: string;
  weight?: string;
  className?: string;
  style?: React.CSSProperties;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<IconProps>;
  iconColor: string;
  chips?: string[];
}

interface CardDataEntry {
  info: string;
  badge?: string;
  badgeVariant?: string;
  chips?: string[];
}

interface ModuleGroupsProps {
  menuItems: MenuItem[];
  cardData: Record<string, CardDataEntry>;
  isLoading: boolean;
  setActiveView: (view: string) => void;
  navigate: NavigateFunction;
  meuCorretor: { id: string; nome_completo: string; email: string } | null;
  mensagensCorretorNaoLidas: number;
  handleAcessarPainelCorretor: () => void;
}

// Mapeamento dos 33 módulos nos 6 grupos
const GROUPS: { id: string; title: string; moduleIds: string[] }[] = [
  {
    id: 'usuarios',
    title: 'Gestão de Usuários',
    moduleIds: ['alunos', 'professores', 'corretores', 'administradores', 'processo-seletivo'],
  },
  {
    id: 'producao-pedagogica',
    title: 'Produção Pedagógica',
    moduleIds: [
      'temas',
      'redacoes',
      'redacoes-comentadas',
      'biblioteca',
      'repertorio-orientado',
      'laboratorio',
      'microaprendizagem',
      'guia-tematico',
      'plano-estudo',
    ],
  },
  {
    id: 'correcoes-desempenho',
    title: 'Correções e Desempenho',
    moduleIds: ['redacoes-enviadas', 'exercicios', 'simulados', 'lousa', 'radar', 'top5'],
  },
  {
    id: 'aulas-experiencias',
    title: 'Aulas e Experiências',
    moduleIds: ['salas-virtuais', 'aulas', 'videos', 'gamificacao', 'diario'],
  },
  {
    id: 'comunicacao',
    title: 'Comunicação e Acompanhamento',
    moduleIds: ['inbox', 'calendario', 'avisos', 'ajuda-rapida', 'anotacoes'],
  },
  {
    id: 'sistema',
    title: 'Administração e Sistema',
    moduleIds: ['jarvis', 'configuracoes', 'exportacao'],
  },
];

export const ModuleGroups = ({
  menuItems,
  cardData,
  isLoading,
  setActiveView,
  navigate,
  meuCorretor,
  mensagensCorretorNaoLidas,
  handleAcessarPainelCorretor,
}: ModuleGroupsProps) => {
  const itemMap = new Map(menuItems.map((item) => [item.id, item]));

  const handleChipClick = (itemId: string, chipValue: string) => {
    if (itemId === 'temas') {
      let statusParam = 'todos';
      if (chipValue.includes('agendados')) statusParam = 'agendado';
      else if (chipValue.includes('rascunhos')) statusParam = 'rascunho';
      setActiveView('temas');
      const p = new URLSearchParams();
      p.set('status', statusParam);
      navigate(`?${p.toString()}`);
      return;
    }

    if (itemId === 'jarvis') {
      const map: Record<string, string> = {
        Créditos: 'creditos',
        Modos: 'modos',
        Parâmetros: 'configuracoes',
        Tutoria: 'tutoria',
        Histórico: 'historico',
      };
      const subtab = map[chipValue];
      if (subtab) {
        setActiveView('jarvis');
        const p = new URLSearchParams();
        p.set('view', 'jarvis');
        p.set('subtab', subtab);
        navigate(`?${p.toString()}`);
      }
      return;
    }

    if (itemId === 'diario') {
      const map: Record<string, string> = {
        Etapas: 'etapas',
        Aulas: 'aulas',
        Turma: 'turma',
        Avaliação: 'avaliação',
      };
      const subtab = map[chipValue];
      if (subtab) {
        setActiveView('diario');
        const p = new URLSearchParams();
        p.set('view', 'diario');
        p.set('subtab', subtab);
        navigate(`?${p.toString()}`);
      }
      return;
    }

    if (itemId === 'configuracoes') {
      const map: Record<string, string> = {
        Conta: 'account',
        Envios: 'submissions',
        Créditos: 'credits',
        Assinatura: 'subscriptions',
      };
      const subtab = map[chipValue];
      if (subtab) {
        setActiveView('configuracoes');
        const p = new URLSearchParams();
        p.set('view', 'configuracoes');
        p.set('subtab', subtab);
        navigate(`?${p.toString()}`);
      }
    }
  };

  const renderCard = (item: MenuItem) => {
    const isJarvis = item.id === 'jarvis' && !!meuCorretor;

    const icon =
      item.id === 'redacoes-comentadas' ? (
        <RedacoesComentadasIcon
          className="w-8 h-8"
          style={{ color: item.iconColor } as React.CSSProperties}
        />
      ) : item.id === 'professores' ? (
        <ProfessorasIcon
          className="w-8 h-8"
          style={{ color: item.iconColor } as React.CSSProperties}
        />
      ) : (
        <item.icon size={32} color={item.iconColor} weight="fill" />
      );

    const cardEl = (
      <DetailedDashboardCard
        title={item.label}
        icon={icon}
        primaryInfo={isLoading ? 'Carregando...' : (cardData[item.id]?.info || '')}
        secondaryInfo={cardData[item.id]?.badge}
        description=""
        chips={cardData[item.id]?.chips ?? item.chips}
        chipColor={item.iconColor}
        onClick={() => setActiveView(item.id)}
        onChipClick={(_idx, chipValue) => handleChipClick(item.id, chipValue)}
      />
    );

    if (isJarvis) {
      return (
        <div key={item.id} className="relative">
          {mensagensCorretorNaoLidas > 0 && (
            <span className="absolute top-3 right-10 z-10 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full shadow pointer-events-none">
              {mensagensCorretorNaoLidas}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAcessarPainelCorretor();
            }}
            title="Acessar painel do corretor"
            className="absolute top-3 right-3 z-10 text-gray-400 hover:text-[#7C3AED] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          {cardEl}
        </div>
      );
    }

    return <React.Fragment key={item.id}>{cardEl}</React.Fragment>;
  };

  return (
    <div className="space-y-10">
      {GROUPS.map((group) => {
        const groupItems = group.moduleIds
          .map((id) => itemMap.get(id))
          .filter((item): item is MenuItem => !!item);

        if (groupItems.length === 0) return null;

        return (
          <section key={group.id} id={`section-${group.id}`}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-800 whitespace-nowrap">
                {group.title}
              </h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupItems.map((item) => renderCard(item))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
