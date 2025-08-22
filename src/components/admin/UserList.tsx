import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const UserList = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Funcionalidade de gerenciamento de usuários será implementada em breve.
        </p>
      </CardContent>
    </Card>
  );
};