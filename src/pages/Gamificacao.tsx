import React from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudentHeader } from "@/components/StudentHeader";
import GamificationCard from "@/components/student/GamificationCard";

const Gamificacao = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <StudentHeader />
          
          <div className="mt-8">
            <GamificationCard />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Gamificacao;