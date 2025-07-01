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
      aula_modules: {
        Row: {
          ativo: boolean
          competencia_numero: number | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          competencia_numero?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          competencia_numero?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      aulas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          google_meet_url: string | null
          id: string
          module_id: string
          ordem: number
          thumbnail_url: string | null
          titulo: string
          turmas: string[] | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          google_meet_url?: string | null
          id?: string
          module_id: string
          ordem?: number
          thumbnail_url?: string | null
          titulo: string
          turmas?: string[] | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          google_meet_url?: string | null
          id?: string
          module_id?: string
          ordem?: number
          thumbnail_url?: string | null
          titulo?: string
          turmas?: string[] | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aulas_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "aula_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      exercicios: {
        Row: {
          ativo: boolean | null
          atualizado_em: string
          criado_em: string
          embed_formulario: boolean | null
          frase_tematica: string | null
          id: string
          imagem_thumbnail: string | null
          tipo: string
          titulo: string
          turmas: string[] | null
          url_formulario: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          embed_formulario?: boolean | null
          frase_tematica?: string | null
          id?: string
          imagem_thumbnail?: string | null
          tipo: string
          titulo: string
          turmas?: string[] | null
          url_formulario?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          embed_formulario?: boolean | null
          frase_tematica?: string | null
          id?: string
          imagem_thumbnail?: string | null
          tipo?: string
          titulo?: string
          turmas?: string[] | null
          url_formulario?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          email: string
          id: string
          nome: string
          sobrenome: string
          user_type: string | null
        }
        Insert: {
          email: string
          id: string
          nome: string
          sobrenome: string
          user_type?: string | null
        }
        Update: {
          email?: string
          id?: string
          nome?: string
          sobrenome?: string
          user_type?: string | null
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
          dica_de_escrita: string | null
          eixo_tematico: string | null
          frase_tematica: string | null
          id: string
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_total: number | null
          pdf_url: string | null
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
          dica_de_escrita?: string | null
          eixo_tematico?: string | null
          frase_tematica?: string | null
          id?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          pdf_url?: string | null
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
          dica_de_escrita?: string | null
          eixo_tematico?: string | null
          frase_tematica?: string | null
          id?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          pdf_url?: string | null
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
        ]
      }
      redacoes_enviadas: {
        Row: {
          comentario_admin: string | null
          corrigida: boolean | null
          data_correcao: string | null
          data_envio: string
          email_aluno: string | null
          frase_tematica: string
          id: string
          id_exercicio: string | null
          nome_aluno: string | null
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_total: number | null
          redacao_texto: string
          status: string | null
          tipo_envio: string | null
          turma: string | null
        }
        Insert: {
          comentario_admin?: string | null
          corrigida?: boolean | null
          data_correcao?: string | null
          data_envio?: string
          email_aluno?: string | null
          frase_tematica: string
          id?: string
          id_exercicio?: string | null
          nome_aluno?: string | null
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          redacao_texto: string
          status?: string | null
          tipo_envio?: string | null
          turma?: string | null
        }
        Update: {
          comentario_admin?: string | null
          corrigida?: boolean | null
          data_correcao?: string | null
          data_envio?: string
          email_aluno?: string | null
          frase_tematica?: string
          id?: string
          id_exercicio?: string | null
          nome_aluno?: string | null
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          redacao_texto?: string
          status?: string | null
          tipo_envio?: string | null
          turma?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_redacoes_enviadas_exercicio"
            columns: ["id_exercicio"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      redacoes_simulado: {
        Row: {
          comentario_pedagogico: string | null
          corrigida: boolean | null
          dados_visitante: Json | null
          data_correcao: string | null
          data_envio: string
          email_aluno: string
          id: string
          id_simulado: string
          nome_aluno: string
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_total: number | null
          texto: string
          turma: string
        }
        Insert: {
          comentario_pedagogico?: string | null
          corrigida?: boolean | null
          dados_visitante?: Json | null
          data_correcao?: string | null
          data_envio?: string
          email_aluno: string
          id?: string
          id_simulado: string
          nome_aluno: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          texto: string
          turma: string
        }
        Update: {
          comentario_pedagogico?: string | null
          corrigida?: boolean | null
          dados_visitante?: Json | null
          data_correcao?: string | null
          data_envio?: string
          email_aluno?: string
          id?: string
          id_simulado?: string
          nome_aluno?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          texto?: string
          turma?: string
        }
        Relationships: [
          {
            foreignKeyName: "redacoes_simulado_id_simulado_fkey"
            columns: ["id_simulado"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          ativo: boolean | null
          atualizado_em: string
          criado_em: string
          data_fim: string
          data_inicio: string
          frase_tematica: string
          hora_fim: string
          hora_inicio: string
          id: string
          permite_visitante: boolean | null
          tema_id: string | null
          titulo: string
          turmas_autorizadas: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          data_fim: string
          data_inicio: string
          frase_tematica: string
          hora_fim: string
          hora_inicio: string
          id?: string
          permite_visitante?: boolean | null
          tema_id?: string | null
          titulo: string
          turmas_autorizadas?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          data_fim?: string
          data_inicio?: string
          frase_tematica?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          permite_visitante?: boolean | null
          tema_id?: string | null
          titulo?: string
          turmas_autorizadas?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "simulados_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      temas: {
        Row: {
          cabecalho_enem: string | null
          eixo_tematico: string
          frase_tematica: string
          id: string
          imagem_texto_4_url: string | null
          publicado_em: string | null
          status: string | null
          texto_1: string | null
          texto_2: string | null
          texto_3: string | null
        }
        Insert: {
          cabecalho_enem?: string | null
          eixo_tematico: string
          frase_tematica: string
          id?: string
          imagem_texto_4_url?: string | null
          publicado_em?: string | null
          status?: string | null
          texto_1?: string | null
          texto_2?: string | null
          texto_3?: string | null
        }
        Update: {
          cabecalho_enem?: string | null
          eixo_tematico?: string
          frase_tematica?: string
          id?: string
          imagem_texto_4_url?: string | null
          publicado_em?: string | null
          status?: string | null
          texto_1?: string | null
          texto_2?: string | null
          texto_3?: string | null
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
      check_and_publish_expired_simulados: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      consume_credit_safe: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_redacoes_by_turma: {
        Args: { p_turma: string }
        Returns: {
          id: string
          frase_tematica: string
          nome_aluno: string
          tipo_envio: string
          data_envio: string
          status: string
          corrigida: boolean
        }[]
      }
      get_redacoes_by_turma_and_email: {
        Args: { p_turma: string; p_email: string }
        Returns: {
          id: string
          frase_tematica: string
          nome_aluno: string
          email_aluno: string
          tipo_envio: string
          data_envio: string
          status: string
          corrigida: boolean
          nota_total: number
          comentario_admin: string
          data_correcao: string
        }[]
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_main_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      competencia_type: "C1" | "C2" | "C3" | "C4" | "C5"
      tipo_envio_enum: "regular" | "exercicio" | "simulado" | "visitante"
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
      competencia_type: ["C1", "C2", "C3", "C4", "C5"],
      tipo_envio_enum: ["regular", "exercicio", "simulado", "visitante"],
    },
  },
} as const
