import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JarvisCreditManagementBulk } from '@/components/admin/JarvisCreditManagementBulk';
import { JarvisUsoAdmin } from '@/components/admin/JarvisUsoAdmin';
import { JarvisCorrecaoCreditosProfessores } from '@/components/admin/JarvisCorrecaoCreditosProfessores';
import { JarvisCorrecaoHistoricoGeral } from '@/components/admin/JarvisCorrecaoHistoricoGeral';
import { JarvisModosManagement } from '@/components/admin/JarvisModosManagement';
import { JarvisConfigManagement } from '@/components/admin/JarvisConfigManagement';
import { JarvisTutoriaConfiguracao } from '@/components/admin/JarvisTutoriaConfiguracao';
import { JarvisCorrecaoConfigManager } from '@/components/admin/JarvisCorrecaoConfigManager';
import { JarvisVideoInstrucao } from '@/components/admin/JarvisVideoInstrucao';
import { JarvisBugReportsAdmin } from '@/components/admin/JarvisBugReportsAdmin';

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
        <Tabs defaultValue="uso" className="w-full">
          <TabsList className="mb-4">
            {/* Monitoramento */}
            <TabsTrigger value="uso">Uso do Jarvis</TabsTrigger>
            <TabsTrigger value="bugs">Problemas</TabsTrigger>
            <TabsTrigger value="creditos">Créditos</TabsTrigger>
            {/* Configuração */}
            <TabsTrigger value="configuracao-pedagogica">Configuração Pedagógica</TabsTrigger>
            <TabsTrigger value="modos">Modos do Jarvis</TabsTrigger>
            <TabsTrigger value="parametros">Parâmetros IA</TabsTrigger>
          </TabsList>

          {/* Uso do Jarvis — sessões Tutor + interações legadas unificadas */}
          <TabsContent value="uso" className="space-y-6">
            <JarvisUsoAdmin />
          </TabsContent>

          {/* Problemas reportados pelos alunos */}
          <TabsContent value="bugs" className="space-y-6">
            <JarvisBugReportsAdmin />
          </TabsContent>

          {/* Créditos */}
          <TabsContent value="creditos" className="space-y-6">
            <JarvisCreditManagementBulk />
          </TabsContent>

          {/*
            Configuração Pedagógica
            — Todo o conhecimento e comportamento do Tutor:
              • Modos Especialistas (Introdução, Desenvolvimento, Conclusão + prompt_tutor)
              • Modelos de Referência (few-shot learning)
              • Frase Temática (base de temas ENEM)
              • Ações Rápidas (atalhos para os alunos — operacional, não estrutural)
          */}
          <TabsContent value="configuracao-pedagogica" className="space-y-6">
            <JarvisTutoriaConfiguracao />
          </TabsContent>

          {/*
            Modos do Jarvis
            — Modos operacionais com system prompts próprios
              (lapidação textual, análise, assistente de escrita, etc.)
          */}
          <TabsContent value="modos" className="space-y-6">
            <JarvisModosManagement />
          </TabsContent>

          {/* Parâmetros de IA — modelo, temperatura, tokens */}
          <TabsContent value="parametros" className="space-y-6">
            <JarvisConfigManagement />
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
          <TabsContent value="correcoes" className="space-y-6">
            <JarvisCorrecaoHistoricoGeral />
          </TabsContent>
          <TabsContent value="creditos" className="space-y-6">
            <JarvisCorrecaoCreditosProfessores />
          </TabsContent>
          <TabsContent value="configuracao" className="space-y-6">
            <JarvisCorrecaoConfigManager />
          </TabsContent>
          <TabsContent value="video" className="space-y-6">
            <JarvisVideoInstrucao />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
