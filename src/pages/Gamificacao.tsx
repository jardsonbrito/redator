import React from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudentHeader } from "@/components/StudentHeader";
import GamificationCard from "@/components/student/GamificationCard";

const Gamificacao = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Gamificação" />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <GamificationCard />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Gamificacao;