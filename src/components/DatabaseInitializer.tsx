import React from 'react';

interface DatabaseInitializerProps {
  children: React.ReactNode;
}

export const DatabaseInitializer = ({ children }: DatabaseInitializerProps) => {
  // Para produção: simplesmente renderizar o conteúdo sem verificações
  // Isso evita qualquer "piscar" ou problemas de inicialização
  return <>{children}</>;
};