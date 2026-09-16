import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfessorList } from '@/components/admin/ProfessorList';
import { ProfessorForm } from '@/components/admin/ProfessorForm';
import { TurmasProfessoresManager } from '@/components/admin/TurmasProfessoresManager';
import { ProfessorSubscriptionManagement } from '@/components/admin/ProfessorSubscriptionManagement';
import { PlansManager } from '@/components/admin/PlansManager';
import { ProfessorFeaturesManager } from '@/components/admin/ProfessorFeaturesManager';

export function ProfessoresHub() {
  const [refresh, setRefresh] = useState(false);
  const [professorEditando, setProfessorEditando] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('lista');

  const handleSuccess = () => {
    setRefresh(v => !v);
    setProfessorEditando(null);
  };

  const handleEdit = (professor: any) => {
    setProfessorEditando(professor);
    setActiveTab('lista');
  };

  const handleCancelEdit = () => {
    setProfessorEditando(null);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="lista">Lista</TabsTrigger>
        <TabsTrigger value="cadastramento">Cadastramento</TabsTrigger>
        <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
        <TabsTrigger value="planos">Planos</TabsTrigger>
        <TabsTrigger value="funcionalidades">Funcionalidades</TabsTrigger>
      </TabsList>

      <TabsContent value="lista" className="space-y-6">
        {professorEditando && (
          <ProfessorForm
            onSuccess={handleSuccess}
            professorEditando={professorEditando}
            onCancelEdit={handleCancelEdit}
          />
        )}
        <ProfessorList
          refresh={refresh}
          onEdit={handleEdit}
        />
      </TabsContent>

      <TabsContent value="cadastramento">
        <TurmasProfessoresManager />
      </TabsContent>

      <TabsContent value="assinaturas">
        <ProfessorSubscriptionManagement />
      </TabsContent>

      <TabsContent value="planos">
        <PlansManager tipo="professor" />
      </TabsContent>

      <TabsContent value="funcionalidades">
        <ProfessorFeaturesManager />
      </TabsContent>
    </Tabs>
  );
}
