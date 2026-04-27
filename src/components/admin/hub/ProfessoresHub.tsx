import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfessorList } from '@/components/admin/ProfessorList';
import { ProfessorForm } from '@/components/admin/ProfessorForm';
import { TurmasProfessoresManager } from '@/components/admin/TurmasProfessoresManager';

export function ProfessoresHub() {
  const [refresh, setRefresh] = useState(false);
  const [professorEditando, setProfessorEditando] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('lista');

  const handleSuccess = () => {
    setRefresh(v => !v);
    setProfessorEditando(null);
    setActiveTab('lista');
  };

  const handleEdit = (professor: any) => {
    setProfessorEditando(professor);
    setActiveTab('cadastramento');
  };

  const handleCancelEdit = () => {
    setProfessorEditando(null);
    setActiveTab('lista');
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="lista">Lista</TabsTrigger>
        <TabsTrigger value="cadastramento">Cadastramento</TabsTrigger>
      </TabsList>

      <TabsContent value="lista">
        <ProfessorList
          refresh={refresh}
          onEdit={handleEdit}
        />
      </TabsContent>

      <TabsContent value="cadastramento" className="space-y-6">
        <ProfessorForm
          onSuccess={handleSuccess}
          professorEditando={professorEditando}
          onCancelEdit={handleCancelEdit}
        />
        <TurmasProfessoresManager />
      </TabsContent>
    </Tabs>
  );
}
