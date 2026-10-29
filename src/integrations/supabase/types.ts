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
          autor_id: string
          criado_em: string
          data_post: string
          id: string
          imagem_path: string | null
          texto: string
          titulo: string
          visivel_ate: string | null
        }
        Insert: {
          autor_id?: string
          criado_em?: string
          data_post?: string
          id?: string
          imagem_path?: string | null
          texto?: string
          titulo: string
          visivel_ate?: string | null
        }
        Update: {
          autor_id?: string
          criado_em?: string
          data_post?: string
          id?: string
          imagem_path?: string | null
          texto?: string
          titulo?: string
          visivel_ate?: string | null
        }
        Relationships: []
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
          descricao: string
          id: string
          nome: string
          sistema: boolean
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          descricao?: string
          id?: string
          nome: string
          sistema?: boolean
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          descricao?: string
          id?: string
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
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
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
      buscar_profissionais_ativos: {
        Args: { _busca: string }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      contar_nao_lidos: { Args: never; Returns: number }
      gere_aviso: {
        Args: { _autor: string; _perfil: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_editor: { Args: { _user_id: string }; Returns: boolean }
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
      listar_mural: {
        Args: never
        Returns: {
          comentarios: Json
          criado_em: string
          data_post: string
          id: string
          imagem_path: string
          texto: string
          titulo: string
          visivel_ate: string
        }[]
      }
      marcar_todos_avisos_lidos: { Args: never; Returns: number }
      membros_perfil: {
        Args: { _perfil_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
          is_active: boolean
        }[]
      }
      meus_perfis_remetentes: {
        Args: never
        Returns: {
          id: string
          nome: string
        }[]
      }
      minhas_permissoes: { Args: never; Returns: string[] }
      mural_vigentes: {
        Args: never
        Returns: {
          data_post: string
          id: string
          imagem_path: string
          texto: string
          titulo: string
        }[]
      }
      pode_enviar_como: { Args: { _perfil_id: string }; Returns: boolean }
      reservar_sincronizacao: { Args: never; Returns: boolean }
      tem_permissao: { Args: { _permissao: string }; Returns: boolean }
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
