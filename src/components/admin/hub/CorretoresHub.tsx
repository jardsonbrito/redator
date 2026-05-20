import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CorretorList } from '@/components/admin/CorretorList';
import { CorretorForm } from '@/components/admin/CorretorForm';
import { CorretorIAConfig } from '@/components/admin/CorretorIAConfig';

export function CorretoresHub() {
  const [refresh, setRefresh] = useState(false);
  const [corretorEditando, setCorretorEditando] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('lista');

  const handleSuccess = () => {
    setRefresh((v) => !v);
    setCorretorEditando(null);
    setActiveTab('lista');
  };

  const handleEdit = (corretor: any) => {
    setCorretorEditando(corretor);
    setActiveTab('cadastro');
  };

  const handleCancelEdit = () => {
    setCorretorEditando(null);
    setActiveTab('lista');
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="lista">Lista</TabsTrigger>
        <TabsTrigger value="cadastro">
          {corretorEditando ? 'Editar Corretor' : 'Cadastro'}
        </TabsTrigger>
        <TabsTrigger value="ia">Configuração de IA</TabsTrigger>
      </TabsList>

      <TabsContent value="lista">
        <CorretorList refresh={refresh} onEdit={handleEdit} />
      </TabsContent>

      <TabsContent value="cadastro">
        <CorretorForm
          onSuccess={handleSuccess}
          corretorEditando={corretorEditando}
          onCancelEdit={handleCancelEdit}
        />
      </TabsContent>

      <TabsContent value="ia">
        <CorretorIAConfig />
      </TabsContent>
    </Tabs>
  );
}
