import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { Top5Widget } from "@/components/shared/Top5Widget";

const CorretorTop5 = () => {
  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Top 5</h1>
          <p className="text-gray-600">Ranking dos melhores desempenhos</p>
        </div>

        <Top5Widget variant="corretor" />
      </div>
    </CorretorLayout>
  );
};

export default CorretorTop5;