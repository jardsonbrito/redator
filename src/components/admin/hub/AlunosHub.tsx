import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlunoList } from '@/components/admin/AlunoList';
import { AlunoPerfilSheet, type AlunoHubItem } from './AlunoPerfilSheet';
import ResumoTurma from '@/pages/admin/ResumoTurma';
import { TurmasAlunosManager } from '@/components/admin/TurmasAlunosManager';
import { LoginDashboardTab } from '@/components/admin/LoginDashboardTab';
import { CadastroDiretoAluno } from './CadastroDiretoAluno';
import { ImportacaoLoteAlunos } from './ImportacaoLoteAlunos';

export function AlunosHub() {
  const [refresh, setRefresh] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoHubItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('lista');

  const handleOpenPerfil = (aluno: AlunoHubItem) => {
    setAlunoSelecionado(aluno);
    setSheetOpen(true);
  };

  const handleRefresh = () => setRefresh((v) => !v);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="cadastramento">Convites</TabsTrigger>
          <TabsTrigger value="cadastro-direto">Cadastro Direto</TabsTrigger>
          <TabsTrigger value="importar-lote">Importar em Lote</TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho Acadêmico</TabsTrigger>
          <TabsTrigger value="login">Login</TabsTrigger>
        </TabsList>

        {/* Lista de alunos + visitantes */}
        <TabsContent value="lista">
          <AlunoList
            refresh={refresh}
            onEdit={(aluno) => handleOpenPerfil(aluno as AlunoHubItem)}
            onOpenPerfil={handleOpenPerfil}
          />
        </TabsContent>

        {/* Cadastramento: criação de turmas + geração de convites/acessos */}
        <TabsContent value="cadastramento">
          <TurmasAlunosManager />
        </TabsContent>

        {/* Cadastro direto: sem convite */}
        <TabsContent value="cadastro-direto">
          <CadastroDiretoAluno />
        </TabsContent>

        {/* Importação em lote via CSV */}
        <TabsContent value="importar-lote">
          <ImportacaoLoteAlunos />
        </TabsContent>

        {/* Desempenho acadêmico por turma */}
        <TabsContent value="desempenho">
          <ResumoTurma />
        </TabsContent>

        {/* Acesso / Login */}
        <TabsContent value="login">
          <LoginDashboardTab />
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
