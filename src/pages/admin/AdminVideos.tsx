
import { AdminLayout } from "@/components/admin/AdminLayout";
import { VideoList } from "@/components/admin/VideoList";
import { VideoForm } from "@/components/admin/VideoForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

const AdminVideos = () => {
  const [showForm, setShowForm] = useState(false);
  const [refreshVideos, setRefreshVideos] = useState(false);

  const handleCreate = () => {
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setRefreshVideos(!refreshVideos);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Vídeos</h2>
            <p className="text-gray-600">Crie e gerencie biblioteca de vídeos</p>
          </div>
          
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Vídeo
          </Button>
        </div>

        {showForm ? (
          <VideoForm onClose={handleClose} />
        ) : (
          <VideoList refresh={refreshVideos} onEdit={() => {}} />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVideos;
