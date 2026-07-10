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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      conversation_settings: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          muted: boolean
          owner_id: string
          peer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          muted?: boolean
          owner_id: string
          peer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          muted?: boolean
          owner_id?: string
          peer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_requests: {
        Row: {
          created_at: string
          id: string
          initiator_id: string
          status: string
          updated_at: string
          user_max: string
          user_min: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiator_id: string
          status?: string
          updated_at?: string
          user_max: string
          user_min: string
        }
        Update: {
          created_at?: string
          id?: string
          initiator_id?: string
          status?: string
          updated_at?: string
          user_max?: string
          user_min?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_duration_seconds: number | null
          audio_path: string | null
          content: string | null
          created_at: string
          id: string
          note_id: string | null
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_path?: string | null
          content?: string | null
          created_at?: string
          id?: string
          note_id?: string | null
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_path?: string | null
          content?: string | null
          created_at?: string
          id?: string
          note_id?: string | null
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_reactions: {
        Row: {
          created_at: string
          id: string
          note_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_reactions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          mood: string | null
          tag: string | null
          title: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          mood?: string | null
          tag?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          mood?: string | null
          tag?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      profile_admirations: {
        Row: {
          created_at: string
          giver_id: string
          id: string
          recipient_id: string
        }
        Insert: {
          created_at?: string
          giver_id: string
          id?: string
          recipient_id: string
        }
        Update: {
          created_at?: string
          giver_id?: string
          id?: string
          recipient_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          emotional_control: number
          focus_level: number
          free_card_category: number | null
          free_card_drawn_on: string | null
          free_card_index: number | null
          goals: string[] | null
          id: string
          mercadopago_customer_id: string | null
          mercadopago_preapproval_id: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_emotions: string[]
          onboarding_goals: string[]
          plan: string
          plan_current_period_end: string | null
          plan_status: string | null
          reminder_enabled: boolean
          reminder_time: string
          reminder_timezone: string
          streak_days: number
          tilt_triggers: string[] | null
          total_resets: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          emotional_control?: number
          focus_level?: number
          free_card_category?: number | null
          free_card_drawn_on?: string | null
          free_card_index?: number | null
          goals?: string[] | null
          id: string
          mercadopago_customer_id?: string | null
          mercadopago_preapproval_id?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_emotions?: string[]
          onboarding_goals?: string[]
          plan?: string
          plan_current_period_end?: string | null
          plan_status?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          reminder_timezone?: string
          streak_days?: number
          tilt_triggers?: string[] | null
          total_resets?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          emotional_control?: number
          focus_level?: number
          free_card_category?: number | null
          free_card_drawn_on?: string | null
          free_card_index?: number | null
          goals?: string[] | null
          id?: string
          mercadopago_customer_id?: string | null
          mercadopago_preapproval_id?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_emotions?: string[]
          onboarding_goals?: string[]
          plan?: string
          plan_current_period_end?: string | null
          plan_status?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          reminder_timezone?: string
          streak_days?: number
          tilt_triggers?: string[] | null
          total_resets?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reset_sessions: {
        Row: {
          created_at: string
          id: string
          mode: string | null
          note: string | null
          post_intensity: number | null
          pre_intensity: number | null
          state: string | null
          states: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string | null
          note?: string | null
          post_intensity?: number | null
          pre_intensity?: number | null
          state?: string | null
          states?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string | null
          note?: string | null
          post_intensity?: number | null
          pre_intensity?: number | null
          state?: string | null
          states?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      ritual_entries: {
        Row: {
          body_tension: number
          created_at: string
          emotional_state: string
          energy: number
          gratitude: string | null
          id: string
          intention: string | null
          reflection: string | null
          user_id: string
        }
        Insert: {
          body_tension: number
          created_at?: string
          emotional_state: string
          energy: number
          gratitude?: string | null
          id?: string
          intention?: string | null
          reflection?: string | null
          user_id: string
        }
        Update: {
          body_tension?: number
          created_at?: string
          emotional_state?: string
          energy?: number
          gratitude?: string | null
          id?: string
          intention?: string | null
          reflection?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_blocked_pair: { Args: { a: string; b: string }; Returns: boolean }
      send_direct_message: {
        Args: {
          p_audio_duration_seconds?: number
          p_audio_path?: string
          p_content?: string
          p_note_id?: string
          p_recipient_id: string
        }
        Returns: {
          audio_duration_seconds: number | null
          audio_path: string | null
          content: string | null
          created_at: string
          id: string
          note_id: string | null
          read: boolean
          recipient_id: string
          sender_id: string
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
