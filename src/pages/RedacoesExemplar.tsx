
import { StudentHeader } from "@/components/StudentHeader";

const RedacoesExemplar = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-redator-primary">Redações Exemplar</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-muted-foreground">Seção de redações exemplar em desenvolvimento.</p>
        </div>
      </main>
    </div>
  );
};

export default RedacoesExemplar;
