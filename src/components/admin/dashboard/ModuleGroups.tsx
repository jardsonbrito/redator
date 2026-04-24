import React from 'react';
import { ArrowRight, ExternalLink, Users, BookOpen, ClipboardCheck, MonitorPlay, MessageSquare, Settings } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
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

// Texto de fallback para módulos sem contador
const MODULE_FALLBACKS: Record<string, string> = {
  radar: 'Desempenho mensal',
  professores: 'Gestão de docentes',
  administradores: 'Permissões internas',
  exportacao: 'Relatórios e dados',
  top5: 'Destaques da turma',
  'repertorio-orientado': 'Aulas e repertórios',
  microaprendizagem: 'Tópicos formativos',
  'plano-estudo': 'Trilhas pedagógicas',
  configuracoes: 'Conta, envios e assinatura',
};

const GROUPS: {
  id: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: number }>;
  moduleIds: string[];
}[] = [
  {
    id: 'usuarios',
    title: 'Gestão de Usuários',
    description: 'Perfis, equipes e acessos.',
    Icon: Users,
    moduleIds: ['alunos', 'professores', 'corretores', 'administradores', 'processo-seletivo'],
  },
  {
    id: 'producao-pedagogica',
    title: 'Produção Pedagógica',
    description: 'Conteúdos que estruturam o estudo.',
    Icon: BookOpen,
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
    description: 'Avaliação, pendências e evolução.',
    Icon: ClipboardCheck,
    moduleIds: ['redacoes-enviadas', 'exercicios', 'simulados', 'lousa', 'radar', 'top5'],
  },
  {
    id: 'aulas-experiencias',
    title: 'Aulas e Experiências',
    description: 'Vídeo, aulas e engajamento.',
    Icon: MonitorPlay,
    moduleIds: ['salas-virtuais', 'aulas', 'videos', 'gamificacao', 'diario'],
  },
  {
    id: 'comunicacao',
    title: 'Comunicação e Acompanhamento',
    description: 'Avisos, suporte e agenda.',
    Icon: MessageSquare,
    moduleIds: ['inbox', 'calendario', 'avisos', 'ajuda-rapida', 'anotacoes'],
  },
  {
    id: 'sistema',
    title: 'Administração e Sistema',
    description: 'IA, conta, relatórios e regras.',
    Icon: Settings,
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
        Créditos: 'creditos', Modos: 'modos', Parâmetros: 'configuracoes',
        Tutoria: 'tutoria', Histórico: 'historico',
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
        Etapas: 'etapas', Aulas: 'aulas', Turma: 'turma', 'Avaliação': 'avaliação',
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
        Conta: 'account', Envios: 'submissions', Créditos: 'credits', Assinatura: 'subscriptions',
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

  const renderIcon = (item: MenuItem, size: number) => {
    if (item.id === 'redacoes-comentadas') {
      return (
        <RedacoesComentadasIcon
          className={`w-[${size}px] h-[${size}px]`}
          style={{ color: '#4B078F', width: size, height: size } as React.CSSProperties}
        />
      );
    }
    if (item.id === 'professores') {
      return (
        <ProfessorasIcon
          className={`w-[${size}px] h-[${size}px]`}
          style={{ color: '#4B078F', width: size, height: size } as React.CSSProperties}
        />
      );
    }
    return <item.icon size={size} color="#4B078F" weight="fill" />;
  };

  const renderCard = (item: MenuItem) => {
    const isJarvis = item.id === 'jarvis' && !!meuCorretor;
    const rawInfo = isLoading ? 'Carregando...' : (cardData[item.id]?.info || '');
    const subtitle = rawInfo || MODULE_FALLBACKS[item.id] || '';

    return (
      <div key={item.id} className="relative">
        {/* Badge de mensagens não lidas no Jarvis */}
        {isJarvis && mensagensCorretorNaoLidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 z-20 bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full shadow pointer-events-none">
            {mensagensCorretorNaoLidas}
          </span>
        )}

        <button
          type="button"
          onClick={() => setActiveView(item.id)}
          className="relative group w-full text-left border border-purple-900/[0.07] rounded-[17px] bg-white hover:-translate-y-px hover:border-violet-700/20 transition-all duration-150 cursor-pointer"
          style={{
            minHeight: '82px',
            display: 'grid',
            gridTemplateColumns: '34px 1fr 18px',
            gap: '10px',
            padding: '12px',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(63,32,104,.03)',
          }}
        >
          {/* Ícone */}
          <span className="w-[34px] h-[34px] flex items-center justify-center rounded-[12px] bg-[#f7f1ff] text-[#4B078F] flex-shrink-0">
            {renderIcon(item, 18)}
          </span>

          {/* Texto */}
          <div className="min-w-0">
            <strong className="block text-[#21122f] text-[13px] font-semibold leading-tight truncate">
              {item.label}
            </strong>
            <p className="mt-1 text-[#8a8096] text-[12px] leading-tight truncate">
              {subtitle}
            </p>
          </div>

          {/* Seta / external link */}
          <span className="text-[#b9aec8] flex items-center justify-center flex-shrink-0">
            {isJarvis ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleAcessarPainelCorretor(); }}
                title="Acessar painel do corretor"
                className="text-[#b9aec8] hover:text-[#7C3AED] transition-colors"
              >
                <ExternalLink size={16} />
              </button>
            ) : (
              <ArrowRight size={16} className="group-hover:text-[#7C3AED] transition-colors" />
            )}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {GROUPS.map((group) => {
        const { Icon } = group;
        const groupItems = group.moduleIds
          .map((id) => itemMap.get(id))
          .filter((item): item is MenuItem => !!item);

        if (groupItems.length === 0) return null;

        return (
          <section
            key={group.id}
            id={`section-${group.id}`}
            className="border border-purple-900/[0.09] rounded-[26px] bg-white/95 p-[18px]"
            style={{ boxShadow: '0 10px 30px rgba(63,32,104,.04)' }}
          >
            {/* Header do grupo */}
            <header className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-[#f1e8ff] text-[#4B078F] flex-shrink-0">
                  <Icon size={19} />
                </span>
                <div>
                  <h3
                    className="font-bold text-[#21122f] leading-tight"
                    style={{ fontSize: '17px', letterSpacing: '-.03em', margin: 0 }}
                  >
                    {group.title}
                  </h3>
                  <p className="text-[12px] text-[#857a92] mt-1">{group.description}</p>
                </div>
              </div>
            </header>

            {/* Grid de módulos — 4 colunas no desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {groupItems.map((item) => renderCard(item))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
