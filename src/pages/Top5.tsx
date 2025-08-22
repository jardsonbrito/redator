import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Top5Widget } from "@/components/shared/Top5Widget";

const Top5 = () => {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Top 5" />
          
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Top5Widget variant="student" />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Top5;