export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_denied_log: {
        Row: {
          attempted_email: string
          id: string
          ip_address: unknown | null
          redacao_email: string
          redacao_id: string
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_email: string
          id?: string
          ip_address?: unknown | null
          redacao_email: string
          redacao_id: string
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_email?: string
          id?: string
          ip_address?: unknown | null
          redacao_email?: string
          redacao_id?: string
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
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
      admin_config_logs: {
        Row: {
          acao: string
          admin_id: string
          criado_em: string
          detalhes: Json | null
          id: string
          ip_address: unknown | null
        }
        Insert: {
          acao: string
          admin_id: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          ip_address?: unknown | null
        }
        Update: {
          acao?: string
          admin_id?: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          ip_address?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_config_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          email: string
          id: string
          nome_completo: string
          password_hash: string
          ultimo_login: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          email: string
          id?: string
          nome_completo: string
          password_hash: string
          ultimo_login?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          email?: string
          id?: string
          nome_completo?: string
          password_hash?: string
          ultimo_login?: string | null
        }
        Relationships: []
      }
      ajuda_rapida_mensagens: {
        Row: {
          aluno_id: string
          autor: Database["public"]["Enums"]["autor_mensagem"]
          corretor_id: string
          criado_em: string
          editada: boolean | null
          editada_em: string | null
          id: string
          lida: boolean
          mensagem: string
        }
        Insert: {
          aluno_id: string
          autor: Database["public"]["Enums"]["autor_mensagem"]
          corretor_id: string
          criado_em?: string
          editada?: boolean | null
          editada_em?: string | null
          id?: string
          lida?: boolean
          mensagem: string
        }
        Update: {
          aluno_id?: string
          autor?: Database["public"]["Enums"]["autor_mensagem"]
          corretor_id?: string
          criado_em?: string
          editada?: boolean | null
          editada_em?: string | null
          id?: string
          lida?: boolean
          mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ajuda_rapida_aluno"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ajuda_rapida_corretor"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          free_topic_enabled: boolean
          id: string
          submission_allowed_weekdays_for_topics: number[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          free_topic_enabled?: boolean
          id?: string
          submission_allowed_weekdays_for_topics?: number[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          free_topic_enabled?: boolean
          id?: string
          submission_allowed_weekdays_for_topics?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      aulas: {
        Row: {
          ativo: boolean | null
          cover_file_path: string | null
          cover_source: string | null
          cover_url: string | null
          criado_em: string | null
          descricao: string | null
          embed_url: string | null
          id: string
          link_conteudo: string
          modulo_id: string
          pdf_nome: string | null
          pdf_url: string | null
          permite_visitante: boolean | null
          platform: string | null
          titulo: string
          turmas_autorizadas: string[] | null
          video_id: string | null
          video_thumbnail_url: string | null
          video_url_original: string | null
        }
        Insert: {
          ativo?: boolean | null
          cover_file_path?: string | null
          cover_source?: string | null
          cover_url?: string | null
          criado_em?: string | null
          descricao?: string | null
          embed_url?: string | null
          id?: string
          link_conteudo: string
          modulo_id: string
          pdf_nome?: string | null
          pdf_url?: string | null
          permite_visitante?: boolean | null
          platform?: string | null
          titulo: string
          turmas_autorizadas?: string[] | null
          video_id?: string | null
          video_thumbnail_url?: string | null
          video_url_original?: string | null
        }
        Update: {
          ativo?: boolean | null
          cover_file_path?: string | null
          cover_source?: string | null
          cover_url?: string | null
          criado_em?: string | null
          descricao?: string | null
          embed_url?: string | null
          id?: string
          link_conteudo?: string
          modulo_id?: string
          pdf_nome?: string | null
          pdf_url?: string | null
          permite_visitante?: boolean | null
          platform?: string | null
          titulo?: string
          turmas_autorizadas?: string[] | null
          video_id?: string | null
          video_thumbnail_url?: string | null
          video_url_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas_virtuais: {
        Row: {
          abrir_aba_externa: boolean
          ativo: boolean
          atualizado_em: string
          criado_em: string
          data_aula: string
          descricao: string | null
          eh_aula_ao_vivo: boolean | null
          horario_fim: string
          horario_inicio: string
          id: string
          imagem_capa_url: string | null
          link_meet: string
          permite_visitante: boolean
          status_transmissao: string | null
          titulo: string
          turmas_autorizadas: string[]
        }
        Insert: {
          abrir_aba_externa?: boolean
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data_aula: string
          descricao?: string | null
          eh_aula_ao_vivo?: boolean | null
          horario_fim: string
          horario_inicio: string
          id?: string
          imagem_capa_url?: string | null
          link_meet: string
          permite_visitante?: boolean
          status_transmissao?: string | null
          titulo: string
          turmas_autorizadas?: string[]
        }
        Update: {
          abrir_aba_externa?: boolean
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data_aula?: string
          descricao?: string | null
          eh_aula_ao_vivo?: boolean | null
          horario_fim?: string
          horario_inicio?: string
          id?: string
          imagem_capa_url?: string | null
          link_meet?: string
          permite_visitante?: boolean
          status_transmissao?: string | null
          titulo?: string
          turmas_autorizadas?: string[]
        }
        Relationships: []
      }
      avisos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          corretores_destinatarios: string[] | null
          criado_em: string
          data_agendamento: string | null
          descricao: string
          id: string
          imagem_url: string | null
          link_externo: string | null
          permite_visitante: boolean | null
          prioridade: string
          status: string
          titulo: string
          turmas_autorizadas: string[] | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          corretores_destinatarios?: string[] | null
          criado_em?: string
          data_agendamento?: string | null
          descricao: string
          id?: string
          imagem_url?: string | null
          link_externo?: string | null
          permite_visitante?: boolean | null
          prioridade?: string
          status?: string
          titulo: string
          turmas_autorizadas?: string[] | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          corretores_destinatarios?: string[] | null
          criado_em?: string
          data_agendamento?: string | null
          descricao?: string
          id?: string
          imagem_url?: string | null
          link_externo?: string | null
          permite_visitante?: boolean | null
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
          categoria_id: string
          criado_em: string | null
          data_publicacao: string | null
          descricao: string | null
          id: string
          permite_visitante: boolean | null
          published_at: string | null
          status: string | null
          thumbnail_url: string | null
          titulo: string
          turmas_autorizadas: string[] | null
          unpublished_at: string | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          atualizado_em?: string | null
          categoria_id: string
          criado_em?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          id?: string
          permite_visitante?: boolean | null
          published_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          titulo: string
          turmas_autorizadas?: string[] | null
          unpublished_at?: string | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          atualizado_em?: string | null
          categoria_id?: string
          criado_em?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          id?: string
          permite_visitante?: boolean | null
          published_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          titulo?: string
          turmas_autorizadas?: string[] | null
          unpublished_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_materiais_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativa: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          ordem?: number
          slug: string
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      corretores: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          nome_completo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email: string
          id?: string
          nome_completo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          nome_completo?: string
        }
        Relationships: []
      }
      credit_audit: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          new_credits: number
          old_credits: number
          user_id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_credits: number
          old_credits: number
          user_id: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_credits?: number
          old_credits?: number
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
      email_change_audit: {
        Row: {
          affected_tables_count: number
          changed_at: string | null
          id: string
          ip_address: unknown | null
          new_email: string
          old_email: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          affected_tables_count?: number
          changed_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_email: string
          old_email: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          affected_tables_count?: number
          changed_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_email?: string
          old_email?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_change_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          corretor_nome: string | null
          created_at: string | null
          delivery_status: Json | null
          email_id: string | null
          email_type: string
          id: string
          nota: number | null
          recipient_email: string
          redacao_id: string | null
          sent_at: string | null
          status: string
          student_name: string
          tema_titulo: string | null
          tipo_envio: string | null
          updated_at: string | null
        }
        Insert: {
          corretor_nome?: string | null
          created_at?: string | null
          delivery_status?: Json | null
          email_id?: string | null
          email_type: string
          id?: string
          nota?: number | null
          recipient_email: string
          redacao_id?: string | null
          sent_at?: string | null
          status?: string
          student_name: string
          tema_titulo?: string | null
          tipo_envio?: string | null
          updated_at?: string | null
        }
        Update: {
          corretor_nome?: string | null
          created_at?: string | null
          delivery_status?: Json | null
          email_id?: string | null
          email_type?: string
          id?: string
          nota?: number | null
          recipient_email?: string
          redacao_id?: string | null
          sent_at?: string | null
          status?: string
          student_name?: string
          tema_titulo?: string | null
          tipo_envio?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exercicios: {
        Row: {
          abrir_aba_externa: boolean | null
          ativo: boolean | null
          cover_upload_path: string | null
          cover_url: string | null
          criado_em: string | null
          data_fim: string | null
          data_inicio: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          imagem_capa_url: string | null
          link_forms: string | null
          permite_visitante: boolean | null
          tema_id: string | null
          tipo: string
          titulo: string
          turmas_autorizadas: string[] | null
          updated_at: string | null
        }
        Insert: {
          abrir_aba_externa?: boolean | null
          ativo?: boolean | null
          cover_upload_path?: string | null
          cover_url?: string | null
          criado_em?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          imagem_capa_url?: string | null
          link_forms?: string | null
          permite_visitante?: boolean | null
          tema_id?: string | null
          tipo: string
          titulo: string
          turmas_autorizadas?: string[] | null
          updated_at?: string | null
        }
        Update: {
          abrir_aba_externa?: boolean | null
          ativo?: boolean | null
          cover_upload_path?: string | null
          cover_url?: string | null
          criado_em?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          imagem_capa_url?: string | null
          link_forms?: string | null
          permite_visitante?: boolean | null
          tema_id?: string | null
          tipo?: string
          titulo?: string
          turmas_autorizadas?: string[] | null
          updated_at?: string | null
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
      game_levels: {
        Row: {
          created_at: string
          game_id: string
          id: string
          level_index: number
          payload: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          level_index: number
          payload: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          level_index?: number
          payload?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_levels_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_plays: {
        Row: {
          created_at: string
          finished_at: string | null
          game_id: string
          id: string
          level_id: string
          result: Json | null
          score_points: number | null
          started_at: string
          student_class: string | null
          student_email: string
          student_name: string
          time_spent_seconds: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          game_id: string
          id?: string
          level_id: string
          result?: Json | null
          score_points?: number | null
          started_at?: string
          student_class?: string | null
          student_email: string
          student_name: string
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          game_id?: string
          id?: string
          level_id?: string
          result?: Json | null
          score_points?: number | null
          started_at?: string
          student_class?: string | null
          student_email?: string
          student_name?: string
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_plays_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_plays_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "game_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          allow_visitor: boolean
          competencies: number[]
          created_at: string
          created_by: string
          difficulty: number
          end_at: string | null
          id: string
          start_at: string | null
          status: string
          tags: string[]
          template: string
          title: string
          turmas_autorizadas: string[]
          updated_at: string
        }
        Insert: {
          allow_visitor?: boolean
          competencies?: number[]
          created_at?: string
          created_by: string
          difficulty?: number
          end_at?: string | null
          id?: string
          start_at?: string | null
          status?: string
          tags?: string[]
          template: string
          title: string
          turmas_autorizadas?: string[]
          updated_at?: string
        }
        Update: {
          allow_visitor?: boolean
          competencies?: number[]
          created_at?: string
          created_by?: string
          difficulty?: number
          end_at?: string | null
          id?: string
          start_at?: string | null
          status?: string
          tags?: string[]
          template?: string
          title?: string
          turmas_autorizadas?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      importacao_csv: {
        Row: {
          admin_id: string | null
          data_importacao: string
          detalhes_erros: Json | null
          id: string
          nome_arquivo: string
          registros_importados: number
          registros_rejeitados: number
          total_registros: number
        }
        Insert: {
          admin_id?: string | null
          data_importacao?: string
          detalhes_erros?: Json | null
          id?: string
          nome_arquivo: string
          registros_importados: number
          registros_rejeitados: number
          total_registros: number
        }
        Update: {
          admin_id?: string | null
          data_importacao?: string
          detalhes_erros?: Json | null
          id?: string
          nome_arquivo?: string
          registros_importados?: number
          registros_rejeitados?: number
          total_registros?: number
        }
        Relationships: [
          {
            foreignKeyName: "importacao_csv_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_attendance: {
        Row: {
          created_at: string | null
          id: string
          marked_via: string | null
          session_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          marked_via?: string | null
          session_id: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          marked_via?: string | null
          session_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lca_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "aulas_virtuais"
            referencedColumns: ["id"]
          },
        ]
      }
      lousa: {
        Row: {
          ativo: boolean
          capa_url: string | null
          corretor_id: string | null
          created_at: string
          created_by: string
          enunciado: string
          fim_em: string | null
          id: string
          inicio_em: string | null
          permite_visitante: boolean
          status: string
          titulo: string
          turmas: string[]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capa_url?: string | null
          corretor_id?: string | null
          created_at?: string
          created_by: string
          enunciado: string
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          permite_visitante?: boolean
          status?: string
          titulo: string
          turmas?: string[]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capa_url?: string | null
          corretor_id?: string | null
          created_at?: string
          created_by?: string
          enunciado?: string
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          permite_visitante?: boolean
          status?: string
          titulo?: string
          turmas?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lousa_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
        ]
      }
      lousa_resposta: {
        Row: {
          aluno_id: string | null
          comentario_professor: string | null
          conteudo: string
          corrected_at: string | null
          created_at: string
          email_aluno: string
          id: string
          lousa_id: string
          nome_aluno: string
          nota: number | null
          status: string
          submitted_at: string | null
          turma: string | null
          updated_at: string
        }
        Insert: {
          aluno_id?: string | null
          comentario_professor?: string | null
          conteudo?: string
          corrected_at?: string | null
          created_at?: string
          email_aluno: string
          id?: string
          lousa_id: string
          nome_aluno: string
          nota?: number | null
          status?: string
          submitted_at?: string | null
          turma?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string | null
          comentario_professor?: string | null
          conteudo?: string
          corrected_at?: string | null
          created_at?: string
          email_aluno?: string
          id?: string
          lousa_id?: string
          nome_aluno?: string
          nota?: number | null
          status?: string
          submitted_at?: string | null
          turma?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lousa_resposta_lousa_id_fkey"
            columns: ["lousa_id"]
            isOneToOne: false
            referencedRelation: "lousa"
            referencedColumns: ["id"]
          },
        ]
      }
      marcacoes_visuais: {
        Row: {
          atualizado_em: string
          comentario: string
          competencia: number
          cor_marcacao: string
          corretor_id: string
          criado_em: string
          id: string
          imagem_altura: number
          imagem_largura: number
          numero_sequencial: number | null
          ordem_criacao: number | null
          redacao_id: string
          tabela_origem: string
          x_end: number
          x_start: number
          y_end: number
          y_start: number
        }
        Insert: {
          atualizado_em?: string
          comentario: string
          competencia: number
          cor_marcacao: string
          corretor_id: string
          criado_em?: string
          id?: string
          imagem_altura: number
          imagem_largura: number
          numero_sequencial?: number | null
          ordem_criacao?: number | null
          redacao_id: string
          tabela_origem: string
          x_end: number
          x_start: number
          y_end: number
          y_start: number
        }
        Update: {
          atualizado_em?: string
          comentario?: string
          competencia?: number
          cor_marcacao?: string
          corretor_id?: string
          criado_em?: string
          id?: string
          imagem_altura?: number
          imagem_largura?: number
          numero_sequencial?: number | null
          ordem_criacao?: number | null
          redacao_id?: string
          tabela_origem?: string
          x_end?: number
          x_start?: number
          y_end?: number
          y_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_marcacoes_corretor"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean
          id: string
          inserted_at: string
          nome: string
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          id?: string
          inserted_at?: string
          nome: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          id?: string
          inserted_at?: string
          nome?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      presenca_audit_log: {
        Row: {
          action: string
          aula_id: string | null
          id: string
          ip_address: unknown | null
          student_email: string | null
          timestamp: string | null
          user_email: string | null
        }
        Insert: {
          action: string
          aula_id?: string | null
          id?: string
          ip_address?: unknown | null
          student_email?: string | null
          timestamp?: string | null
          user_email?: string | null
        }
        Update: {
          action?: string
          aula_id?: string | null
          id?: string
          ip_address?: unknown | null
          student_email?: string | null
          timestamp?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      presenca_aulas: {
        Row: {
          aluno_id: string | null
          atualizado_em: string | null
          aula_id: string
          criado_em: string
          data_registro: string
          duracao_minutos: number | null
          email_aluno: string
          entrada_at: string | null
          id: string
          nome_aluno: string
          saida_at: string | null
          sobrenome_aluno: string | null
          status: string | null
          tipo_registro: string
          turma: string
        }
        Insert: {
          aluno_id?: string | null
          atualizado_em?: string | null
          aula_id: string
          criado_em?: string
          data_registro?: string
          duracao_minutos?: number | null
          email_aluno: string
          entrada_at?: string | null
          id?: string
          nome_aluno: string
          saida_at?: string | null
          sobrenome_aluno?: string | null
          status?: string | null
          tipo_registro?: string
          turma?: string
        }
        Update: {
          aluno_id?: string | null
          atualizado_em?: string | null
          aula_id?: string
          criado_em?: string
          data_registro?: string
          duracao_minutos?: number | null
          email_aluno?: string
          entrada_at?: string | null
          id?: string
          nome_aluno?: string
          saida_at?: string | null
          sobrenome_aluno?: string | null
          status?: string | null
          tipo_registro?: string
          turma?: string
        }
        Relationships: [
          {
            foreignKeyName: "presenca_aulas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas_virtuais"
            referencedColumns: ["id"]
          },
        ]
      }
      presenca_aulas_backup: {
        Row: {
          aula_id: string | null
          criado_em: string | null
          data_registro: string | null
          email_aluno: string | null
          id: string | null
          nome_aluno: string | null
          saida_at: string | null
          sobrenome_aluno: string | null
          tipo_registro: string | null
          turma: string | null
        }
        Insert: {
          aula_id?: string | null
          criado_em?: string | null
          data_registro?: string | null
          email_aluno?: string | null
          id?: string | null
          nome_aluno?: string | null
          saida_at?: string | null
          sobrenome_aluno?: string | null
          tipo_registro?: string | null
          turma?: string | null
        }
        Update: {
          aula_id?: string | null
          criado_em?: string | null
          data_registro?: string | null
          email_aluno?: string | null
          id?: string | null
          nome_aluno?: string | null
          saida_at?: string | null
          sobrenome_aluno?: string | null
          tipo_registro?: string | null
          turma?: string | null
        }
        Relationships: []
      }
      professor_access_logs: {
        Row: {
          acao: string
          data_acesso: string
          id: string
          ip_address: unknown | null
          professor_id: string
          user_agent: string | null
        }
        Insert: {
          acao?: string
          data_acesso?: string
          id?: string
          ip_address?: unknown | null
          professor_id: string
          user_agent?: string | null
        }
        Update: {
          acao?: string
          data_acesso?: string
          id?: string
          ip_address?: unknown | null
          professor_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professor_access_logs_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      professores: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          nome_completo: string
          primeiro_login: boolean
          role: string
          senha_hash: string
          ultimo_browser: string | null
          ultimo_ip: unknown | null
          ultimo_login: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email: string
          id?: string
          nome_completo: string
          primeiro_login?: boolean
          role?: string
          senha_hash: string
          ultimo_browser?: string | null
          ultimo_ip?: unknown | null
          ultimo_login?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          nome_completo?: string
          primeiro_login?: boolean
          role?: string
          senha_hash?: string
          ultimo_browser?: string | null
          ultimo_ip?: unknown | null
          ultimo_login?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aprovado_por: string | null
          ativo: boolean | null
          avatar_url: string | null
          created_at: string | null
          creditos: number | null
          data_aprovacao: string | null
          data_solicitacao: string | null
          email: string
          gender: string | null
          id: string
          is_authenticated_student: boolean | null
          nome: string
          sobrenome: string
          status_aprovacao: string | null
          theme_preference: string | null
          turma: string | null
          turma_codigo: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          aprovado_por?: string | null
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          creditos?: number | null
          data_aprovacao?: string | null
          data_solicitacao?: string | null
          email: string
          gender?: string | null
          id: string
          is_authenticated_student?: boolean | null
          nome: string
          sobrenome: string
          status_aprovacao?: string | null
          theme_preference?: string | null
          turma?: string | null
          turma_codigo?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          aprovado_por?: string | null
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          creditos?: number | null
          data_aprovacao?: string | null
          data_solicitacao?: string | null
          email?: string
          gender?: string | null
          id?: string
          is_authenticated_student?: boolean | null
          nome?: string
          sobrenome?: string
          status_aprovacao?: string | null
          theme_preference?: string | null
          turma?: string | null
          turma_codigo?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_dados: {
        Row: {
          created_at: string
          data_realizacao: string
          email_aluno: string
          exercicio_id: string | null
          id: string
          importado_em: string
          importado_por: string | null
          nome_aluno: string
          nota: number | null
          titulo_exercicio: string
          turma: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_realizacao: string
          email_aluno: string
          exercicio_id?: string | null
          id?: string
          importado_em?: string
          importado_por?: string | null
          nome_aluno: string
          nota?: number | null
          titulo_exercicio: string
          turma: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_realizacao?: string
          email_aluno?: string
          exercicio_id?: string | null
          id?: string
          importado_em?: string
          importado_por?: string | null
          nome_aluno?: string
          nota?: number | null
          titulo_exercicio?: string
          turma?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radar_dados_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radar_dados_importado_por_fkey"
            columns: ["importado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recorded_lesson_views: {
        Row: {
          created_at: string
          first_watched_at: string
          lesson_id: string
          student_email: string | null
          student_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          first_watched_at?: string
          lesson_id: string
          student_email?: string | null
          student_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          first_watched_at?: string
          lesson_id?: string
          student_email?: string | null
          student_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recorded_lesson_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      redacao_devolucao_visualizacoes: {
        Row: {
          created_at: string | null
          email_aluno: string
          id: string
          redacao_id: string
          tabela_origem: string
          visualizado_em: string | null
        }
        Insert: {
          created_at?: string | null
          email_aluno: string
          id?: string
          redacao_id: string
          tabela_origem: string
          visualizado_em?: string | null
        }
        Update: {
          created_at?: string | null
          email_aluno?: string
          id?: string
          redacao_id?: string
          tabela_origem?: string
          visualizado_em?: string | null
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
          audio_url: string | null
          audio_url_corretor_1: string | null
          audio_url_corretor_2: string | null
          c1_corretor_1: number | null
          c1_corretor_2: number | null
          c2_corretor_1: number | null
          c2_corretor_2: number | null
          c3_corretor_1: number | null
          c3_corretor_2: number | null
          c4_corretor_1: number | null
          c4_corretor_2: number | null
          c5_corretor_1: number | null
          c5_corretor_2: number | null
          comentario_admin: string | null
          comentario_c1_corretor_1: string | null
          comentario_c1_corretor_2: string | null
          comentario_c2_corretor_1: string | null
          comentario_c2_corretor_2: string | null
          comentario_c3_corretor_1: string | null
          comentario_c3_corretor_2: string | null
          comentario_c4_corretor_1: string | null
          comentario_c4_corretor_2: string | null
          comentario_c5_corretor_1: string | null
          comentario_c5_corretor_2: string | null
          correcao_arquivo_url_corretor_1: string | null
          correcao_arquivo_url_corretor_2: string | null
          corretor_id_1: string | null
          corretor_id_2: string | null
          corrigida: boolean | null
          created_by_ip: unknown | null
          data_correcao: string | null
          data_devolucao: string | null
          data_envio: string
          devolvida_por: string | null
          elogios_pontos_atencao_corretor_1: string | null
          elogios_pontos_atencao_corretor_2: string | null
          email_aluno: string | null
          frase_tematica: string
          id: string
          image_path: string | null
          image_url: string | null
          justificativa_devolucao: string | null
          nome_aluno: string | null
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_final_corretor_1: number | null
          nota_final_corretor_2: number | null
          nota_total: number | null
          redacao_manuscrita_url: string | null
          redacao_texto: string
          render_height: number | null
          render_image_url: string | null
          render_status: string | null
          render_width: number | null
          status: string | null
          status_corretor_1: string | null
          status_corretor_2: string | null
          thumb_url: string | null
          tipo_envio: string | null
          turma: string | null
          user_id: string | null
        }
        Insert: {
          audio_url?: string | null
          audio_url_corretor_1?: string | null
          audio_url_corretor_2?: string | null
          c1_corretor_1?: number | null
          c1_corretor_2?: number | null
          c2_corretor_1?: number | null
          c2_corretor_2?: number | null
          c3_corretor_1?: number | null
          c3_corretor_2?: number | null
          c4_corretor_1?: number | null
          c4_corretor_2?: number | null
          c5_corretor_1?: number | null
          c5_corretor_2?: number | null
          comentario_admin?: string | null
          comentario_c1_corretor_1?: string | null
          comentario_c1_corretor_2?: string | null
          comentario_c2_corretor_1?: string | null
          comentario_c2_corretor_2?: string | null
          comentario_c3_corretor_1?: string | null
          comentario_c3_corretor_2?: string | null
          comentario_c4_corretor_1?: string | null
          comentario_c4_corretor_2?: string | null
          comentario_c5_corretor_1?: string | null
          comentario_c5_corretor_2?: string | null
          correcao_arquivo_url_corretor_1?: string | null
          correcao_arquivo_url_corretor_2?: string | null
          corretor_id_1?: string | null
          corretor_id_2?: string | null
          corrigida?: boolean | null
          created_by_ip?: unknown | null
          data_correcao?: string | null
          data_devolucao?: string | null
          data_envio?: string
          devolvida_por?: string | null
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno?: string | null
          frase_tematica: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          justificativa_devolucao?: string | null
          nome_aluno?: string | null
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_final_corretor_1?: number | null
          nota_final_corretor_2?: number | null
          nota_total?: number | null
          redacao_manuscrita_url?: string | null
          redacao_texto: string
          render_height?: number | null
          render_image_url?: string | null
          render_status?: string | null
          render_width?: number | null
          status?: string | null
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          thumb_url?: string | null
          tipo_envio?: string | null
          turma?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string | null
          audio_url_corretor_1?: string | null
          audio_url_corretor_2?: string | null
          c1_corretor_1?: number | null
          c1_corretor_2?: number | null
          c2_corretor_1?: number | null
          c2_corretor_2?: number | null
          c3_corretor_1?: number | null
          c3_corretor_2?: number | null
          c4_corretor_1?: number | null
          c4_corretor_2?: number | null
          c5_corretor_1?: number | null
          c5_corretor_2?: number | null
          comentario_admin?: string | null
          comentario_c1_corretor_1?: string | null
          comentario_c1_corretor_2?: string | null
          comentario_c2_corretor_1?: string | null
          comentario_c2_corretor_2?: string | null
          comentario_c3_corretor_1?: string | null
          comentario_c3_corretor_2?: string | null
          comentario_c4_corretor_1?: string | null
          comentario_c4_corretor_2?: string | null
          comentario_c5_corretor_1?: string | null
          comentario_c5_corretor_2?: string | null
          correcao_arquivo_url_corretor_1?: string | null
          correcao_arquivo_url_corretor_2?: string | null
          corretor_id_1?: string | null
          corretor_id_2?: string | null
          corrigida?: boolean | null
          created_by_ip?: unknown | null
          data_correcao?: string | null
          data_devolucao?: string | null
          data_envio?: string
          devolvida_por?: string | null
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno?: string | null
          frase_tematica?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          justificativa_devolucao?: string | null
          nome_aluno?: string | null
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_final_corretor_1?: number | null
          nota_final_corretor_2?: number | null
          nota_total?: number | null
          redacao_manuscrita_url?: string | null
          redacao_texto?: string
          render_height?: number | null
          render_image_url?: string | null
          render_status?: string | null
          render_width?: number | null
          status?: string | null
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          thumb_url?: string | null
          tipo_envio?: string | null
          turma?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redacoes_enviadas_corretor_id_1_fkey"
            columns: ["corretor_id_1"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_enviadas_corretor_id_2_fkey"
            columns: ["corretor_id_2"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_enviadas_devolvida_por_fkey"
            columns: ["devolvida_por"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
        ]
      }
      redacoes_exercicio: {
        Row: {
          audio_url: string | null
          audio_url_corretor_1: string | null
          audio_url_corretor_2: string | null
          c1_corretor_1: number | null
          c1_corretor_2: number | null
          c2_corretor_1: number | null
          c2_corretor_2: number | null
          c3_corretor_1: number | null
          c3_corretor_2: number | null
          c4_corretor_1: number | null
          c4_corretor_2: number | null
          c5_corretor_1: number | null
          c5_corretor_2: number | null
          comentario_admin: string | null
          comentario_c1_corretor_1: string | null
          comentario_c1_corretor_2: string | null
          comentario_c2_corretor_1: string | null
          comentario_c2_corretor_2: string | null
          comentario_c3_corretor_1: string | null
          comentario_c3_corretor_2: string | null
          comentario_c4_corretor_1: string | null
          comentario_c4_corretor_2: string | null
          comentario_c5_corretor_1: string | null
          comentario_c5_corretor_2: string | null
          correcao_arquivo_url_corretor_1: string | null
          correcao_arquivo_url_corretor_2: string | null
          corretor_id_1: string | null
          corretor_id_2: string | null
          corrigida: boolean | null
          data_correcao: string | null
          data_devolucao: string | null
          data_envio: string | null
          devolvida_por: string | null
          elogios_pontos_atencao_corretor_1: string | null
          elogios_pontos_atencao_corretor_2: string | null
          email_aluno: string
          exercicio_id: string
          id: string
          image_path: string | null
          image_url: string | null
          justificativa_devolucao: string | null
          nome_aluno: string
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_final_corretor_1: number | null
          nota_final_corretor_2: number | null
          nota_total: number | null
          redacao_manuscrita_url: string | null
          redacao_texto: string
          render_height: number | null
          render_image_url: string | null
          render_status: string | null
          render_width: number | null
          status_corretor_1: string | null
          status_corretor_2: string | null
          thumb_url: string | null
          turma: string | null
          user_id: string | null
        }
        Insert: {
          audio_url?: string | null
          audio_url_corretor_1?: string | null
          audio_url_corretor_2?: string | null
          c1_corretor_1?: number | null
          c1_corretor_2?: number | null
          c2_corretor_1?: number | null
          c2_corretor_2?: number | null
          c3_corretor_1?: number | null
          c3_corretor_2?: number | null
          c4_corretor_1?: number | null
          c4_corretor_2?: number | null
          c5_corretor_1?: number | null
          c5_corretor_2?: number | null
          comentario_admin?: string | null
          comentario_c1_corretor_1?: string | null
          comentario_c1_corretor_2?: string | null
          comentario_c2_corretor_1?: string | null
          comentario_c2_corretor_2?: string | null
          comentario_c3_corretor_1?: string | null
          comentario_c3_corretor_2?: string | null
          comentario_c4_corretor_1?: string | null
          comentario_c4_corretor_2?: string | null
          comentario_c5_corretor_1?: string | null
          comentario_c5_corretor_2?: string | null
          correcao_arquivo_url_corretor_1?: string | null
          correcao_arquivo_url_corretor_2?: string | null
          corretor_id_1?: string | null
          corretor_id_2?: string | null
          corrigida?: boolean | null
          data_correcao?: string | null
          data_devolucao?: string | null
          data_envio?: string | null
          devolvida_por?: string | null
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno: string
          exercicio_id: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          justificativa_devolucao?: string | null
          nome_aluno: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_final_corretor_1?: number | null
          nota_final_corretor_2?: number | null
          nota_total?: number | null
          redacao_manuscrita_url?: string | null
          redacao_texto: string
          render_height?: number | null
          render_image_url?: string | null
          render_status?: string | null
          render_width?: number | null
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          thumb_url?: string | null
          turma?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string | null
          audio_url_corretor_1?: string | null
          audio_url_corretor_2?: string | null
          c1_corretor_1?: number | null
          c1_corretor_2?: number | null
          c2_corretor_1?: number | null
          c2_corretor_2?: number | null
          c3_corretor_1?: number | null
          c3_corretor_2?: number | null
          c4_corretor_1?: number | null
          c4_corretor_2?: number | null
          c5_corretor_1?: number | null
          c5_corretor_2?: number | null
          comentario_admin?: string | null
          comentario_c1_corretor_1?: string | null
          comentario_c1_corretor_2?: string | null
          comentario_c2_corretor_1?: string | null
          comentario_c2_corretor_2?: string | null
          comentario_c3_corretor_1?: string | null
          comentario_c3_corretor_2?: string | null
          comentario_c4_corretor_1?: string | null
          comentario_c4_corretor_2?: string | null
          comentario_c5_corretor_1?: string | null
          comentario_c5_corretor_2?: string | null
          correcao_arquivo_url_corretor_1?: string | null
          correcao_arquivo_url_corretor_2?: string | null
          corretor_id_1?: string | null
          corretor_id_2?: string | null
          corrigida?: boolean | null
          data_correcao?: string | null
          data_devolucao?: string | null
          data_envio?: string | null
          devolvida_por?: string | null
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno?: string
          exercicio_id?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          justificativa_devolucao?: string | null
          nome_aluno?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_final_corretor_1?: number | null
          nota_final_corretor_2?: number | null
          nota_total?: number | null
          redacao_manuscrita_url?: string | null
          redacao_texto?: string
          render_height?: number | null
          render_image_url?: string | null
          render_status?: string | null
          render_width?: number | null
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          thumb_url?: string | null
          turma?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redacoes_exercicio_corretor_id_1_fkey"
            columns: ["corretor_id_1"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_exercicio_corretor_id_2_fkey"
            columns: ["corretor_id_2"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_exercicio_devolvida_por_fkey"
            columns: ["devolvida_por"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
        ]
      }
      redacoes_simulado: {
        Row: {
          audio_url: string | null
          audio_url_corretor_1: string | null
          audio_url_corretor_2: string | null
          c1_corretor_1: number | null
          c1_corretor_2: number | null
          c2_corretor_1: number | null
          c2_corretor_2: number | null
          c3_corretor_1: number | null
          c3_corretor_2: number | null
          c4_corretor_1: number | null
          c4_corretor_2: number | null
          c5_corretor_1: number | null
          c5_corretor_2: number | null
          comentario_c1_corretor_1: string | null
          comentario_c1_corretor_2: string | null
          comentario_c2_corretor_1: string | null
          comentario_c2_corretor_2: string | null
          comentario_c3_corretor_1: string | null
          comentario_c3_corretor_2: string | null
          comentario_c4_corretor_1: string | null
          comentario_c4_corretor_2: string | null
          comentario_c5_corretor_1: string | null
          comentario_c5_corretor_2: string | null
          comentario_pedagogico: string | null
          correcao_arquivo_url_corretor_1: string | null
          correcao_arquivo_url_corretor_2: string | null
          corretor_id_1: string | null
          corretor_id_2: string | null
          corrigida: boolean | null
          dados_visitante: Json | null
          data_correcao: string | null
          data_devolucao: string | null
          data_envio: string
          devolvida_por: string | null
          elogios_pontos_atencao_corretor_1: string | null
          elogios_pontos_atencao_corretor_2: string | null
          email_aluno: string
          id: string
          id_simulado: string
          image_path: string | null
          image_url: string | null
          justificativa_devolucao: string | null
          nome_aluno: string
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_final_corretor_1: number | null
          nota_final_corretor_2: number | null
          nota_total: number | null
          redacao_manuscrita_url: string | null
          render_height: number | null
          render_image_url: string | null
          render_status: string | null
          render_width: number | null
          status_corretor_1: string | null
          status_corretor_2: string | null
          texto: string
          thumb_url: string | null
          turma: string
          user_id: string | null
        }
        Insert: {
          audio_url?: string | null
          audio_url_corretor_1?: string | null
          audio_url_corretor_2?: string | null
          c1_corretor_1?: number | null
          c1_corretor_2?: number | null
          c2_corretor_1?: number | null
          c2_corretor_2?: number | null
          c3_corretor_1?: number | null
          c3_corretor_2?: number | null
          c4_corretor_1?: number | null
          c4_corretor_2?: number | null
          c5_corretor_1?: number | null
          c5_corretor_2?: number | null
          comentario_c1_corretor_1?: string | null
          comentario_c1_corretor_2?: string | null
          comentario_c2_corretor_1?: string | null
          comentario_c2_corretor_2?: string | null
          comentario_c3_corretor_1?: string | null
          comentario_c3_corretor_2?: string | null
          comentario_c4_corretor_1?: string | null
          comentario_c4_corretor_2?: string | null
          comentario_c5_corretor_1?: string | null
          comentario_c5_corretor_2?: string | null
          comentario_pedagogico?: string | null
          correcao_arquivo_url_corretor_1?: string | null
          correcao_arquivo_url_corretor_2?: string | null
          corretor_id_1?: string | null
          corretor_id_2?: string | null
          corrigida?: boolean | null
          dados_visitante?: Json | null
          data_correcao?: string | null
          data_devolucao?: string | null
          data_envio?: string
          devolvida_por?: string | null
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno: string
          id?: string
          id_simulado: string
          image_path?: string | null
          image_url?: string | null
          justificativa_devolucao?: string | null
          nome_aluno: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_final_corretor_1?: number | null
          nota_final_corretor_2?: number | null
          nota_total?: number | null
          redacao_manuscrita_url?: string | null
          render_height?: number | null
          render_image_url?: string | null
          render_status?: string | null
          render_width?: number | null
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          texto: string
          thumb_url?: string | null
          turma: string
          user_id?: string | null
        }
        Update: {
          audio_url?: string | null
          audio_url_corretor_1?: string | null
          audio_url_corretor_2?: string | null
          c1_corretor_1?: number | null
          c1_corretor_2?: number | null
          c2_corretor_1?: number | null
          c2_corretor_2?: number | null
          c3_corretor_1?: number | null
          c3_corretor_2?: number | null
          c4_corretor_1?: number | null
          c4_corretor_2?: number | null
          c5_corretor_1?: number | null
          c5_corretor_2?: number | null
          comentario_c1_corretor_1?: string | null
          comentario_c1_corretor_2?: string | null
          comentario_c2_corretor_1?: string | null
          comentario_c2_corretor_2?: string | null
          comentario_c3_corretor_1?: string | null
          comentario_c3_corretor_2?: string | null
          comentario_c4_corretor_1?: string | null
          comentario_c4_corretor_2?: string | null
          comentario_c5_corretor_1?: string | null
          comentario_c5_corretor_2?: string | null
          comentario_pedagogico?: string | null
          correcao_arquivo_url_corretor_1?: string | null
          correcao_arquivo_url_corretor_2?: string | null
          corretor_id_1?: string | null
          corretor_id_2?: string | null
          corrigida?: boolean | null
          dados_visitante?: Json | null
          data_correcao?: string | null
          data_devolucao?: string | null
          data_envio?: string
          devolvida_por?: string | null
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno?: string
          id?: string
          id_simulado?: string
          image_path?: string | null
          image_url?: string | null
          justificativa_devolucao?: string | null
          nome_aluno?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_final_corretor_1?: number | null
          nota_final_corretor_2?: number | null
          nota_total?: number | null
          redacao_manuscrita_url?: string | null
          render_height?: number | null
          render_image_url?: string | null
          render_status?: string | null
          render_width?: number | null
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          texto?: string
          thumb_url?: string | null
          turma?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redacoes_simulado_corretor_id_1_fkey"
            columns: ["corretor_id_1"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_simulado_corretor_id_2_fkey"
            columns: ["corretor_id_2"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_simulado_devolvida_por_fkey"
            columns: ["devolvida_por"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_simulado_id_simulado_fkey"
            columns: ["id_simulado"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      rpc_log: {
        Row: {
          aula_id: string | null
          email: string | null
          event_at: string | null
          func: string
          id: string
        }
        Insert: {
          aula_id?: string | null
          email?: string | null
          event_at?: string | null
          func: string
          id?: string
        }
        Update: {
          aula_id?: string | null
          email?: string | null
          event_at?: string | null
          func?: string
          id?: string
        }
        Relationships: []
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
      student_feature_event: {
        Row: {
          action: string
          class_name: string | null
          entity_id: string | null
          feature: string
          id: string
          metadata: Json
          month: number | null
          occurred_at: string
          student_email: string
          year: number | null
        }
        Insert: {
          action: string
          class_name?: string | null
          entity_id?: string | null
          feature: string
          id?: string
          metadata?: Json
          month?: number | null
          occurred_at?: string
          student_email: string
          year?: number | null
        }
        Update: {
          action?: string
          class_name?: string | null
          entity_id?: string | null
          feature?: string
          id?: string
          metadata?: Json
          month?: number | null
          occurred_at?: string
          student_email?: string
          year?: number | null
        }
        Relationships: []
      }
      student_session_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          student_email: string
          student_name: string
          token: string
          turma: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          student_email: string
          student_name: string
          token?: string
          turma: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          student_email?: string
          student_name?: string
          token?: string
          turma?: string
        }
        Relationships: []
      }
      temas: {
        Row: {
          cabecalho_enem: string | null
          cover_dimensions: Json | null
          cover_file_path: string | null
          cover_file_size: number | null
          cover_source: string
          cover_url: string | null
          eixo_tematico: string
          frase_tematica: string
          id: string
          imagem_texto_4_url: string | null
          motivator4_dimensions: Json | null
          motivator4_file_path: string | null
          motivator4_file_size: number | null
          motivator4_source: string | null
          motivator4_url: string | null
          needs_media_update: boolean | null
          publicado_em: string | null
          published_at: string | null
          scheduled_by: string | null
          scheduled_publish_at: string | null
          status: string | null
          texto_1: string | null
          texto_2: string | null
          texto_3: string | null
        }
        Insert: {
          cabecalho_enem?: string | null
          cover_dimensions?: Json | null
          cover_file_path?: string | null
          cover_file_size?: number | null
          cover_source?: string
          cover_url?: string | null
          eixo_tematico: string
          frase_tematica: string
          id?: string
          imagem_texto_4_url?: string | null
          motivator4_dimensions?: Json | null
          motivator4_file_path?: string | null
          motivator4_file_size?: number | null
          motivator4_source?: string | null
          motivator4_url?: string | null
          needs_media_update?: boolean | null
          publicado_em?: string | null
          published_at?: string | null
          scheduled_by?: string | null
          scheduled_publish_at?: string | null
          status?: string | null
          texto_1?: string | null
          texto_2?: string | null
          texto_3?: string | null
        }
        Update: {
          cabecalho_enem?: string | null
          cover_dimensions?: Json | null
          cover_file_path?: string | null
          cover_file_size?: number | null
          cover_source?: string
          cover_url?: string | null
          eixo_tematico?: string
          frase_tematica?: string
          id?: string
          imagem_texto_4_url?: string | null
          motivator4_dimensions?: Json | null
          motivator4_file_path?: string | null
          motivator4_file_size?: number | null
          motivator4_source?: string | null
          motivator4_url?: string | null
          needs_media_update?: boolean | null
          publicado_em?: string | null
          published_at?: string | null
          scheduled_by?: string | null
          scheduled_publish_at?: string | null
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
          eixo_tematico: string | null
          embed_url: string | null
          id: string
          platform: string | null
          status_publicacao: string | null
          thumbnail_url: string | null
          titulo: string
          video_id: string | null
          video_url_original: string | null
          youtube_url: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          eixo_tematico?: string | null
          embed_url?: string | null
          id?: string
          platform?: string | null
          status_publicacao?: string | null
          thumbnail_url?: string | null
          titulo: string
          video_id?: string | null
          video_url_original?: string | null
          youtube_url: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          eixo_tematico?: string | null
          embed_url?: string | null
          id?: string
          platform?: string | null
          status_publicacao?: string | null
          thumbnail_url?: string | null
          titulo?: string
          video_id?: string | null
          video_url_original?: string | null
          youtube_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      aulas_front: {
        Row: {
          descricao: string | null
          id: string | null
          link_conteudo: string | null
          modulo: string | null
          modulo_ativo: boolean | null
          modulo_id: string | null
          modulo_slug: string | null
          pdf_url: string | null
          sort_order: number | null
          titulo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      public_app_settings: {
        Row: {
          free_topic_enabled: boolean | null
          submission_allowed_weekdays_for_topics: number[] | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_live_status: {
        Row: {
          last_action: string | null
          live_id: string | null
          student_email: string | null
        }
        Relationships: []
      }
      v_student_month_activity: {
        Row: {
          class_name: string | null
          essays_regular: number | null
          essays_simulado: number | null
          gravadas_assistidas: number | null
          lives_nao_participei: number | null
          lives_participei: number | null
          lousas_abertas: number | null
          lousas_concluidas: number | null
          month: number | null
          student_email: string | null
          year: number | null
        }
        Relationships: []
      }
      vw_status_presenca: {
        Row: {
          aluno_id: string | null
          aula_id: string | null
          entrada_at: string | null
          id: string | null
          saida_at: string | null
          status: string | null
          turma: string | null
        }
        Insert: {
          aluno_id?: string | null
          aula_id?: string | null
          entrada_at?: string | null
          id?: string | null
          saida_at?: string | null
          status?: never
          turma?: string | null
        }
        Update: {
          aluno_id?: string | null
          aula_id?: string | null
          entrada_at?: string | null
          id?: string | null
          saida_at?: string | null
          status?: never
          turma?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presenca_aulas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas_virtuais"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_credits_safe: {
        Args: {
          admin_user_id?: string
          credit_amount: number
          target_user_id: string
        }
        Returns: boolean
      }
      aprovar_aluno: {
        Args: { admin_id: string; aluno_id: string }
        Returns: boolean
      }
      atualizar_professor: {
        Args: {
          p_email: string
          p_nome_completo: string
          p_role: string
          professor_id: string
        }
        Returns: Json
      }
      auto_merge_student_accounts: {
        Args: { student_email: string }
        Returns: Json
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      calcular_tempo_presenca: {
        Args: { p_aula_id: string; p_email_aluno: string }
        Returns: number
      }
      can_access_redacao: {
        Args: { redacao_email: string; user_email: string }
        Returns: boolean
      }
      check_and_publish_expired_simulados: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_email_usage_history: {
        Args: { email_to_check: string }
        Returns: {
          current_user_email: string
          current_user_id: string
          current_user_name: string
          previous_users: Json
          was_used_before: boolean
        }[]
      }
      check_student_exists: {
        Args: { p_email: string }
        Returns: boolean
      }
      compute_needs_media_update: {
        Args: {
          p_cover_file_path: string
          p_cover_source: string
          p_cover_url: string
          p_motivator4_file_path: string
          p_motivator4_source: string
          p_motivator4_url: string
        }
        Returns: boolean
      }
      consume_credit_safe: {
        Args: { target_user_id: string }
        Returns: number
      }
      contar_mensagens_nao_lidas_aluno: {
        Args: { aluno_email: string }
        Returns: number
      }
      contar_mensagens_nao_lidas_corretor: {
        Args: { corretor_email: string }
        Returns: number
      }
      corrigir_lousa_resposta: {
        Args: {
          corretor_email: string
          p_comentario_professor: string
          p_nota: number
          resposta_id: string
        }
        Returns: boolean
      }
      count_monthly_recorded_lessons: {
        Args:
          | { p_student_email: string }
          | { p_student_email?: string; p_user_id?: string }
        Returns: number
      }
      count_student_submitted_redacoes: {
        Args: { student_email: string }
        Returns: number
      }
      create_admin_user: {
        Args: { p_email: string; p_nome_completo: string; p_password: string }
        Returns: Json
      }
      create_auth_user_direct: {
        Args: {
          p_email: string
          p_nome_completo: string
          p_password: string
          p_user_id: string
        }
        Returns: boolean
      }
      create_corretor_lousa: {
        Args: {
          corretor_email: string
          lousa_ativo?: boolean
          lousa_capa_url?: string
          lousa_enunciado: string
          lousa_fim_em?: string
          lousa_inicio_em?: string
          lousa_permite_visitante?: boolean
          lousa_status?: string
          lousa_titulo: string
          lousa_turmas: string[]
        }
        Returns: Json
      }
      create_session_token: {
        Args: {
          p_student_email: string
          p_student_name: string
          p_turma: string
        }
        Returns: Json
      }
      create_simple_profile: {
        Args: { p_email: string; p_nome: string; p_turma: string }
        Returns: {
          created_at: string
          email: string
          id: string
          nome: string
          sobrenome: string
          turma: string
          updated_at: string
          user_type: string
        }[]
      }
      criar_professor: {
        Args: { p_email: string; p_nome_completo: string; p_role?: string }
        Returns: Json
      }
      criar_professor_com_auth: {
        Args: { p_email: string; p_nome_completo: string; p_role?: string }
        Returns: Json
      }
      current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      delete_corretor_lousa: {
        Args: { corretor_email: string; lousa_id: string }
        Returns: Json
      }
      detect_duplicate_students: {
        Args: { student_email: string }
        Returns: {
          current_email: string
          current_student_id: string
          duplicate_email: string
          duplicate_student_id: string
          redacoes_count: number
          student_name: string
        }[]
      }
      end_corretor_lousa: {
        Args: { corretor_email: string; lousa_id: string }
        Returns: Json
      }
      gerar_url_download_biblioteca: {
        Args: {
          is_visitante?: boolean
          material_id: string
          user_turma?: string
        }
        Returns: Json
      }
      get_accessible_aulas: {
        Args: { p_user_turma?: string; p_user_type?: string }
        Returns: {
          ativo: boolean
          cover_file_path: string
          cover_source: string
          cover_url: string
          criado_em: string
          descricao: string
          embed_url: string
          id: string
          link_conteudo: string
          modulo_id: string
          modulo_nome: string
          pdf_nome: string
          pdf_url: string
          permite_visitante: boolean
          platform: string
          titulo: string
          turmas_autorizadas: string[]
          video_id: string
          video_thumbnail_url: string
          video_url_original: string
        }[]
      }
      get_alunos_pendentes: {
        Args: Record<PropertyKey, never>
        Returns: {
          data_solicitacao: string
          email: string
          id: string
          nome: string
          turma: string
        }[]
      }
      get_avisos_corretor: {
        Args: { corretor_id_param: string }
        Returns: {
          criado_em: string
          descricao: string
          id: string
          imagem_url: string
          link_externo: string
          prioridade: string
          titulo: string
        }[]
      }
      get_corretor_lousas: {
        Args: { corretor_email: string }
        Returns: {
          ativo: boolean
          capa_url: string
          corretor_id: string
          corretor_nome: string
          created_at: string
          enunciado: string
          fim_em: string
          id: string
          inicio_em: string
          permite_visitante: boolean
          status: string
          titulo: string
          turmas: string[]
          updated_at: string
        }[]
      }
      get_credits_by_email: {
        Args: { user_email: string }
        Returns: number
      }
      get_lousa_respostas_corretor: {
        Args: { corretor_email: string; lousa_id_param: string }
        Returns: Json
      }
      get_recorded_lesson_views_map: {
        Args: Record<PropertyKey, never>
        Returns: {
          first_watched_at: string
          lesson_id: string
        }[]
      }
      get_recorded_lessons_radar: {
        Args: Record<PropertyKey, never>
        Returns: {
          recorded_lessons_count: number
          student_email: string
          student_id: string
          student_name: string
          turma: string
        }[]
      }
      get_redacoes_by_turma: {
        Args: { p_turma: string }
        Returns: {
          corrigida: boolean
          data_envio: string
          frase_tematica: string
          id: string
          nome_aluno: string
          status: string
          tipo_envio: string
        }[]
      }
      get_redacoes_by_turma_and_email: {
        Args: { p_email: string; p_turma: string }
        Returns: {
          comentario_admin: string
          corrigida: boolean
          data_correcao: string
          data_envio: string
          email_aluno: string
          frase_tematica: string
          id: string
          nome_aluno: string
          nota_total: number
          status: string
          tipo_envio: string
        }[]
      }
      get_redacoes_corretor: {
        Args: { corretor_email: string }
        Returns: {
          corrigida: boolean
          data_envio: string
          email_aluno: string
          frase_tematica: string
          id: string
          nome_aluno: string
          texto: string
          tipo_redacao: string
        }[]
      }
      get_redacoes_corretor_detalhadas: {
        Args: { corretor_email: string }
        Returns: {
          data_envio: string
          eh_corretor_1: boolean
          eh_corretor_2: boolean
          email_aluno: string
          frase_tematica: string
          id: string
          nome_aluno: string
          redacao_manuscrita_url: string
          render_image_url: string
          render_status: string
          status_minha_correcao: string
          texto: string
          thumb_url: string
          tipo_redacao: string
          turma: string
        }[]
      }
      get_simulados_por_corretor: {
        Args: { turma_code: string }
        Returns: {
          comentario_pedagogico: string
          corretor_1_nome: string
          corretor_2_nome: string
          corrigida: boolean
          data_correcao: string
          data_envio: string
          email_aluno: string
          id: string
          id_simulado: string
          nome_aluno: string
          nota_c1: number
          nota_c2: number
          nota_c3: number
          nota_c4: number
          nota_c5: number
          nota_total: number
          simulado_frase_tematica: string
          simulado_titulo: string
          status_corretor_1: string
          status_corretor_2: string
          texto: string
          turma: string
        }[]
      }
      get_student_activity_details: {
        Args: {
          p_class_name: string
          p_month: number
          p_student_email: string
          p_year: number
        }
        Returns: {
          acao: string
          data_hora: string
          entity_id: string
          metadata: Json
          tipo: string
        }[]
      }
      get_student_email_history: {
        Args: { student_email_current?: string; student_id_param?: string }
        Returns: {
          affected_tables_count: number
          changed_at: string
          new_email: string
          old_email: string
          student_name: string
          user_id: string
        }[]
      }
      get_student_monthly_summary: {
        Args: { p_month: number; p_student_email: string; p_year: number }
        Returns: {
          essays_regular: number
          essays_simulado: number
          gravadas_assistidas: number
          lives_participei: number
          lousas_concluidas: number
        }[]
      }
      get_student_profile_by_email: {
        Args: { student_email: string }
        Returns: Json
      }
      get_student_redacoes: {
        Args: { student_email: string }
        Returns: {
          comentario_admin: string
          corrigida: boolean
          data_correcao: string
          data_envio: string
          email_aluno: string
          frase_tematica: string
          id: string
          nome_aluno: string
          nota_total: number
          status: string
          tipo_envio: string
        }[]
      }
      get_student_redacoes_com_status_finalizado: {
        Args: { student_email: string }
        Returns: {
          comentario_admin: string
          correcao_finalizada: boolean
          corrigida: boolean
          data_correcao: string
          data_envio: string
          email_aluno: string
          frase_tematica: string
          id: string
          nome_aluno: string
          nota_total: number
          status: string
          tipo_envio: string
        }[]
      }
      get_students_monthly_activity: {
        Args: { p_class_name: string; p_month: number; p_year: number }
        Returns: {
          essays_regular: number
          essays_simulado: number
          gravadas_assistidas: number
          lives_participei: number
          lousas_concluidas: number
          nome: string
          profile_id: string
          student_email: string
        }[]
      }
      get_turma_codigo: {
        Args: { turma_nome: string }
        Returns: string
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      iniciar_correcao_redacao: {
        Args: {
          corretor_email: string
          redacao_id: string
          tabela_nome: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_app_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_student: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_corretor: {
        Args: { user_email: string }
        Returns: boolean
      }
      is_main_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      limpar_mensagens_antigas: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      limpar_tokens_expirados: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      list_admin_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          ativo: boolean
          criado_em: string
          criado_por_nome: string
          email: string
          id: string
          nome_completo: string
          ultimo_login: string
        }[]
      }
      log_denied_access: {
        Args: {
          attempted_email: string
          redacao_email: string
          redacao_id: string
        }
        Returns: undefined
      }
      marcar_conversa_como_lida: {
        Args: { p_aluno_id: string; p_corretor_id: string }
        Returns: undefined
      }
      marcar_redacao_devolvida_como_visualizada: {
        Args: {
          email_aluno_param: string
          redacao_id_param: string
          tabela_origem_param: string
        }
        Returns: boolean
      }
      mark_recorded_lesson_view: {
        Args: {
          p_lesson_id: string
          p_student_email?: string
          p_student_name?: string
        }
        Returns: Json
      }
      merge_student_redacoes: {
        Args: { source_student_id: string; target_student_id: string }
        Returns: Json
      }
      recusar_aluno: {
        Args: { admin_id: string; aluno_id: string }
        Returns: boolean
      }
      registrar_entrada: {
        Args:
          | { p_aluno_id: string; p_aula_id: string }
          | { p_aula_id: string; p_email: string }
        Returns: undefined
      }
      registrar_entrada_com_token: {
        Args:
          | { p_aula_id: string; p_nome: string; p_sobrenome: string }
          | { p_aula_id: string; p_session_token: string }
        Returns: Json
      }
      registrar_entrada_email: {
        Args: { p_aula_id: string }
        Returns: string
      }
      registrar_entrada_email_param: {
        Args: { p_aula_id: string; p_email_aluno: string }
        Returns: string
      }
      registrar_entrada_live_class: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      registrar_entrada_sem_auth: {
        Args: { p_aula_id: string; p_email: string }
        Returns: {
          aluno_id: string
          aula_id: string
          email_aluno: string
          entrada_at: string
          nome_aluno: string
          saida_at: string
        }[]
      }
      registrar_saida: {
        Args:
          | { p_aluno_id: string; p_aula_id: string }
          | { p_aula_id: string; p_email: string }
        Returns: {
          aluno_id: string
          aula_id: string
          entrada_at: string
          saida_at: string
        }[]
      }
      registrar_saida_com_token: {
        Args:
          | { p_aula_id: string; p_nome: string; p_sobrenome: string }
          | { p_aula_id: string; p_session_token: string }
        Returns: Json
      }
      registrar_saida_email: {
        Args: { p_aula_id: string }
        Returns: string
      }
      registrar_saida_email_param: {
        Args: { p_aula_id: string; p_email_aluno: string }
        Returns: string
      }
      registrar_saida_sem_auth: {
        Args: { p_aula_id: string; p_email: string }
        Returns: {
          aluno_id: string
          aula_id: string
          email_aluno: string
          entrada_at: string
          nome_aluno: string
          saida_at: string
        }[]
      }
      reprocessar_ranking_simulados: {
        Args: Record<PropertyKey, never>
        Returns: {
          nome_aluno: string
          nota_media: number
          simulado_titulo: string
          status_correcao: string
        }[]
      }
      salvar_correcao_corretor: {
        Args: {
          c1_nota: number
          c2_nota: number
          c3_nota: number
          c4_nota: number
          c5_nota: number
          comentario_c1?: string
          comentario_c2?: string
          comentario_c3?: string
          comentario_c4?: string
          comentario_c5?: string
          eh_corretor_1: boolean
          elogios_pontos?: string
          nota_final: number
          redacao_id: string
          status_correcao: string
          tabela_nome: string
        }
        Returns: boolean
      }
      send_correction_notification: {
        Args: {
          p_corretor_nome: string
          p_nota?: number
          p_redacao_id: string
          p_student_email: string
          p_student_name: string
          p_tema_titulo: string
          p_tipo_envio: string
        }
        Returns: undefined
      }
      set_app_settings: {
        Args: { p_free_topic_enabled: boolean; p_weekdays_for_topics: number[] }
        Returns: undefined
      }
      set_current_user_email: {
        Args: { user_email: string }
        Returns: undefined
      }
      test_admin_login: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      test_admin_login_simple: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      toggle_admin_status: {
        Args: { p_admin_id: string; p_new_status: boolean }
        Returns: Json
      }
      track_event_by_email: {
        Args: {
          p_action: string
          p_class_name?: string
          p_entity_id?: string
          p_feature: string
          p_metadata?: Json
          p_student_email: string
        }
        Returns: string
      }
      trocar_senha_professor: {
        Args: { nova_senha: string; professor_id: string }
        Returns: Json
      }
      update_admin_email: {
        Args: {
          p_admin_id: string
          p_current_password: string
          p_new_email: string
        }
        Returns: Json
      }
      update_admin_password: {
        Args: {
          p_admin_id: string
          p_current_password: string
          p_new_password: string
        }
        Returns: Json
      }
      update_corretor_lousa: {
        Args: {
          corretor_email: string
          lousa_ativo?: boolean
          lousa_capa_url?: string
          lousa_enunciado: string
          lousa_fim_em?: string
          lousa_id: string
          lousa_inicio_em?: string
          lousa_permite_visitante?: boolean
          lousa_status?: string
          lousa_titulo: string
          lousa_turmas: string[]
        }
        Returns: Json
      }
      update_student_avatar: {
        Args: { new_avatar_path: string; student_email: string }
        Returns: Json
      }
      update_student_email: {
        Args: { current_email: string; new_email: string }
        Returns: Json
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      validar_integridade_simulados: {
        Args: Record<PropertyKey, never>
        Returns: {
          detalhes: string
          nome_aluno: string
          tipo_problema: string
        }[]
      }
      validate_admin_credentials: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      validate_professor_login: {
        Args: { p_email: string; p_senha: string }
        Returns: Json
      }
      validate_student_login: {
        Args: { p_email: string }
        Returns: Json
      }
      verificar_permissao_biblioteca: {
        Args: {
          is_visitante?: boolean
          material_id: string
          user_turma?: string
        }
        Returns: boolean
      }
      verificar_presenca: {
        Args: { p_aula_id: string; p_email: string }
        Returns: {
          aluno_id: string
          aula_id: string
          entrada_at: string
          saida_at: string
        }[]
      }
      verificar_presenca_aluno: {
        Args: { p_aula_id: string; p_email: string }
        Returns: {
          entrada_at: string
          saida_at: string
          tem_entrada: boolean
          tem_saida: boolean
        }[]
      }
      verificar_redacao_devolvida_visualizada: {
        Args: { redacao_id_param: string; tabela_origem_param: string }
        Returns: boolean
      }
      whoami_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      autor_mensagem: "aluno" | "corretor"
      competencia_type: "C1" | "C2" | "C3" | "C4" | "C5"
      tipo_envio_enum: "regular" | "exercicio" | "simulado" | "visitante"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      autor_mensagem: ["aluno", "corretor"],
      competencia_type: ["C1", "C2", "C3", "C4", "C5"],
      tipo_envio_enum: ["regular", "exercicio", "simulado", "visitante"],
    },
  },
} as const
