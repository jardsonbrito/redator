import { Top5Widget } from "@/components/shared/Top5Widget";

const Top5Admin = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">TOP 5 - Rankings</h1>
      
      <Top5Widget variant="admin" showHeader={false} />
    </div>
  );
};

export default Top5Admin;