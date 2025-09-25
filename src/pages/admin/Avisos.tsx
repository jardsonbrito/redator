
import { useState } from "react";
import { MuralFormModern as AvisoForm } from "@/components/admin/MuralFormModern";
import { AvisoList } from "@/components/admin/AvisoList";

export const Avisos = () => {
  const [refresh, setRefresh] = useState(false);
  const [avisoEditando, setAvisoEditando] = useState(null);
  const [showList, setShowList] = useState(false);

  const handleSuccess = () => {
    setRefresh(prev => !prev);
  };

  const handleEdit = (aviso: any) => {
    setAvisoEditando(aviso);
    setShowList(false);
  };

  const handleCancelEdit = () => {
    setAvisoEditando(null);
    setShowList(false);
  };

  const handleViewList = () => {
    setShowList(true);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gerenciar Avisos</h1>

      {!showList ? (
        <AvisoForm
          mode={avisoEditando ? 'edit' : 'create'}
          initialValues={avisoEditando}
          onSuccess={handleSuccess}
          onCancel={handleCancelEdit}
          onViewList={handleViewList}
          showViewList={true}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowList(false)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors text-white bg-[#662F96] hover:bg-[#3F0077]"
            >
              Novo Aviso
            </button>
            <span className="text-white bg-[#B175FF] px-4 py-2 rounded-full text-sm font-medium">Avisos</span>
          </div>

          <AvisoList
            refresh={refresh}
            onEdit={handleEdit}
          />
        </div>
      )}
    </div>
  );
};
