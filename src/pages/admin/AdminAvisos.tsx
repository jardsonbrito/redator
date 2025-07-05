
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

const AdminAvisos = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Avisos</h2>
          <p className="text-gray-600">Mural de avisos e comunicados</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Avisos e Comunicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Sistema de avisos em desenvolvimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAvisos;
