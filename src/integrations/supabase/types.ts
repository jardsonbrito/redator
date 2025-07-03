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
      access_logs: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          record_id: string
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          record_id: string
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      aulas: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          descricao: string | null
          id: string
          link_conteudo: string
          modulo: string
          pdf_nome: string | null
          pdf_url: string | null
          permite_visitante: boolean | null
          titulo: string
          turmas_autorizadas: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          link_conteudo: string
          modulo: string
          pdf_nome?: string | null
          pdf_url?: string | null
          permite_visitante?: boolean | null
          titulo: string
          turmas_autorizadas?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          link_conteudo?: string
          modulo?: string
          pdf_nome?: string | null
          pdf_url?: string | null
          permite_visitante?: boolean | null
          titulo?: string
          turmas_autorizadas?: string[] | null
        }
        Relationships: []
      }
      avisos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          data_agendamento: string | null
          descricao: string
          id: string
          imagem_url: string | null
          link_externo: string | null
          prioridade: string
          status: string
          titulo: string
          turmas_autorizadas: string[] | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data_agendamento?: string | null
          descricao: string
          id?: string
          imagem_url?: string | null
          link_externo?: string | null
          prioridade?: string
          status?: string
          titulo: string
          turmas_autorizadas?: string[] | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data_agendamento?: string | null
          descricao?: string
          id?: string
          imagem_url?: string | null
          link_externo?: string | null
          prioridade?: string
          status?: string
          titulo?: string
          turmas_autorizadas?: string[] | null
        }
        Relationships: []
      }
      avisos_leitura: {
        Row: {
          aviso_id: string
          data_leitura: string
          email_aluno: string | null
          id: string
          nome_aluno: string
          sobrenome_aluno: string
          turma: string
        }
        Insert: {
          aviso_id: string
          data_leitura?: string
          email_aluno?: string | null
          id?: string
          nome_aluno: string
          sobrenome_aluno: string
          turma: string
        }
        Update: {
          aviso_id?: string
          data_leitura?: string
          email_aluno?: string | null
          id?: string
          nome_aluno?: string
          sobrenome_aluno?: string
          turma?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_leitura_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_materiais: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          atualizado_em: string | null
          competencia: string
          criado_em: string | null
          data_publicacao: string | null
          descricao: string | null
          id: string
          permite_visitante: boolean | null
          status: string | null
          titulo: string
          turmas_autorizadas: string[] | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          atualizado_em?: string | null
          competencia: string
          criado_em?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          id?: string
          permite_visitante?: boolean | null
          status?: string | null
          titulo: string
          turmas_autorizadas?: string[] | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          atualizado_em?: string | null
          competencia?: string
          criado_em?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          id?: string
          permite_visitante?: boolean | null
          status?: string | null
          titulo?: string
          turmas_autorizadas?: string[] | null
        }
        Relationships: []
      }
      exercicios: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          id: string
          imagem_capa_url: string | null
          link_forms: string | null
          permite_visitante: boolean | null
          tema_id: string | null
          tipo: string
          titulo: string
          turmas_autorizadas: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          id?: string
          imagem_capa_url?: string | null
          link_forms?: string | null
          permite_visitante?: boolean | null
          tema_id?: string | null
          tipo: string
          titulo: string
          turmas_autorizadas?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          id?: string
          imagem_capa_url?: string | null
          link_forms?: string | null
          permite_visitante?: boolean | null
          tema_id?: string | null
          tipo?: string
          titulo?: string
          turmas_autorizadas?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_authenticated_student: boolean | null
          nome: string
          sobrenome: string
          turma: string | null
          turma_codigo: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_authenticated_student?: boolean | null
          nome: string
          sobrenome: string
          turma?: string | null
          turma_codigo?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_authenticated_student?: boolean | null
          nome?: string
          sobrenome?: string
          turma?: string | null
          turma_codigo?: string | null
          updated_at?: string | null
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
          created_by_ip: unknown | null
          data_correcao: string | null
          data_envio: string
          email_aluno: string | null
          frase_tematica: string
          id: string
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
          user_id: string | null
        }
        Insert: {
          comentario_admin?: string | null
          corrigida?: boolean | null
          created_by_ip?: unknown | null
          data_correcao?: string | null
          data_envio?: string
          email_aluno?: string | null
          frase_tematica: string
          id?: string
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
          user_id?: string | null
        }
        Update: {
          comentario_admin?: string | null
          corrigida?: boolean | null
          created_by_ip?: unknown | null
          data_correcao?: string | null
          data_envio?: string
          email_aluno?: string | null
          frase_tematica?: string
          id?: string
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
          user_id?: string | null
        }
        Relationships: []
      }
      redacoes_exercicio: {
        Row: {
          comentario_admin: string | null
          corrigida: boolean | null
          data_correcao: string | null
          data_envio: string | null
          email_aluno: string
          exercicio_id: string
          id: string
          nome_aluno: string
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_total: number | null
          redacao_texto: string
          turma: string | null
          user_id: string | null
        }
        Insert: {
          comentario_admin?: string | null
          corrigida?: boolean | null
          data_correcao?: string | null
          data_envio?: string | null
          email_aluno: string
          exercicio_id: string
          id?: string
          nome_aluno: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          redacao_texto: string
          turma?: string | null
          user_id?: string | null
        }
        Update: {
          comentario_admin?: string | null
          corrigida?: boolean | null
          data_correcao?: string | null
          data_envio?: string | null
          email_aluno?: string
          exercicio_id?: string
          id?: string
          nome_aluno?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          redacao_texto?: string
          turma?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      can_access_redacao: {
        Args: { redacao_email: string; user_email: string }
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
      create_simple_profile: {
        Args: { p_nome: string; p_email: string; p_turma: string }
        Returns: {
          id: string
          nome: string
          sobrenome: string
          email: string
          turma: string
          user_type: string
          created_at: string
          updated_at: string
        }[]
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
      get_student_redacoes: {
        Args: { student_email: string }
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
      get_turma_codigo: {
        Args: { turma_nome: string }
        Returns: string
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_student: {
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
