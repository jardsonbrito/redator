import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JarvisCreditManagementBulk } from '@/components/admin/JarvisCreditManagementBulk';
import { JarvisHistoricoAdmin } from '@/components/admin/JarvisHistoricoAdmin';
import { JarvisCorrecaoCreditosProfessores } from '@/components/admin/JarvisCorrecaoCreditosProfessores';
import { JarvisCorrecaoHistoricoGeral } from '@/components/admin/JarvisCorrecaoHistoricoGeral';
import { JarvisModosManagement } from '@/components/admin/JarvisModosManagement';
import { JarvisConfigManagement } from '@/components/admin/JarvisConfigManagement';
import { JarvisTutoriaConfiguracao } from '@/components/admin/JarvisTutoriaConfiguracao';
import { JarvisCorrecaoConfigManager } from '@/components/admin/JarvisCorrecaoConfigManager';

interface JarvisHubProps {
  defaultTab?: string;
}

export function JarvisHub({ defaultTab = 'alunos' }: JarvisHubProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="alunos">Alunos</TabsTrigger>
        <TabsTrigger value="professores">Professores</TabsTrigger>
      </TabsList>

      {/* ── Alunos ─────────────────────────────────────────────────────────── */}
      <TabsContent value="alunos">
        <Tabs defaultValue="creditos" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="creditos">Créditos</TabsTrigger>
            <TabsTrigger value="historico">Histórico de Interações</TabsTrigger>
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          </TabsList>
          <TabsContent value="creditos" className="space-y-6">
            <JarvisCreditManagementBulk />
          </TabsContent>
          <TabsContent value="historico" className="space-y-6">
            <JarvisHistoricoAdmin />
          </TabsContent>
          <TabsContent value="configuracao">
            <Tabs defaultValue="modos" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="modos">Modos</TabsTrigger>
                <TabsTrigger value="parametros">Parâmetros IA</TabsTrigger>
                <TabsTrigger value="tutoria">Tutoria</TabsTrigger>
              </TabsList>
              <TabsContent value="modos" className="space-y-6">
                <JarvisModosManagement />
              </TabsContent>
              <TabsContent value="parametros" className="space-y-6">
                <JarvisConfigManagement />
              </TabsContent>
              <TabsContent value="tutoria" className="space-y-6">
                <JarvisTutoriaConfiguracao />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* ── Professores ────────────────────────────────────────────────────── */}
      <TabsContent value="professores">
        <Tabs defaultValue="creditos" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="creditos">Créditos</TabsTrigger>
            <TabsTrigger value="correcoes">Correções</TabsTrigger>
            <TabsTrigger value="config-correcao">Config. Correção IA</TabsTrigger>
          </TabsList>
          <TabsContent value="creditos" className="space-y-6">
            <JarvisCorrecaoCreditosProfessores />
          </TabsContent>
          <TabsContent value="correcoes" className="space-y-6">
            <JarvisCorrecaoHistoricoGeral />
          </TabsContent>
          <TabsContent value="config-correcao" className="space-y-6">
            <JarvisCorrecaoConfigManager />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
