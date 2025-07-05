
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Calendar, Clock, Users, Plus, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const GerenciarAulas = () => {
  const { toast } = useToast();

  const { data: aulas, isLoading } = useQuery({
    queryKey: ['admin-aulas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select('*')
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: aulasVirtuais } = useQuery({
    queryKey: ['admin-aulas-virtuais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas_virtuais')
        .select('*')
        .order('data_aula', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Remove seconds
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Aulas</h1>
            <p className="text-gray-600">Gerencie aulas presenciais e virtuais</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Aula
          </Button>
        </div>

        {/* Aulas Presenciais */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Aulas Presenciais</h2>
            <Badge variant="outline">{aulas?.length || 0}</Badge>
          </div>

          {aulas && aulas.length > 0 ? (
            <div className="grid gap-4">
              {aulas.map((aula) => (
                <Card key={aula.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{aula.titulo}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{aula.descricao}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{aula.modulo}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span>{aula.turmas_autorizadas?.length || 0} turmas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${aula.ativo ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span>{aula.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma aula presencial cadastrada</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Aulas Virtuais */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">Aulas Virtuais</h2>
            <Badge variant="outline">{aulasVirtuais?.length || 0}</Badge>
          </div>

          {aulasVirtuais && aulasVirtuais.length > 0 ? (
            <div className="grid gap-4">
              {aulasVirtuais.map((aula) => (
                <Card key={aula.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{aula.titulo}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{aula.descricao}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{formatDate(aula.data_aula)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{formatTime(aula.horario_inicio)} - {formatTime(aula.horario_fim)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span>{aula.turmas_autorizadas?.length || 0} turmas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={aula.status_transmissao === 'ao_vivo' ? 'default' : 'secondary'}>
                          {aula.status_transmissao === 'ao_vivo' ? '🔴 Ao Vivo' : '📅 Agendada'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma aula virtual cadastrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
