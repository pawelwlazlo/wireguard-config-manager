export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  app: {
    Tables: {
      accepted_domains: {
        Row: {
          created_at: string;
          domain: string;
        };
        Insert: {
          created_at?: string;
          domain: string;
        };
        Update: {
          created_at?: string;
          domain?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: Database["app"]["Enums"]["audit_event_enum"];
          id: number;
          metadata: Json;
          subject_id: string | null;
          subject_table: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: Database["app"]["Enums"]["audit_event_enum"];
          id?: number;
          metadata?: Json;
          subject_id?: string | null;
          subject_table: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: Database["app"]["Enums"]["audit_event_enum"];
          id?: number;
          metadata?: Json;
          subject_id?: string | null;
          subject_table?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      config_kv: {
        Row: {
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          created_at: string;
          files_imported: number;
          id: string;
          imported_by: string | null;
        };
        Insert: {
          created_at?: string;
          files_imported: number;
          id?: string;
          imported_by?: string | null;
        };
        Update: {
          created_at?: string;
          files_imported?: number;
          id?: string;
          imported_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "import_batches_imported_by_fkey";
            columns: ["imported_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      password_reset_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          revoked_at?: string | null;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      peers: {
        Row: {
          claimed_at: string | null;
          config_ciphertext: string;
          created_at: string;
          friendly_name: string | null;
          id: string;
          imported_at: string;
          owner_id: string | null;
          public_key: string;
          revoked_at: string | null;
          status: Database["app"]["Enums"]["peer_status_enum"];
          updated_at: string;
        };
        Insert: {
          claimed_at?: string | null;
          config_ciphertext: string;
          created_at?: string;
          friendly_name?: string | null;
          id?: string;
          imported_at: string;
          owner_id?: string | null;
          public_key: string;
          revoked_at?: string | null;
          status?: Database["app"]["Enums"]["peer_status_enum"];
          updated_at?: string;
        };
        Update: {
          claimed_at?: string | null;
          config_ciphertext?: string;
          created_at?: string;
          friendly_name?: string | null;
          id?: string;
          imported_at?: string;
          owner_id?: string | null;
          public_key?: string;
          revoked_at?: string | null;
          status?: Database["app"]["Enums"]["peer_status_enum"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "peers_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      roles: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: number;
          name: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      user_limit_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          id: number;
          new_limit: number;
          old_limit: number;
          user_id: string;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          id?: number;
          new_limit: number;
          old_limit: number;
          user_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          id?: number;
          new_limit?: number;
          old_limit?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_limit_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_limit_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          role_id: number;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          role_id: number;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          role_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          peer_limit: number;
          status: Database["app"]["Enums"]["user_status_enum"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          peer_limit?: number;
          status?: Database["app"]["Enums"]["user_status_enum"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          peer_limit?: number;
          status?: Database["app"]["Enums"]["user_status_enum"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      sync_existing_auth_users: {
        Args: never;
        Returns: {
          error_count: number;
          skipped_count: number;
          synced_count: number;
        }[];
      };
    };
    Enums: {
      audit_event_enum:
        | "LOGIN"
        | "PEER_CLAIM"
        | "PEER_ASSIGN"
        | "PEER_DOWNLOAD"
        | "PEER_REVOKE"
        | "RESET_PASSWORD"
        | "LIMIT_CHANGE"
        | "USER_DEACTIVATE"
        | "IMPORT";
      peer_status_enum: "available" | "active" | "inactive";
      user_status_enum: "active" | "inactive";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  app: {
    Enums: {
      audit_event_enum: [
        "LOGIN",
        "PEER_CLAIM",
        "PEER_ASSIGN",
        "PEER_DOWNLOAD",
        "PEER_REVOKE",
        "RESET_PASSWORD",
        "LIMIT_CHANGE",
        "USER_DEACTIVATE",
        "IMPORT",
      ],
      peer_status_enum: ["available", "active", "inactive"],
      user_status_enum: ["active", "inactive"],
    },
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
