
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const AdminBiblioteca = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Biblioteca</h2>
          <p className="text-gray-600">Materiais PDFs e recursos de estudo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Biblioteca de Materiais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Sistema de gerenciamento de biblioteca em desenvolvimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBiblioteca;
