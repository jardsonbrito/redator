
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, FileText, BookOpen, Calendar, MessageSquare, Video, Library, Radar, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  const adminSections = [
    {
      title: "Alunos",
      description: "Gerenciar alunos por turma",
      icon: Users,
      path: "/admin/alunos",
      color: "bg-blue-50 hover:bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Créditos",
      description: "Gerenciar créditos dos alunos",
      icon: Target,
      path: "/admin/creditos",
      color: "bg-green-50 hover:bg-green-100",
      iconColor: "text-green-600"
    },
    {
      title: "Redações",
      description: "Visualizar redações enviadas",
      icon: FileText,
      path: "/admin/redacoes",
      color: "bg-purple-50 hover:bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      title: "Temas",
      description: "Gerenciar temas de redação",
      icon: BookOpen,
      path: "/admin/temas",
      color: "bg-orange-50 hover:bg-orange-100",
      iconColor: "text-orange-600"
    },
    {
      title: "Aulas",
      description: "Gerenciar aulas e conteúdos",
      icon: Calendar,
      path: "/admin/aulas",
      color: "bg-pink-50 hover:bg-pink-100",
      iconColor: "text-pink-600"
    },
    {
      title: "Avisos",
      description: "Criar e gerenciar avisos",
      icon: MessageSquare,
      path: "/admin/avisos",
      color: "bg-indigo-50 hover:bg-indigo-100",
      iconColor: "text-indigo-600"
    },
    {
      title: "Vídeos",
      description: "Gerenciar biblioteca de vídeos",
      icon: Video,
      path: "/admin/videos",
      color: "bg-red-50 hover:bg-red-100",
      iconColor: "text-red-600"
    },
    {
      title: "Biblioteca",
      description: "Gerenciar materiais de estudo",
      icon: Library,
      path: "/admin/biblioteca",
      color: "bg-yellow-50 hover:bg-yellow-100",
      iconColor: "text-yellow-600"
    },
    {
      title: "Radar",
      description: "Relatórios e análises",
      icon: Radar,
      path: "/admin/radar",
      color: "bg-teal-50 hover:bg-teal-100",
      iconColor: "text-teal-600"
    },
    {
      title: "Corretores",
      description: "Gerenciar corretores",
      icon: UserCheck,
      path: "/admin/corretores",
      color: "bg-gray-50 hover:bg-gray-100",
      iconColor: "text-gray-600"
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Administrativo</h2>
          <p className="text-gray-600">Selecione uma seção para gerenciar o sistema.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.title} to={section.path}>
                <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/20 ${section.color}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${section.iconColor}`} />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      {section.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Admin;
