
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RadarList } from "@/components/admin/RadarList";
import { RadarUpload } from "@/components/admin/RadarUpload";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useState } from "react";

const AdminRadar = () => {
  const [showUpload, setShowUpload] = useState(false);

  const handleUpload = () => {
    setShowUpload(true);
  };

  const handleClose = () => {
    setShowUpload(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Radar - Relatórios e Análises</h2>
            <p className="text-gray-600">Visualize dados e análises do sistema</p>
          </div>
          
          <Button onClick={handleUpload} className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload de Dados
          </Button>
        </div>

        {showUpload ? (
          <RadarUpload />
        ) : (
          <RadarList />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRadar;
