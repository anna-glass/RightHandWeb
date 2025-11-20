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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      onboarding_responses: {
        Row: {
          id: string
          typical_week: string | null
          calendar_connected: boolean | null
          home_address: string | null
          work_address: string | null
          frequent_businesses: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          typical_week?: string | null
          calendar_connected?: boolean | null
          home_address?: string | null
          work_address?: string | null
          frequent_businesses?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          typical_week?: string | null
          calendar_connected?: boolean | null
          home_address?: string | null
          work_address?: string | null
          frequent_businesses?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string | null
          updated_at: string | null
          address: string | null
          phone_number: string | null
          email: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string | null
          updated_at?: string | null
          address?: string | null
          phone_number?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string | null
          updated_at?: string | null
          address?: string | null
          phone_number?: string | null
          email?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          content: string
          created_at: string | null
          attachments: Json | null
          member: string
          sender: string | null
        }
        Insert: {
          id?: string
          content: string
          created_at?: string | null
          attachments?: Json | null
          member: string
          sender?: string | null
        }
        Update: {
          id?: string
          content?: string
          created_at?: string | null
          attachments?: Json | null
          member?: string
          sender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_fkey"
            columns: ["sender"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      imessages: {
        Row: {
          event: string
          message_id: string
          sender: string
          text: string
          attachments: Json | null
          protocol: string
          device_id: string
          created_at: string | null
          profile_id: string | null
        }
        Insert: {
          event: string
          message_id: string
          sender: string
          text: string
          attachments?: Json | null
          protocol: string
          device_id: string
          created_at?: string | null
          profile_id?: string | null
        }
        Update: {
          event?: string
          message_id?: string
          sender?: string
          text?: string
          attachments?: Json | null
          protocol?: string
          device_id?: string
          created_at?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imessages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string | null
          status: string | null
          status_updates: string[] | null
          created_at: string | null
          updated_at: string | null
          user_id: string
          hours_saved: number | null
        }
        Insert: {
          id?: string
          title?: string | null
          status?: string | null
          status_updates?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          user_id: string
          hours_saved?: number | null
        }
        Update: {
          id?: string
          title?: string | null
          status?: string | null
          status_updates?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
          hours_saved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          avatar_url: string | null
          created_at: string | null
          updated_at: string | null
          first_name: string | null
          last_name: string | null
          email: string
          notes: string | null
          phone_number: string | null
          google_calendar_token: string | null
          google_refresh_token: string | null
          verified: boolean | null
          verification_token: string | null
        }
        Insert: {
          id: string
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string
          notes?: string | null
          phone_number?: string | null
          google_calendar_token?: string | null
          google_refresh_token?: string | null
          verified?: boolean | null
          verification_token?: string | null
        }
        Update: {
          id?: string
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string
          notes?: string | null
          phone_number?: string | null
          google_calendar_token?: string | null
          google_refresh_token?: string | null
          verified?: boolean | null
          verification_token?: string | null
        }
        Relationships: []
      }
      righthands: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          email: string
          role: Database["public"]["Enums"]["user_role"]
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          email: string
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          id: string
          email: string
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string | null
        }
        Relationships: []
      }
      pending_verifications: {
        Row: {
          verification_token: string
          phone_number: string
          created_at: string | null
        }
        Insert: {
          verification_token: string
          phone_number: string
          created_at?: string | null
        }
        Update: {
          verification_token?: string
          phone_number?: string
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role:
        | "member"
        | "righthand"
        | "assistant"
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
      user_role: [
        "member",
        "righthand",
        "assistant",
      ],
    },
  },
} as const
