import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User2, GraduationCap, Upload, BarChart3, ExternalLink } from "lucide-react";
import { UserList } from "@/components/admin/UserList";
import { StudentList } from "@/components/admin/StudentList";
import { RadarUpload } from "@/components/admin/RadarUpload";
import { AdminCard } from "@/components/admin/AdminCard";
import { RadarList } from "@/components/admin/RadarList";
import { GoogleFormsIntegration } from "@/components/admin/GoogleFormsIntegration";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <AdminCard
            title="Gerenciar Usuários"
            description="Adicionar, editar e remover usuários"
            icon={User2}
          >
            <UserList />
          </AdminCard>
        );
      case 'students':
        return (
          <AdminCard
            title="Gerenciar Alunos"
            description="Adicionar, editar e remover alunos"
            icon={GraduationCap}
          >
            <StudentList />
          </AdminCard>
        );
      case 'radar':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminCard 
                title="Importar CSV" 
                description="Upload manual de dados"
                icon={Upload}
              >
                <RadarUpload />
              </AdminCard>
              
              <AdminCard 
                title="Google Forms" 
                description="Integração automática"
                icon={ExternalLink}
              >
                <GoogleFormsIntegration />
              </AdminCard>
            </div>
            
            <AdminCard 
              title="Dados do Radar" 
              description="Visualizar dados importados"
              icon={BarChart3}
            >
              <RadarList />
            </AdminCard>
          </div>
        );
      default:
        return <div>Selecione uma aba</div>;
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Painel Administrativo</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
          <TabsTrigger value="radar">Radar</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
