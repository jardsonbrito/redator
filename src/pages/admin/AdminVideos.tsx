
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video } from "lucide-react";

const AdminVideos = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Videoteca</h2>
          <p className="text-gray-600">Vídeos educacionais e aulas gravadas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Videoteca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Sistema de gerenciamento de vídeos em desenvolvimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminVideos;
