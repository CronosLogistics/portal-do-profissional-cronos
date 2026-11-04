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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      avisos: {
        Row: {
          arquivado_em: string | null
          autor_id: string
          criado_em: string
          editado_em: string | null
          exige_confirmacao: boolean
          expira_em: string | null
          id: string
          mensagem: string
          perfil_id: string
          publicar_em: string
          tipo: string
          titulo: string
        }
        Insert: {
          arquivado_em?: string | null
          autor_id?: string
          criado_em?: string
          editado_em?: string | null
          exige_confirmacao?: boolean
          expira_em?: string | null
          id?: string
          mensagem?: string
          perfil_id: string
          publicar_em?: string
          tipo?: string
          titulo: string
        }
        Update: {
          arquivado_em?: string | null
          autor_id?: string
          criado_em?: string
          editado_em?: string | null
          exige_confirmacao?: boolean
          expira_em?: string | null
          id?: string
          mensagem?: string
          perfil_id?: string
          publicar_em?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_comentarios: {
        Row: {
          aviso_id: string
          criado_em: string
          editado_em: string | null
          id: string
          texto: string
          usuario_id: string
        }
        Insert: {
          aviso_id: string
          criado_em?: string
          editado_em?: string | null
          id?: string
          texto: string
          usuario_id?: string
        }
        Update: {
          aviso_id?: string
          criado_em?: string
          editado_em?: string | null
          id?: string
          texto?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_comentarios_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_confirmacoes: {
        Row: {
          aviso_id: string
          confirmado_em: string
          usuario_id: string
        }
        Insert: {
          aviso_id: string
          confirmado_em?: string
          usuario_id: string
        }
        Update: {
          aviso_id?: string
          confirmado_em?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_confirmacoes_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_leituras: {
        Row: {
          aviso_id: string
          lido_em: string
          usuario_id: string
        }
        Insert: {
          aviso_id: string
          lido_em?: string
          usuario_id?: string
        }
        Update: {
          aviso_id?: string
          lido_em?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_leituras_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_reacoes: {
        Row: {
          aviso_id: string
          criado_em: string
          emoji: string
          id: string
          usuario_id: string
        }
        Insert: {
          aviso_id: string
          criado_em?: string
          emoji: string
          id?: string
          usuario_id?: string
        }
        Update: {
          aviso_id?: string
          criado_em?: string
          emoji?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_reacoes_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      benefit_images: {
        Row: {
          benefit_id: string
          caption: string
          created_at: string
          id: string
          image_url: string | null
          sort_order: number
          updated_at: string
          year: string
        }
        Insert: {
          benefit_id: string
          caption?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          updated_at?: string
          year?: string
        }
        Update: {
          benefit_id?: string
          caption?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          updated_at?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_images_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "benefits"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits: {
        Row: {
          contacts: string
          contacts_title: string
          created_at: string
          how_to_use: string
          how_to_use_title: string
          icon: string
          id: string
          intro: string
          intro_title: string
          is_active: boolean
          materials_url: string | null
          needs_content: boolean
          rules: string
          rules_title: string
          slug: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
          values_info: string
          values_title: string
          website: string | null
        }
        Insert: {
          contacts?: string
          contacts_title?: string
          created_at?: string
          how_to_use?: string
          how_to_use_title?: string
          icon?: string
          id?: string
          intro?: string
          intro_title?: string
          is_active?: boolean
          materials_url?: string | null
          needs_content?: boolean
          rules?: string
          rules_title?: string
          slug: string
          sort_order?: number
          summary?: string
          title: string
          updated_at?: string
          values_info?: string
          values_title?: string
          website?: string | null
        }
        Update: {
          contacts?: string
          contacts_title?: string
          created_at?: string
          how_to_use?: string
          how_to_use_title?: string
          icon?: string
          id?: string
          intro?: string
          intro_title?: string
          is_active?: boolean
          materials_url?: string | null
          needs_content?: boolean
          rules?: string
          rules_title?: string
          slug?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
          values_info?: string
          values_title?: string
          website?: string | null
        }
        Relationships: []
      }
      compilados_elogios: {
        Row: {
          atualizado_em: string
          aviso_id: string | null
          html: string
          id: string
          mes_ano: string
          recebido_em: string
        }
        Insert: {
          atualizado_em?: string
          aviso_id?: string | null
          html: string
          id?: string
          mes_ano: string
          recebido_em?: string
        }
        Update: {
          atualizado_em?: string
          aviso_id?: string | null
          html?: string
          id?: string
          mes_ano?: string
          recebido_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "compilados_elogios_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      departamento_liderados: {
        Row: {
          departamento_id: string
          lider_id: string
          liderado_id: string
        }
        Insert: {
          departamento_id: string
          lider_id: string
          liderado_id: string
        }
        Update: {
          departamento_id?: string
          lider_id?: string
          liderado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamento_liderados_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos_portal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamento_liderados_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamento_liderados_liderado_id_fkey"
            columns: ["liderado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departamento_relacoes: {
        Row: {
          departamento_id: string
          lider_email: string
          liderado_email: string
        }
        Insert: {
          departamento_id: string
          lider_email: string
          liderado_email: string
        }
        Update: {
          departamento_id?: string
          lider_email?: string
          liderado_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamento_relacoes_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos_portal"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos_portal: {
        Row: {
          atualizado_em: string
          id: string
          nome: string
        }
        Insert: {
          atualizado_em?: string
          id: string
          nome: string
        }
        Update: {
          atualizado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      departamentos_sincronizacao: {
        Row: {
          ativada: boolean
          atualizado_em: string | null
          em_execucao_desde: string | null
          erro: string | null
          id: boolean
        }
        Insert: {
          ativada?: boolean
          atualizado_em?: string | null
          em_execucao_desde?: string | null
          erro?: string | null
          id?: boolean
        }
        Update: {
          ativada?: boolean
          atualizado_em?: string | null
          em_execucao_desde?: string | null
          erro?: string | null
          id?: boolean
        }
        Relationships: []
      }
      documentos: {
        Row: {
          atualizado_em: string
          cargo: string | null
          criado_em: string
          criado_por: string | null
          departamento: string | null
          id: string
          titulo: string
          url: string
        }
        Insert: {
          atualizado_em?: string
          cargo?: string | null
          criado_em?: string
          criado_por?: string | null
          departamento?: string | null
          id?: string
          titulo: string
          url: string
        }
        Update: {
          atualizado_em?: string
          cargo?: string | null
          criado_em?: string
          criado_por?: string | null
          departamento?: string | null
          id?: string
          titulo?: string
          url?: string
        }
        Relationships: []
      }
      formularios: {
        Row: {
          acao: string
          atualizado_em: string
          codigo: string
          criado_em: string
          descricao: string
          id: string
          ordem: number
          setor: string
          titulo: string
          url: string
        }
        Insert: {
          acao: string
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          descricao?: string
          id?: string
          ordem?: number
          setor: string
          titulo: string
          url: string
        }
        Update: {
          acao?: string
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          descricao?: string
          id?: string
          ordem?: number
          setor?: string
          titulo?: string
          url?: string
        }
        Relationships: []
      }
      insider_edicoes: {
        Row: {
          atualizado_em: string
          aviso_id: string | null
          conteudo: Json
          criado_em: string
          id: string
          mes_ano: string
          origem: string
          revisao: number
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          aviso_id?: string | null
          conteudo?: Json
          criado_em?: string
          id?: string
          mes_ano: string
          origem?: string
          revisao?: number
          titulo: string
        }
        Update: {
          atualizado_em?: string
          aviso_id?: string | null
          conteudo?: Json
          criado_em?: string
          id?: string
          mes_ano?: string
          origem?: string
          revisao?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "insider_edicoes_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: true
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      insider_preparacoes: {
        Row: {
          concluido_em: string | null
          em_execucao_desde: string | null
          erro: string | null
          mes_ano: string
          token: string | null
        }
        Insert: {
          concluido_em?: string | null
          em_execucao_desde?: string | null
          erro?: string | null
          mes_ano: string
          token?: string | null
        }
        Update: {
          concluido_em?: string | null
          em_execucao_desde?: string | null
          erro?: string | null
          mes_ano?: string
          token?: string | null
        }
        Relationships: []
      }
      mural_comentarios: {
        Row: {
          criado_em: string
          editado_em: string | null
          id: string
          post_id: string
          texto: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          editado_em?: string | null
          id?: string
          post_id: string
          texto: string
          usuario_id?: string
        }
        Update: {
          criado_em?: string
          editado_em?: string | null
          id?: string
          post_id?: string
          texto?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mural_comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_posts: {
        Row: {
          anos_casa: number | null
          autor_id: string
          criado_em: string
          data_post: string
          id: string
          imagem_path: string | null
          texto: string
          tipo: string
          titulo: string
          visivel_ate: string | null
        }
        Insert: {
          anos_casa?: number | null
          autor_id?: string
          criado_em?: string
          data_post?: string
          id?: string
          imagem_path?: string | null
          texto?: string
          tipo?: string
          titulo: string
          visivel_ate?: string | null
        }
        Update: {
          anos_casa?: number | null
          autor_id?: string
          criado_em?: string
          data_post?: string
          id?: string
          imagem_path?: string | null
          texto?: string
          tipo?: string
          titulo?: string
          visivel_ate?: string | null
        }
        Relationships: []
      }
      mural_reacoes: {
        Row: {
          criado_em: string
          emoji: string
          id: string
          post_id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          emoji: string
          id?: string
          post_id: string
          usuario_id?: string
        }
        Update: {
          criado_em?: string
          emoji?: string
          id?: string
          post_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mural_reacoes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_attachments: {
        Row: {
          created_at: string
          file_path: string
          id: string
          mime_type: string
          name: string
          partner_id: string
          size_bytes: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          mime_type?: string
          name?: string
          partner_id: string
          size_bytes?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          mime_type?: string
          name?: string
          partner_id?: string
          size_bytes?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_attachments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_offices: {
        Row: {
          office_id: string
          partner_id: string
        }
        Insert: {
          office_id: string
          partner_id: string
        }
        Update: {
          office_id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_offices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          all_offices: boolean
          benefit_description: string
          category: Database["public"]["Enums"]["partner_category"]
          category_slug: string | null
          created_at: string
          discount: string
          how_to_use: string
          id: string
          instagram: string | null
          is_active: boolean
          is_featured: boolean
          logo_url: string | null
          name: string
          rules: string
          slug: string
          summary: string
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          all_offices?: boolean
          benefit_description?: string
          category?: Database["public"]["Enums"]["partner_category"]
          category_slug?: string | null
          created_at?: string
          discount?: string
          how_to_use?: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name: string
          rules?: string
          slug: string
          summary?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          all_offices?: boolean
          benefit_description?: string
          category?: Database["public"]["Enums"]["partner_category"]
          category_slug?: string | null
          created_at?: string
          discount?: string
          how_to_use?: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          rules?: string
          slug?: string
          summary?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "partner_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      perfil_permissoes: {
        Row: {
          perfil_id: string
          permissao: string
        }
        Insert: {
          perfil_id: string
          permissao: string
        }
        Update: {
          perfil_id?: string
          permissao?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_permissoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          criado_em: string
          departamento_sp_id: string | null
          descricao: string
          id: string
          nivel_departamento: string | null
          nome: string
          sistema: boolean
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          departamento_sp_id?: string | null
          descricao?: string
          id?: string
          nivel_departamento?: string | null
          nome: string
          sistema?: boolean
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          departamento_sp_id?: string | null
          descricao?: string
          id?: string
          nivel_departamento?: string | null
          nome?: string
          sistema?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          employee_id: string | null
          entra_oid: string | null
          full_name: string
          id: string
          is_active: boolean
          primeiro_acesso: string | null
          sincronizado_em: string | null
          tour_visto_em: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          employee_id?: string | null
          entra_oid?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          primeiro_acesso?: string | null
          sincronizado_em?: string | null
          tour_visto_em?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          employee_id?: string | null
          entra_oid?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          primeiro_acesso?: string | null
          sincronizado_em?: string | null
          tour_visto_em?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profissional_departamento: {
        Row: {
          atualizado_em: string
          departamento_id: string | null
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          departamento_id?: string | null
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          departamento_id?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profissional_departamento_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos_portal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_departamento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questionarios_internos: {
        Row: {
          anonimo: boolean
          criado_em: string
          criador_id: string
          descricao: string
          excluindo: boolean
          id: string
          perguntas: Json
          revisao: number
          sharepoint_registrado: boolean
          sincronizacao_ate: string | null
          titulo: string
        }
        Insert: {
          anonimo: boolean
          criado_em?: string
          criador_id: string
          descricao?: string
          excluindo?: boolean
          id?: string
          perguntas: Json
          revisao?: number
          sharepoint_registrado?: boolean
          sincronizacao_ate?: string | null
          titulo: string
        }
        Update: {
          anonimo?: boolean
          criado_em?: string
          criador_id?: string
          descricao?: string
          excluindo?: boolean
          id?: string
          perguntas?: Json
          revisao?: number
          sharepoint_registrado?: boolean
          sincronizacao_ate?: string | null
          titulo?: string
        }
        Relationships: []
      }
      questionarios_participacoes: {
        Row: {
          questionario_id: string
          usuario_id: string
        }
        Insert: {
          questionario_id: string
          usuario_id: string
        }
        Update: {
          questionario_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionarios_participacoes_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios_internos"
            referencedColumns: ["id"]
          },
        ]
      }
      questionarios_respostas: {
        Row: {
          id: string
          perguntas: Json | null
          questionario_id: string
          respondente_id: string | null
          respostas: Json
          sharepoint_registrado: boolean
        }
        Insert: {
          id?: string
          perguntas?: Json | null
          questionario_id: string
          respondente_id?: string | null
          respostas: Json
          sharepoint_registrado?: boolean
        }
        Update: {
          id?: string
          perguntas?: Json | null
          questionario_id?: string
          respondente_id?: string | null
          respostas?: Json
          sharepoint_registrado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "questionarios_respostas_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios_internos"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_programs: {
        Row: {
          contacts: string
          contacts_title: string
          created_at: string
          description: string
          description_title: string
          how_to_join: string
          how_to_join_title: string
          icon: string
          id: string
          is_active: boolean
          needs_content: boolean
          rules: string
          rules_title: string
          slug: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          contacts?: string
          contacts_title?: string
          created_at?: string
          description?: string
          description_title?: string
          how_to_join?: string
          how_to_join_title?: string
          icon?: string
          id?: string
          is_active?: boolean
          needs_content?: boolean
          rules?: string
          rules_title?: string
          slug: string
          sort_order?: number
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          contacts?: string
          contacts_title?: string
          created_at?: string
          description?: string
          description_title?: string
          how_to_join?: string
          how_to_join_title?: string
          icon?: string
          id?: string
          is_active?: boolean
          needs_content?: boolean
          rules?: string
          rules_title?: string
          slug?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      status_sincronizacao: {
        Row: {
          alterados: number
          disparado_por: string | null
          em_execucao_desde: string | null
          erro: string | null
          executado_em: string | null
          id: boolean
          origem: string | null
          sucesso: boolean | null
        }
        Insert: {
          alterados?: number
          disparado_por?: string | null
          em_execucao_desde?: string | null
          erro?: string | null
          executado_em?: string | null
          id?: boolean
          origem?: string | null
          sucesso?: boolean | null
        }
        Update: {
          alterados?: number
          disparado_por?: string | null
          em_execucao_desde?: string | null
          erro?: string | null
          executado_em?: string | null
          id?: boolean
          origem?: string | null
          sucesso?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuario_perfis: {
        Row: {
          atribuido_em: string
          atribuido_por: string | null
          perfil_id: string
          usuario_id: string
        }
        Insert: {
          atribuido_em?: string
          atribuido_por?: string | null
          perfil_id: string
          usuario_id: string
        }
        Update: {
          atribuido_em?: string
          atribuido_por?: string | null
          perfil_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_perfis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_perfis_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acompanhamento_aviso: { Args: { _aviso_id: string }; Returns: Json }
      admin_contagem_profissionais: {
        Args: never
        Returns: {
          ativos: number
          inativos: number
          total: number
        }[]
      }
      admin_listar_profissionais: {
        Args: {
          _busca: string
          _deslocamento: number
          _filtro: string
          _limite: number
        }
        Returns: {
          email: string
          employee_id: string
          entra_oid: string
          full_name: string
          id: string
          is_active: boolean
          perfil: Database["public"]["Enums"]["app_role"]
          primeiro_acesso: string
          sincronizado_em: string
          total: number
          ultimo_acesso: string
        }[]
      }
      admin_listar_profissionais_perfis: {
        Args: {
          _busca: string
          _deslocamento: number
          _filtro: string
          _limite: number
        }
        Returns: {
          email: string
          employee_id: string
          entra_oid: string
          full_name: string
          id: string
          is_active: boolean
          perfis: Json
          primeiro_acesso: string
          sincronizado_em: string
          total: number
          ultimo_acesso: string
        }[]
      }
      aplicar_departamentos: { Args: { _snapshot: Json }; Returns: number }
      aviso_disponivel: { Args: { _id: string }; Returns: boolean }
      aviso_vigente: {
        Args: { _arquivado: string; _expira: string; _publicar: string }
        Returns: boolean
      }
      avisos_enviados: {
        Args: never
        Returns: {
          arquivado_em: string
          ativos: number
          autor_id: string
          autor_nome: string
          editado_em: string
          expira_em: string
          id: string
          lidos: number
          mensagem: string
          perfil_id: string
          perfil_nome: string
          publicar_em: string
          tipo: string
          titulo: string
        }[]
      }
      avisos_enviados_confirmacao: {
        Args: never
        Returns: {
          arquivado_em: string
          ativos: number
          autor_id: string
          autor_nome: string
          editado_em: string
          exige_confirmacao: boolean
          expira_em: string
          id: string
          lidos: number
          mensagem: string
          perfil_id: string
          perfil_nome: string
          publicar_em: string
          tipo: string
          titulo: string
        }[]
      }
      buscar_profissionais_ativos: {
        Args: { _busca: string }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      compilado_vigente: {
        Args: never
        Returns: {
          editado_em: string
          id: string
          mensagem: string
          mes_ano: string
          perfil_nome: string
          publicar_em: string
          titulo: string
        }[]
      }
      confirmar_leitura_aviso: { Args: { _aviso_id: string }; Returns: string }
      contar_nao_lidos: { Args: never; Returns: number }
      criar_questionario: {
        Args: {
          _anonimo: boolean
          _descricao: string
          _perguntas: Json
          _titulo: string
        }
        Returns: string
      }
      editar_questionario: {
        Args: {
          _descricao: string
          _id: string
          _perguntas: Json
          _titulo: string
        }
        Returns: undefined
      }
      finalizar_exclusao_questionario: {
        Args: { _id: string }
        Returns: undefined
      }
      gere_aviso: {
        Args: { _autor: string; _perfil: string }
        Returns: boolean
      }
      gestao_questionario: { Args: { _id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      iniciar_exclusao_questionario: {
        Args: { _id: string }
        Returns: undefined
      }
      insider_vigente: {
        Args: never
        Returns: {
          editado_em: string
          id: string
          mensagem: string
          perfil_nome: string
          publicar_em: string
          titulo: string
        }[]
      }
      interacoes_compilado: { Args: { _aviso_id: string }; Returns: Json }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_editor: { Args: { _user_id: string }; Returns: boolean }
      liberar_registro_questionario: {
        Args: { _id: string }
        Returns: undefined
      }
      limpar_html_aviso: { Args: { _html: string }; Returns: string }
      listar_avisos: {
        Args: {
          _deslocamento?: number
          _limite?: number
          _so_nao_lidos?: boolean
        }
        Returns: {
          editado_em: string
          expira_em: string
          id: string
          lido: boolean
          mensagem: string
          perfil_nome: string
          publicar_em: string
          tipo: string
          titulo: string
        }[]
      }
      listar_avisos_confirmacao: {
        Args: {
          _aviso_id?: string
          _deslocamento?: number
          _limite?: number
          _priorizar?: boolean
          _so_nao_lidos?: boolean
          _so_obrigatorios?: boolean
        }
        Returns: {
          confirmado_em: string
          editado_em: string
          exige_confirmacao: boolean
          expira_em: string
          id: string
          lido: boolean
          mensagem: string
          perfil_nome: string
          publicar_em: string
          tipo: string
          titulo: string
        }[]
      }
      listar_mural: {
        Args: never
        Returns: {
          anos_casa: number
          comentarios: Json
          criado_em: string
          data_post: string
          id: string
          imagem_path: string
          texto: string
          tipo: string
          titulo: string
          visivel_ate: string
        }[]
      }
      listar_mural_com_reacoes: {
        Args: never
        Returns: {
          anos_casa: number
          comentarios: Json
          criado_em: string
          data_post: string
          id: string
          imagem_path: string
          minha_reacao: string
          reacoes: Json
          texto: string
          tipo: string
          titulo: string
          visivel_ate: string
        }[]
      }
      listar_questionarios: { Args: never; Returns: Json }
      marcar_todos_avisos_lidos: { Args: never; Returns: number }
      marcar_tour_visto: { Args: never; Returns: undefined }
      membros_perfil: {
        Args: { _perfil_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
          is_active: boolean
        }[]
      }
      meu_escopo_departamento: { Args: never; Returns: Json }
      meus_perfis_remetentes: {
        Args: never
        Returns: {
          id: string
          nome: string
        }[]
      }
      minhas_permissoes: { Args: never; Returns: string[] }
      mural_post_vigente: {
        Args: { _hoje: string; _publicado: string }
        Returns: boolean
      }
      mural_vigentes: {
        Args: never
        Returns: {
          anos_casa: number
          data_post: string
          id: string
          imagem_path: string
          texto: string
          tipo: string
          titulo: string
        }[]
      }
      pode_enviar_como: { Args: { _perfil_id: string }; Returns: boolean }
      pode_interagir_compilado: {
        Args: { _aviso_id: string }
        Returns: boolean
      }
      pode_ler_insider: { Args: { _id: string }; Returns: boolean }
      primeiro_util_mes: { Args: { _data: string }; Returns: string }
      publicar_edicao_insider: {
        Args: { _id: string; _perfil: string; _revisao: number }
        Returns: string
      }
      receber_compilado: {
        Args: { _html: string; _mes_ano: string; _titulo: string }
        Returns: string
      }
      reservar_departamentos: { Args: never; Returns: boolean }
      reservar_insider: {
        Args: { _mes: string; _token: string }
        Returns: boolean
      }
      reservar_registro_questionario: {
        Args: { _id: string }
        Returns: boolean
      }
      reservar_sincronizacao: { Args: never; Returns: boolean }
      responder_questionario: {
        Args: { _id: string; _respostas: Json }
        Returns: string
      }
      salvar_edicao_insider: {
        Args: {
          _conteudo: Json
          _id: string
          _revisao: number
          _titulo: string
        }
        Returns: {
          atualizado_em: string
          aviso_id: string | null
          conteudo: Json
          criado_em: string
          id: string
          mes_ano: string
          origem: string
          revisao: number
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "insider_edicoes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tem_permissao: { Args: { _permissao: string }; Returns: boolean }
      tour_pendente: { Args: never; Returns: boolean }
      usuario_tem_permissao: {
        Args: { _permissao: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "rh" | "funcionario"
      partner_category:
        | "saude-bem-estar"
        | "esportes"
        | "gastronomia"
        | "estetica"
        | "educacao"
        | "compras-servicos"
        | "lazer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "rh", "funcionario"],
      partner_category: [
        "saude-bem-estar",
        "esportes",
        "gastronomia",
        "estetica",
        "educacao",
        "compras-servicos",
        "lazer",
      ],
    },
  },
} as const
