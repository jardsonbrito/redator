
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from "lucide-react";

const AdminCorretores = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Corretores</h2>
          <p className="text-gray-600">Cadastro e gerenciamento de corretores</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Corretores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Sistema de gerenciamento de corretores em desenvolvimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCorretores;
