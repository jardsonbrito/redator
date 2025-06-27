export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      atividades: {
        Row: {
          created_at: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          status: Database["public"]["Enums"]["atividade_status"] | null
          tema_id: string | null
          titulo: string
        }
        Insert: {
          created_at?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          status?: Database["public"]["Enums"]["atividade_status"] | null
          tema_id?: string | null
          titulo: string
        }
        Update: {
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          status?: Database["public"]["Enums"]["atividade_status"] | null
          tema_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_corretores: {
        Row: {
          atividade_id: string | null
          corretor_id: string | null
          id: string
        }
        Insert: {
          atividade_id?: string | null
          corretor_id?: string | null
          id?: string
        }
        Update: {
          atividade_id?: string | null
          corretor_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_corretores_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_corretores_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_turmas: {
        Row: {
          atividade_id: string | null
          id: string
          turma_id: string | null
        }
        Insert: {
          atividade_id?: string | null
          id?: string
          turma_id?: string | null
        }
        Update: {
          atividade_id?: string | null
          id?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_turmas_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_turmas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string | null
          id: string
          titulo: string
          turma_id: string | null
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          created_at?: string | null
          id?: string
          titulo: string
          turma_id?: string | null
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string | null
          id?: string
          titulo?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avisos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          id: string
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      corretores_turmas: {
        Row: {
          corretor_id: string | null
          id: string
          turma_id: string | null
        }
        Insert: {
          corretor_id?: string | null
          id?: string
          turma_id?: string | null
        }
        Update: {
          corretor_id?: string | null
          id?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corretores_turmas_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretores_turmas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_audit: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          new_credits: number | null
          old_credits: number | null
          user_id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_credits?: number | null
          old_credits?: number | null
          user_id: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_credits?: number | null
          old_credits?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_audit_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comentarios: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string | null
          id: string
          post_id: string | null
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          created_at?: string | null
          id?: string
          post_id?: string | null
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string | null
          id: string
          titulo: string
          turma_id: string | null
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          created_at?: string | null
          id?: string
          titulo: string
          turma_id?: string | null
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string | null
          id?: string
          titulo?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      marcacoes: {
        Row: {
          comentario: string | null
          competencia: Database["public"]["Enums"]["competencia_type"]
          created_at: string | null
          height: number
          id: string
          pagina: number
          redacao_id: string | null
          tipo_erro: string
          width: number
          x: number
          y: number
        }
        Insert: {
          comentario?: string | null
          competencia: Database["public"]["Enums"]["competencia_type"]
          created_at?: string | null
          height: number
          id?: string
          pagina: number
          redacao_id?: string | null
          tipo_erro: string
          width: number
          x: number
          y: number
        }
        Update: {
          comentario?: string | null
          competencia?: Database["public"]["Enums"]["competencia_type"]
          created_at?: string | null
          height?: number
          id?: string
          pagina?: number
          redacao_id?: string | null
          tipo_erro?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "marcacoes_redacao_id_fkey"
            columns: ["redacao_id"]
            isOneToOne: false
            referencedRelation: "redacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acesso_liberado: boolean | null
          created_at: string | null
          creditos: number | null
          email: string
          id: string
          nome: string
          sobrenome: string
          turma_id: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          acesso_liberado?: boolean | null
          created_at?: string | null
          creditos?: number | null
          email: string
          id: string
          nome: string
          sobrenome: string
          turma_id?: string | null
          updated_at?: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          acesso_liberado?: boolean | null
          created_at?: string | null
          creditos?: number | null
          email?: string
          id?: string
          nome?: string
          sobrenome?: string
          turma_id?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
        }
        Relationships: []
      }
      redacoes: {
        Row: {
          aluno_id: string | null
          audio_url: string | null
          comentario_c1: string | null
          comentario_c2: string | null
          comentario_c3: string | null
          comentario_c4: string | null
          comentario_c5: string | null
          comentario_geral: string | null
          conteudo: string
          data_correcao: string | null
          data_envio: string | null
          id: string
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_total: number | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["redacao_status"] | null
          tema_id: string | null
          usuario_simples_id: string | null
        }
        Insert: {
          aluno_id?: string | null
          audio_url?: string | null
          comentario_c1?: string | null
          comentario_c2?: string | null
          comentario_c3?: string | null
          comentario_c4?: string | null
          comentario_c5?: string | null
          comentario_geral?: string | null
          conteudo: string
          data_correcao?: string | null
          data_envio?: string | null
          id?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["redacao_status"] | null
          tema_id?: string | null
          usuario_simples_id?: string | null
        }
        Update: {
          aluno_id?: string | null
          audio_url?: string | null
          comentario_c1?: string | null
          comentario_c2?: string | null
          comentario_c3?: string | null
          comentario_c4?: string | null
          comentario_c5?: string | null
          comentario_geral?: string | null
          conteudo?: string
          data_correcao?: string | null
          data_envio?: string | null
          id?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["redacao_status"] | null
          tema_id?: string | null
          usuario_simples_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_usuario_simples_id_fkey"
            columns: ["usuario_simples_id"]
            isOneToOne: false
            referencedRelation: "usuarios_simples"
            referencedColumns: ["id"]
          },
        ]
      }
      temas: {
        Row: {
          eixo_tematico: string
          frase_tematica: string
          id: string
          imagem_texto_4_url: string | null
          publicado_em: string | null
          texto_1: string | null
          texto_2: string | null
          texto_3: string | null
          video_url: string | null
        }
        Insert: {
          eixo_tematico: string
          frase_tematica: string
          id?: string
          imagem_texto_4_url?: string | null
          publicado_em?: string | null
          texto_1?: string | null
          texto_2?: string | null
          texto_3?: string | null
          video_url?: string | null
        }
        Update: {
          eixo_tematico?: string
          frase_tematica?: string
          id?: string
          imagem_texto_4_url?: string | null
          publicado_em?: string | null
          texto_1?: string | null
          texto_2?: string | null
          texto_3?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      turmas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      usuarios_simples: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          categoria: string | null
          created_at: string | null
          id: string
          thumbnail_url: string | null
          titulo: string
          youtube_url: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          id?: string
          thumbnail_url?: string | null
          titulo: string
          youtube_url: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          id?: string
          thumbnail_url?: string | null
          titulo?: string
          youtube_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits_safe: {
        Args: {
          target_user_id: string
          credit_amount: number
          admin_user_id?: string
        }
        Returns: boolean
      }
      consume_credit_safe: {
        Args: { target_user_id: string }
        Returns: number
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      atividade_status: "agendada" | "em_progresso" | "finalizada"
      competencia_type: "C1" | "C2" | "C3" | "C4" | "C5"
      redacao_status: "pendente" | "corrigido"
      user_type: "aluno" | "corretor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      atividade_status: ["agendada", "em_progresso", "finalizada"],
      competencia_type: ["C1", "C2", "C3", "C4", "C5"],
      redacao_status: ["pendente", "corrigido"],
      user_type: ["aluno", "corretor", "admin"],
    },
  },
} as const
