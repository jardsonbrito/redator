import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, BarChart3 } from 'lucide-react';
import { AlunoFormModern } from '@/components/admin/AlunoFormModern';
import { AlunoList } from '@/components/admin/AlunoList';
import { AlunoPerfilSheet, type AlunoHubItem } from './AlunoPerfilSheet';
import ResumoTurma from '@/pages/admin/ResumoTurma';

export function AlunosHub() {
  const [refresh, setRefresh] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoHubItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Manter compatibilidade com o fluxo de edição legado do AlunoFormModern
  const [alunoEditando, setAlunoEditando] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('lista');

  const handleOpenPerfil = (aluno: AlunoHubItem) => {
    setAlunoSelecionado(aluno);
    setSheetOpen(true);
  };

  const handleRefresh = () => setRefresh((v) => !v);

  const handleAlunoSuccess = () => {
    handleRefresh();
    setAlunoEditando(null);
    setActiveTab('lista');
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="lista" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="cadastro" className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Cadastro
          </TabsTrigger>
          <TabsTrigger value="turma" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Por Turma
          </TabsTrigger>
        </TabsList>

        {/* Lista de alunos + visitantes */}
        <TabsContent value="lista">
          <AlunoList
            refresh={refresh}
            onEdit={(aluno) => {
              // Para alunos normais, abre o sheet de perfil completo
              handleOpenPerfil(aluno as AlunoHubItem);
            }}
            onOpenPerfil={handleOpenPerfil}
          />
        </TabsContent>

        {/* Cadastro manual / CSV / Autoatendimento */}
        <TabsContent value="cadastro">
          <AlunoFormModern
            onSuccess={handleAlunoSuccess}
            alunoEditando={alunoEditando}
            onCancelEdit={() => { setAlunoEditando(null); setActiveTab('lista'); }}
            refresh={refresh}
            onEdit={(aluno) => {
              setAlunoEditando(aluno);
              setActiveTab('cadastro');
            }}
          />
        </TabsContent>

        {/* Resumo por turma */}
        <TabsContent value="turma">
          <ResumoTurma />
        </TabsContent>
      </Tabs>

      {/* Sheet de perfil do aluno */}
      <AlunoPerfilSheet
        aluno={alunoSelecionado}
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setAlunoSelecionado(null); }}
        onRefresh={handleRefresh}
      />
    </>
  );
}
