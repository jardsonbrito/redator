
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

const AdminCreditos = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Créditos</h2>
          <p className="text-gray-600">Sistema de créditos dos alunos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Créditos do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Funcionalidade de gerenciamento de créditos em desenvolvimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCreditos;
