import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const StudentList = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Alunos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Funcionalidade de gerenciamento de alunos será implementada em breve.
        </p>
      </CardContent>
    </Card>
  );
};