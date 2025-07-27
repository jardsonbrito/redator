export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
      ajuda_rapida_mensagens: {
        Row: {
          aluno_id: string
          autor: Database["public"]["Enums"]["autor_mensagem"]
          corretor_id: string
          criado_em: string
          id: string
          lida: boolean
          mensagem: string
        }
        Insert: {
          aluno_id: string
          autor: Database["public"]["Enums"]["autor_mensagem"]
          corretor_id: string
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem: string
        }
        Update: {
          aluno_id?: string
          autor?: Database["public"]["Enums"]["autor_mensagem"]
          corretor_id?: string
          criado_em?: string
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
          status: string | null
          titulo: string
          turmas_autorizadas: string[] | null
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
          status?: string | null
          titulo: string
          turmas_autorizadas?: string[] | null
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
          status?: string | null
          titulo?: string
          turmas_autorizadas?: string[] | null
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
      exercicios: {
        Row: {
          abrir_aba_externa: boolean | null
          ativo: boolean | null
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
        }
        Insert: {
          abrir_aba_externa?: boolean | null
          ativo?: boolean | null
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
        }
        Update: {
          abrir_aba_externa?: boolean | null
          ativo?: boolean | null
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
      presenca_aulas: {
        Row: {
          aula_id: string
          criado_em: string
          data_registro: string
          email_aluno: string
          id: string
          nome_aluno: string
          sobrenome_aluno: string
          tipo_registro: string
          turma: string
        }
        Insert: {
          aula_id: string
          criado_em?: string
          data_registro?: string
          email_aluno: string
          id?: string
          nome_aluno: string
          sobrenome_aluno: string
          tipo_registro: string
          turma: string
        }
        Update: {
          aula_id?: string
          criado_em?: string
          data_registro?: string
          email_aluno?: string
          id?: string
          nome_aluno?: string
          sobrenome_aluno?: string
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
          data_envio: string
          elogios_pontos_atencao_corretor_1: string | null
          elogios_pontos_atencao_corretor_2: string | null
          email_aluno: string | null
          frase_tematica: string
          id: string
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
          status: string | null
          status_corretor_1: string | null
          status_corretor_2: string | null
          tipo_envio: string | null
          turma: string | null
          user_id: string | null
        }
        Insert: {
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
          data_envio?: string
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno?: string | null
          frase_tematica: string
          id?: string
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
          status?: string | null
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          tipo_envio?: string | null
          turma?: string | null
          user_id?: string | null
        }
        Update: {
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
          data_envio?: string
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno?: string | null
          frase_tematica?: string
          id?: string
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
          status?: string | null
          status_corretor_1?: string | null
          status_corretor_2?: string | null
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
        ]
      }
      redacoes_exercicio: {
        Row: {
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
          data_envio: string | null
          elogios_pontos_atencao_corretor_1: string | null
          elogios_pontos_atencao_corretor_2: string | null
          email_aluno: string
          exercicio_id: string
          id: string
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
          status_corretor_1: string | null
          status_corretor_2: string | null
          turma: string | null
          user_id: string | null
        }
        Insert: {
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
          data_envio?: string | null
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno: string
          exercicio_id: string
          id?: string
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
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          turma?: string | null
          user_id?: string | null
        }
        Update: {
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
          data_envio?: string | null
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno?: string
          exercicio_id?: string
          id?: string
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
          status_corretor_1?: string | null
          status_corretor_2?: string | null
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
        ]
      }
      redacoes_simulado: {
        Row: {
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
          data_envio: string
          elogios_pontos_atencao_corretor_1: string | null
          elogios_pontos_atencao_corretor_2: string | null
          email_aluno: string
          id: string
          id_simulado: string
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
          status_corretor_1: string | null
          status_corretor_2: string | null
          texto: string
          turma: string
          user_id: string | null
        }
        Insert: {
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
          data_envio?: string
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno: string
          id?: string
          id_simulado: string
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
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          texto: string
          turma: string
          user_id?: string | null
        }
        Update: {
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
          data_envio?: string
          elogios_pontos_atencao_corretor_1?: string | null
          elogios_pontos_atencao_corretor_2?: string | null
          email_aluno?: string
          id?: string
          id_simulado?: string
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
          status_corretor_1?: string | null
          status_corretor_2?: string | null
          texto?: string
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
      aprovar_aluno: {
        Args: { aluno_id: string; admin_id: string }
        Returns: boolean
      }
      auto_merge_student_accounts: {
        Args: { student_email: string }
        Returns: Json
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
      detect_duplicate_students: {
        Args: { student_email: string }
        Returns: {
          current_student_id: string
          duplicate_student_id: string
          current_email: string
          duplicate_email: string
          student_name: string
          redacoes_count: number
        }[]
      }
      get_alunos_pendentes: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          nome: string
          email: string
          turma: string
          data_solicitacao: string
        }[]
      }
      get_avisos_corretor: {
        Args: { corretor_id_param: string }
        Returns: {
          id: string
          titulo: string
          descricao: string
          prioridade: string
          criado_em: string
          imagem_url: string
          link_externo: string
        }[]
      }
      get_credits_by_email: {
        Args: { user_email: string }
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
      get_redacoes_corretor: {
        Args: { corretor_email: string }
        Returns: {
          id: string
          tipo_redacao: string
          nome_aluno: string
          email_aluno: string
          frase_tematica: string
          data_envio: string
          corrigida: boolean
          texto: string
        }[]
      }
      get_redacoes_corretor_detalhadas: {
        Args: { corretor_email: string }
        Returns: {
          id: string
          tipo_redacao: string
          nome_aluno: string
          email_aluno: string
          frase_tematica: string
          data_envio: string
          texto: string
          status_minha_correcao: string
          eh_corretor_1: boolean
          eh_corretor_2: boolean
          redacao_manuscrita_url: string
        }[]
      }
      get_simulados_por_corretor: {
        Args: { turma_code: string }
        Returns: {
          id: string
          id_simulado: string
          nome_aluno: string
          email_aluno: string
          texto: string
          turma: string
          data_envio: string
          corrigida: boolean
          nota_c1: number
          nota_c2: number
          nota_c3: number
          nota_c4: number
          nota_c5: number
          nota_total: number
          comentario_pedagogico: string
          data_correcao: string
          status_corretor_1: string
          status_corretor_2: string
          corretor_1_nome: string
          corretor_2_nome: string
          simulado_titulo: string
          simulado_frase_tematica: string
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
      get_student_redacoes_com_status_finalizado: {
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
          correcao_finalizada: boolean
        }[]
      }
      get_turma_codigo: {
        Args: { turma_nome: string }
        Returns: string
      }
      iniciar_correcao_redacao: {
        Args: {
          redacao_id: string
          tabela_nome: string
          corretor_email: string
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
      merge_student_redacoes: {
        Args: { target_student_id: string; source_student_id: string }
        Returns: Json
      }
      recusar_aluno: {
        Args: { aluno_id: string; admin_id: string }
        Returns: boolean
      }
      salvar_correcao_corretor: {
        Args: {
          redacao_id: string
          tabela_nome: string
          eh_corretor_1: boolean
          c1_nota: number
          c2_nota: number
          c3_nota: number
          c4_nota: number
          c5_nota: number
          nota_final: number
          status_correcao: string
          comentario_c1?: string
          comentario_c2?: string
          comentario_c3?: string
          comentario_c4?: string
          comentario_c5?: string
          elogios_pontos?: string
        }
        Returns: boolean
      }
      set_current_user_email: {
        Args: { user_email: string }
        Returns: undefined
      }
      update_student_email: {
        Args: { current_email: string; new_email: string }
        Returns: Json
      }
    }
    Enums: {
      autor_mensagem: "aluno" | "corretor"
      competencia_type: "C1" | "C2" | "C3" | "C4" | "C5"
      tipo_envio_enum: "regular" | "exercicio" | "simulado" | "visitante"
    }
    CompositeTypes: {
      [_ in never]: never
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
