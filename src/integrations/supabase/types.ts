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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      booking_slots: {
        Row: {
          created_at: string
          day_of_week: number
          description: string | null
          duration_minutes: number
          enabled: boolean
          end_time: string
          id: string
          start_time: string
          title: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          description?: string | null
          duration_minutes?: number
          enabled?: boolean
          end_time: string
          id?: string
          start_time: string
          title: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          description?: string | null
          duration_minutes?: number
          enabled?: boolean
          end_time?: string
          id?: string
          start_time?: string
          title?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          category: string
          color: string | null
          created_at: string
          description: string | null
          end_time: string
          external_id: string | null
          id: string
          is_all_day: boolean
          last_synced_at: string | null
          location: string | null
          read_only: boolean
          recurrence: Json | null
          source: string
          start_time: string
          title: string
          updated_at: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          external_id?: string | null
          id?: string
          is_all_day?: boolean
          last_synced_at?: string | null
          location?: string | null
          read_only?: boolean
          recurrence?: Json | null
          source?: string
          start_time: string
          title: string
          updated_at?: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          external_id?: string | null
          id?: string
          is_all_day?: boolean
          last_synced_at?: string | null
          location?: string | null
          read_only?: boolean
          recurrence?: Json | null
          source?: string
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          enabled: boolean
          ical_url: string | null
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          provider: string
          refresh_token: string | null
          sync_cursor: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          enabled?: boolean
          ical_url?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider: string
          refresh_token?: string | null
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          enabled?: boolean
          ical_url?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider?: string
          refresh_token?: string | null
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      chat_folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
          status: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
          status?: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
          status?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "chat_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_assets: {
        Row: {
          created_at: string
          file_path: string
          id: string
          original_name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          original_name: string
          project_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          original_name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creation_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "creation_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_projects: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creation_scene_state: {
        Row: {
          project_id: string
          state_json: Json
          updated_at: string
        }
        Insert: {
          project_id: string
          state_json?: Json
          updated_at?: string
        }
        Update: {
          project_id?: string
          state_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creation_scene_state_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "creation_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_selections: {
        Row: {
          calendar_color: string | null
          calendar_id: string
          calendar_name: string
          created_at: string
          enabled: boolean
          id: string
          integration_id: string
          sync_cursor: string | null
        }
        Insert: {
          calendar_color?: string | null
          calendar_id: string
          calendar_name: string
          created_at?: string
          enabled?: boolean
          id?: string
          integration_id: string
          sync_cursor?: string | null
        }
        Update: {
          calendar_color?: string | null
          calendar_id?: string
          calendar_name?: string
          created_at?: string
          enabled?: boolean
          id?: string
          integration_id?: string
          sync_cursor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_selections_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendar_selections_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed_at: string
          habit_id: string
          id: string
          notes: string | null
          skipped: boolean | null
          user_id: string
          user_key: string | null
          value: number | null
        }
        Insert: {
          completed_at?: string
          habit_id: string
          id?: string
          notes?: string | null
          skipped?: boolean | null
          user_id: string
          user_key?: string | null
          value?: number | null
        }
        Update: {
          completed_at?: string
          habit_id?: string
          id?: string
          notes?: string | null
          skipped?: boolean | null
          user_id?: string
          user_key?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: string | null
          enabled: boolean
          habit_type: string | null
          icon: string | null
          id: string
          routine_id: string | null
          routine_order: number | null
          schedule_days: number[] | null
          schedule_type: string | null
          target_value: number | null
          title: string
          updated_at: string
          user_id: string
          user_key: string | null
          weekly_frequency: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          enabled?: boolean
          habit_type?: string | null
          icon?: string | null
          id?: string
          routine_id?: string | null
          routine_order?: number | null
          schedule_days?: number[] | null
          schedule_type?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
          user_id: string
          user_key?: string | null
          weekly_frequency?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          enabled?: boolean
          habit_type?: string | null
          icon?: string | null
          id?: string
          routine_id?: string | null
          routine_order?: number | null
          schedule_days?: number[] | null
          schedule_type?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          user_key?: string | null
          weekly_frequency?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      note_folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          canvas_state: string | null
          created_at: string
          elements: Json | null
          folder_id: string | null
          id: string
          note_type: string
          pan_x: number
          pan_y: number
          pinned: boolean
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          user_key: string | null
          zoom: number
        }
        Insert: {
          canvas_state?: string | null
          created_at?: string
          elements?: Json | null
          folder_id?: string | null
          id?: string
          note_type?: string
          pan_x?: number
          pan_y?: number
          pinned?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id: string
          user_key?: string | null
          zoom?: number
        }
        Update: {
          canvas_state?: string | null
          created_at?: string
          elements?: Json | null
          folder_id?: string | null
          id?: string
          note_type?: string
          pan_x?: number
          pan_y?: number
          pinned?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          user_key?: string | null
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_data: Json | null
          action_type: string | null
          archived_at: string | null
          content: string | null
          created_at: string
          id: string
          read: boolean
          read_at: string | null
          source: string
          title: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          archived_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          read?: boolean
          read_at?: string | null
          source?: string
          title: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          archived_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          read?: boolean
          read_at?: string | null
          source?: string
          title?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      oauth_nonces: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          nonce: string
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          nonce: string
          provider: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          id: string
          redeemed_at: string
          reward_id: string
          user_id: string
          user_key: string | null
          xp_spent: number
        }
        Insert: {
          id?: string
          redeemed_at?: string
          reward_id: string
          user_id: string
          user_key?: string | null
          xp_spent: number
        }
        Update: {
          id?: string
          redeemed_at?: string
          reward_id?: string
          user_id?: string
          user_key?: string | null
          xp_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          icon: string | null
          id: string
          name: string
          user_id: string
          user_key: string | null
          xp_cost: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          name: string
          user_id: string
          user_key?: string | null
          xp_cost?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          name?: string
          user_id?: string
          user_key?: string | null
          xp_cost?: number
        }
        Relationships: []
      }
      routines: {
        Row: {
          anchor_cue: string | null
          created_at: string
          enabled: boolean
          icon: string | null
          id: string
          name: string
          reward_description: string | null
          routine_type: string | null
          updated_at: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          anchor_cue?: string | null
          created_at?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          name: string
          reward_description?: string | null
          routine_type?: string | null
          updated_at?: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          anchor_cue?: string | null
          created_at?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          name?: string
          reward_description?: string | null
          routine_type?: string | null
          updated_at?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          done: boolean
          due_date: string | null
          id: string
          priority: number
          title: string
          updated_at: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          priority?: number
          title: string
          updated_at?: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          priority?: number
          title?: string
          updated_at?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      us_holidays: {
        Row: {
          date: string
          id: string
          name: string
          year: number
        }
        Insert: {
          date: string
          id?: string
          name: string
          year: number
        }
        Update: {
          date?: string
          id?: string
          name?: string
          year?: number
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          available_xp: number
          created_at: string
          current_level: number
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
          user_key: string | null
        }
        Insert: {
          available_xp?: number
          created_at?: string
          current_level?: number
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
          user_key?: string | null
        }
        Update: {
          available_xp?: number
          created_at?: string
          current_level?: number
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
          user_key?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          analytics_enabled: boolean
          api_endpoint: string | null
          api_token: string | null
          created_at: string
          data_collection_enabled: boolean
          email_notifications_enabled: boolean
          encryption_enabled: boolean
          id: string
          learning_mode_enabled: boolean
          proactive_suggestions_enabled: boolean
          push_notifications_enabled: boolean
          sound_enabled: boolean
          theme: string
          updated_at: string
          user_id: string
          user_key: string | null
          voice_responses_enabled: boolean
        }
        Insert: {
          analytics_enabled?: boolean
          api_endpoint?: string | null
          api_token?: string | null
          created_at?: string
          data_collection_enabled?: boolean
          email_notifications_enabled?: boolean
          encryption_enabled?: boolean
          id?: string
          learning_mode_enabled?: boolean
          proactive_suggestions_enabled?: boolean
          push_notifications_enabled?: boolean
          sound_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          user_key?: string | null
          voice_responses_enabled?: boolean
        }
        Update: {
          analytics_enabled?: boolean
          api_endpoint?: string | null
          api_token?: string | null
          created_at?: string
          data_collection_enabled?: boolean
          email_notifications_enabled?: boolean
          encryption_enabled?: boolean
          id?: string
          learning_mode_enabled?: boolean
          proactive_suggestions_enabled?: boolean
          push_notifications_enabled?: boolean
          sound_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          user_key?: string | null
          voice_responses_enabled?: boolean
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          reference_id: string | null
          user_id: string
          user_key: string | null
          xp_amount: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          reference_id?: string | null
          user_id: string
          user_key?: string | null
          xp_amount: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          reference_id?: string | null
          user_id?: string
          user_key?: string | null
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      calendar_integrations_safe: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          provider: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
