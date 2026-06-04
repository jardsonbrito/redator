import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JarvisCreditManagementBulk } from '@/components/admin/JarvisCreditManagementBulk';
import { JarvisHistoricoAdmin } from '@/components/admin/JarvisHistoricoAdmin';
import { JarvisSessoesAdmin } from '@/components/admin/JarvisSessoesAdmin';
import { JarvisCorrecaoCreditosProfessores } from '@/components/admin/JarvisCorrecaoCreditosProfessores';
import { JarvisCorrecaoHistoricoGeral } from '@/components/admin/JarvisCorrecaoHistoricoGeral';
import { JarvisModosManagement } from '@/components/admin/JarvisModosManagement';
import { JarvisConfigManagement } from '@/components/admin/JarvisConfigManagement';
import { JarvisTutoriaConfiguracao } from '@/components/admin/JarvisTutoriaConfiguracao';
import { JarvisCorrecaoConfigManager } from '@/components/admin/JarvisCorrecaoConfigManager';
import { JarvisVideoInstrucao } from '@/components/admin/JarvisVideoInstrucao';

interface JarvisHubProps {
  defaultTab?: string;
}

export function JarvisHub({ defaultTab = 'tutor' }: JarvisHubProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="tutor">Tutor Jarvis</TabsTrigger>
        <TabsTrigger value="correcao">Correção IA</TabsTrigger>
      </TabsList>

      {/* ── Tutor Jarvis ────────────────────────────────────────────────────── */}
      <TabsContent value="tutor">
        <Tabs defaultValue="sessoes" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="sessoes">Sessões</TabsTrigger>
            <TabsTrigger value="creditos">Créditos</TabsTrigger>
            <TabsTrigger value="configuracao">Calibração Pedagógica</TabsTrigger>
            <TabsTrigger value="parametros">Parâmetros IA</TabsTrigger>
            <TabsTrigger value="modos">Modos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Sessões — visão principal de acompanhamento */}
          <TabsContent value="sessoes" className="space-y-6">
            <JarvisSessoesAdmin />
          </TabsContent>

          {/* Créditos */}
          <TabsContent value="creditos" className="space-y-6">
            <JarvisCreditManagementBulk />
          </TabsContent>

          {/* Calibração Pedagógica — configuração do comportamento do Tutor */}
          <TabsContent value="configuracao" className="space-y-6">
            <JarvisTutoriaConfiguracao />
          </TabsContent>

          {/* Parâmetros de IA */}
          <TabsContent value="parametros" className="space-y-6">
            <JarvisConfigManagement />
          </TabsContent>

          {/* Modos simples (lapidação, análise) */}
          <TabsContent value="modos" className="space-y-6">
            <JarvisModosManagement />
          </TabsContent>

          {/* Histórico de interações (modos simples — legado) */}
          <TabsContent value="historico" className="space-y-6">
            <JarvisHistoricoAdmin />
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* ── Correção IA ─────────────────────────────────────────────────────── */}
      <TabsContent value="correcao">
        <Tabs defaultValue="correcoes" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="correcoes">Correções</TabsTrigger>
            <TabsTrigger value="creditos">Créditos</TabsTrigger>
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
            <TabsTrigger value="video">Vídeo de Instrução</TabsTrigger>
          </TabsList>

          {/* Histórico de correções */}
          <TabsContent value="correcoes" className="space-y-6">
            <JarvisCorrecaoHistoricoGeral />
          </TabsContent>

          {/* Créditos dos professores */}
          <TabsContent value="creditos" className="space-y-6">
            <JarvisCorrecaoCreditosProfessores />
          </TabsContent>

          {/* Configuração da correção IA */}
          <TabsContent value="configuracao" className="space-y-6">
            <JarvisCorrecaoConfigManager />
          </TabsContent>

          {/* Vídeo de instrução */}
          <TabsContent value="video" className="space-y-6">
            <JarvisVideoInstrucao />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
