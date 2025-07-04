
import { StudentHeader } from "@/components/StudentHeader";
import { MenuGrid } from "@/components/MenuGrid";

const Student = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader />
      <main className="container mx-auto px-4 py-8">
        <MenuGrid />
      </main>
    </div>
  );
};

export default Student;
