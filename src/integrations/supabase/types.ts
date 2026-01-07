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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
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
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
          status?: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
          status?: string
          user_id?: string | null
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
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
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
      drive_accounts: {
        Row: {
          access_token: string | null
          account_email: string
          account_name: string | null
          created_at: string
          enabled: boolean
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          refresh_token: string | null
          root_folder_id: string | null
          storage_quota_total: number | null
          storage_quota_used: number | null
          token_expires_at: string | null
          updated_at: string
          user_key: string
        }
        Insert: {
          access_token?: string | null
          account_email: string
          account_name?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          refresh_token?: string | null
          root_folder_id?: string | null
          storage_quota_total?: number | null
          storage_quota_used?: number | null
          token_expires_at?: string | null
          updated_at?: string
          user_key: string
        }
        Update: {
          access_token?: string | null
          account_email?: string
          account_name?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          refresh_token?: string | null
          root_folder_id?: string | null
          storage_quota_total?: number | null
          storage_quota_used?: number | null
          token_expires_at?: string | null
          updated_at?: string
          user_key?: string
        }
        Relationships: []
      }
      drive_file_links: {
        Row: {
          created_at: string
          drive_file_id: string
          id: string
          link_type: string
          linked_entity_id: string
          notes: string | null
          user_key: string
        }
        Insert: {
          created_at?: string
          drive_file_id: string
          id?: string
          link_type: string
          linked_entity_id: string
          notes?: string | null
          user_key: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string
          id?: string
          link_type?: string
          linked_entity_id?: string
          notes?: string | null
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_file_links_drive_file_id_fkey"
            columns: ["drive_file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_files: {
        Row: {
          created_at: string
          created_time: string | null
          drive_account_id: string
          drive_file_id: string
          file_extension: string | null
          icon_link: string | null
          id: string
          is_folder: boolean
          last_synced_at: string
          mime_type: string | null
          modified_time: string | null
          name: string
          owner_email: string | null
          owner_name: string | null
          parent_folder_id: string | null
          size_bytes: number | null
          starred: boolean | null
          thumbnail_url: string | null
          trashed: boolean | null
          user_key: string
          web_content_link: string | null
          web_view_link: string | null
        }
        Insert: {
          created_at?: string
          created_time?: string | null
          drive_account_id: string
          drive_file_id: string
          file_extension?: string | null
          icon_link?: string | null
          id?: string
          is_folder?: boolean
          last_synced_at?: string
          mime_type?: string | null
          modified_time?: string | null
          name: string
          owner_email?: string | null
          owner_name?: string | null
          parent_folder_id?: string | null
          size_bytes?: number | null
          starred?: boolean | null
          thumbnail_url?: string | null
          trashed?: boolean | null
          user_key: string
          web_content_link?: string | null
          web_view_link?: string | null
        }
        Update: {
          created_at?: string
          created_time?: string | null
          drive_account_id?: string
          drive_file_id?: string
          file_extension?: string | null
          icon_link?: string | null
          id?: string
          is_folder?: boolean
          last_synced_at?: string
          mime_type?: string | null
          modified_time?: string | null
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          parent_folder_id?: string | null
          size_bytes?: number | null
          starred?: boolean | null
          thumbnail_url?: string | null
          trashed?: boolean | null
          user_key?: string
          web_content_link?: string | null
          web_view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_files_drive_account_id_fkey"
            columns: ["drive_account_id"]
            isOneToOne: false
            referencedRelation: "drive_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_drive_account_id_fkey"
            columns: ["drive_account_id"]
            isOneToOne: false
            referencedRelation: "drive_accounts_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_budgets: {
        Row: {
          amount: number
          carryover_amount: number | null
          carryover_enabled: boolean | null
          category: string
          created_at: string | null
          id: string
          month: number
          notes: string | null
          spent: number | null
          updated_at: string | null
          user_key: string
          year: number
        }
        Insert: {
          amount: number
          carryover_amount?: number | null
          carryover_enabled?: boolean | null
          category: string
          created_at?: string | null
          id?: string
          month: number
          notes?: string | null
          spent?: number | null
          updated_at?: string | null
          user_key: string
          year: number
        }
        Update: {
          amount?: number
          carryover_amount?: number | null
          carryover_enabled?: boolean | null
          category?: string
          created_at?: string | null
          id?: string
          month?: number
          notes?: string | null
          spent?: number | null
          updated_at?: string | null
          user_key?: string
          year?: number
        }
        Relationships: []
      }
      finance_gift_card_usage: {
        Row: {
          amount: number
          description: string | null
          gift_card_id: string
          id: string
          used_at: string | null
          user_key: string
        }
        Insert: {
          amount: number
          description?: string | null
          gift_card_id: string
          id?: string
          used_at?: string | null
          user_key: string
        }
        Update: {
          amount?: number
          description?: string | null
          gift_card_id?: string
          id?: string
          used_at?: string | null
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_gift_card_usage_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "finance_gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_gift_cards: {
        Row: {
          card_number_last4: string | null
          created_at: string | null
          currency: string | null
          current_balance: number
          expiry_date: string | null
          id: string
          initial_balance: number
          is_depleted: boolean | null
          merchant_name: string
          notes: string | null
          photo_file_id: string | null
          purchase_date: string | null
          updated_at: string | null
          user_key: string
        }
        Insert: {
          card_number_last4?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance: number
          expiry_date?: string | null
          id?: string
          initial_balance: number
          is_depleted?: boolean | null
          merchant_name: string
          notes?: string | null
          photo_file_id?: string | null
          purchase_date?: string | null
          updated_at?: string | null
          user_key: string
        }
        Update: {
          card_number_last4?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number
          expiry_date?: string | null
          id?: string
          initial_balance?: number
          is_depleted?: boolean | null
          merchant_name?: string
          notes?: string | null
          photo_file_id?: string | null
          purchase_date?: string | null
          updated_at?: string | null
          user_key?: string
        }
        Relationships: []
      }
      finance_linked_accounts: {
        Row: {
          account_mask: string | null
          account_name: string | null
          account_subtype: string | null
          account_type: string | null
          available_balance: number | null
          created_at: string | null
          currency: string | null
          current_balance: number | null
          error_code: string | null
          error_message: string | null
          id: string
          institution_id: string | null
          institution_logo: string | null
          institution_name: string
          is_active: boolean | null
          last_synced_at: string | null
          plaid_access_token: string
          plaid_item_id: string
          sync_cursor: string | null
          updated_at: string | null
          user_key: string
        }
        Insert: {
          account_mask?: string | null
          account_name?: string | null
          account_subtype?: string | null
          account_type?: string | null
          available_balance?: number | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string | null
          institution_logo?: string | null
          institution_name: string
          is_active?: boolean | null
          last_synced_at?: string | null
          plaid_access_token: string
          plaid_item_id: string
          sync_cursor?: string | null
          updated_at?: string | null
          user_key: string
        }
        Update: {
          account_mask?: string | null
          account_name?: string | null
          account_subtype?: string | null
          account_type?: string | null
          available_balance?: number | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string | null
          institution_logo?: string | null
          institution_name?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          plaid_access_token?: string
          plaid_item_id?: string
          sync_cursor?: string | null
          updated_at?: string | null
          user_key?: string
        }
        Relationships: []
      }
      finance_portfolio: {
        Row: {
          average_cost: number | null
          created_at: string | null
          id: string
          notes: string | null
          purchase_date: string | null
          shares: number
          symbol: string
          updated_at: string | null
          user_key: string
        }
        Insert: {
          average_cost?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string | null
          shares: number
          symbol: string
          updated_at?: string | null
          user_key: string
        }
        Update: {
          average_cost?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string | null
          shares?: number
          symbol?: string
          updated_at?: string | null
          user_key?: string
        }
        Relationships: []
      }
      finance_settings: {
        Row: {
          created_at: string | null
          default_currency: string | null
          fiscal_month_start: number | null
          hide_balances: boolean | null
          id: string
          show_cents: boolean | null
          updated_at: string | null
          user_key: string
        }
        Insert: {
          created_at?: string | null
          default_currency?: string | null
          fiscal_month_start?: number | null
          hide_balances?: boolean | null
          id?: string
          show_cents?: boolean | null
          updated_at?: string | null
          user_key: string
        }
        Update: {
          created_at?: string | null
          default_currency?: string | null
          fiscal_month_start?: number | null
          hide_balances?: boolean | null
          id?: string
          show_cents?: boolean | null
          updated_at?: string | null
          user_key?: string
        }
        Relationships: []
      }
      finance_subscriptions: {
        Row: {
          amount: number
          cancellation_date: string | null
          cancellation_notes: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          first_billing_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          is_manual: boolean | null
          last_billing_date: string | null
          linked_account_id: string | null
          merchant_name: string
          next_billing_date: string | null
          notes: string | null
          plaid_stream_id: string | null
          previous_amount: number | null
          price_increased: boolean | null
          remind_before_days: number | null
          updated_at: string | null
          user_key: string
          website_url: string | null
        }
        Insert: {
          amount: number
          cancellation_date?: string | null
          cancellation_notes?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          first_billing_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_manual?: boolean | null
          last_billing_date?: string | null
          linked_account_id?: string | null
          merchant_name: string
          next_billing_date?: string | null
          notes?: string | null
          plaid_stream_id?: string | null
          previous_amount?: number | null
          price_increased?: boolean | null
          remind_before_days?: number | null
          updated_at?: string | null
          user_key: string
          website_url?: string | null
        }
        Update: {
          amount?: number
          cancellation_date?: string | null
          cancellation_notes?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          first_billing_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_manual?: boolean | null
          last_billing_date?: string | null
          linked_account_id?: string | null
          merchant_name?: string
          next_billing_date?: string | null
          notes?: string | null
          plaid_stream_id?: string | null
          previous_amount?: number | null
          price_increased?: boolean | null
          remind_before_days?: number | null
          updated_at?: string | null
          user_key?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_subscriptions_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "finance_linked_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount: number
          category: string | null
          category_detailed: string | null
          created_at: string | null
          currency: string | null
          date: string
          id: string
          is_manual: boolean | null
          is_recurring: boolean | null
          linked_account_id: string | null
          location_city: string | null
          location_state: string | null
          merchant_name: string | null
          name: string
          notes: string | null
          payment_channel: string | null
          pending: boolean | null
          plaid_transaction_id: string | null
          project_id: string | null
          receipt_file_id: string | null
          recurring_stream_id: string | null
          tags: string[] | null
          task_id: string | null
          updated_at: string | null
          user_key: string
        }
        Insert: {
          amount: number
          category?: string | null
          category_detailed?: string | null
          created_at?: string | null
          currency?: string | null
          date: string
          id?: string
          is_manual?: boolean | null
          is_recurring?: boolean | null
          linked_account_id?: string | null
          location_city?: string | null
          location_state?: string | null
          merchant_name?: string | null
          name: string
          notes?: string | null
          payment_channel?: string | null
          pending?: boolean | null
          plaid_transaction_id?: string | null
          project_id?: string | null
          receipt_file_id?: string | null
          recurring_stream_id?: string | null
          tags?: string[] | null
          task_id?: string | null
          updated_at?: string | null
          user_key: string
        }
        Update: {
          amount?: number
          category?: string | null
          category_detailed?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string
          id?: string
          is_manual?: boolean | null
          is_recurring?: boolean | null
          linked_account_id?: string | null
          location_city?: string | null
          location_state?: string | null
          merchant_name?: string | null
          name?: string
          notes?: string | null
          payment_channel?: string | null
          pending?: boolean | null
          plaid_transaction_id?: string | null
          project_id?: string | null
          receipt_file_id?: string | null
          recurring_stream_id?: string | null
          tags?: string[] | null
          task_id?: string | null
          updated_at?: string | null
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "finance_linked_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_watchlist: {
        Row: {
          added_at: string | null
          alert_enabled: boolean | null
          id: string
          name: string | null
          notes: string | null
          symbol: string
          target_price_high: number | null
          target_price_low: number | null
          user_key: string
        }
        Insert: {
          added_at?: string | null
          alert_enabled?: boolean | null
          id?: string
          name?: string | null
          notes?: string | null
          symbol: string
          target_price_high?: number | null
          target_price_low?: number | null
          user_key: string
        }
        Update: {
          added_at?: string | null
          alert_enabled?: boolean | null
          id?: string
          name?: string | null
          notes?: string | null
          symbol?: string
          target_price_high?: number | null
          target_price_low?: number | null
          user_key?: string
        }
        Relationships: []
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
          user_id: string | null
          user_key: string | null
          value: number | null
        }
        Insert: {
          completed_at?: string
          habit_id: string
          id?: string
          notes?: string | null
          skipped?: boolean | null
          user_id?: string | null
          user_key?: string | null
          value?: number | null
        }
        Update: {
          completed_at?: string
          habit_id?: string
          id?: string
          notes?: string | null
          skipped?: boolean | null
          user_id?: string | null
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
          duration_minutes: number | null
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
          user_id: string | null
          user_key: string | null
          weekly_frequency: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
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
          user_id?: string | null
          user_key?: string | null
          weekly_frequency?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
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
          user_id?: string | null
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
      inbox_accounts: {
        Row: {
          access_token: string | null
          account_email: string | null
          account_id: string
          account_name: string
          created_at: string
          enabled: boolean
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          provider: Database["public"]["Enums"]["inbox_provider"]
          refresh_token: string | null
          scopes: string[] | null
          sync_cursor: string | null
          token_expires_at: string | null
          updated_at: string
          user_key: string
          webhook_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_email?: string | null
          account_id: string
          account_name: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          provider: Database["public"]["Enums"]["inbox_provider"]
          refresh_token?: string | null
          scopes?: string[] | null
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_key: string
          webhook_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_email?: string | null
          account_id?: string
          account_name?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          provider?: Database["public"]["Enums"]["inbox_provider"]
          refresh_token?: string | null
          scopes?: string[] | null
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_key?: string
          webhook_id?: string | null
        }
        Relationships: []
      }
      inbox_drafts: {
        Row: {
          account_id: string
          ai_generated: boolean
          content: string
          created_at: string
          id: string
          sent: boolean
          sent_at: string | null
          thread_id: string
          updated_at: string
          user_key: string
        }
        Insert: {
          account_id: string
          ai_generated?: boolean
          content: string
          created_at?: string
          id?: string
          sent?: boolean
          sent_at?: string | null
          thread_id: string
          updated_at?: string
          user_key: string
        }
        Update: {
          account_id?: string
          ai_generated?: boolean
          content?: string
          created_at?: string
          id?: string
          sent?: boolean
          sent_at?: string | null
          thread_id?: string
          updated_at?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_drafts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inbox_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_drafts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inbox_accounts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "inbox_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          account_id: string
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          created_at: string
          external_message_id: string
          id: string
          in_reply_to: string | null
          is_outgoing: boolean
          is_read: boolean
          provider: Database["public"]["Enums"]["inbox_provider"]
          received_at: string
          recipients: Json | null
          sender: Json
          sent_at: string
          subject: string | null
          thread_id: string
          user_key: string
        }
        Insert: {
          account_id: string
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          external_message_id: string
          id?: string
          in_reply_to?: string | null
          is_outgoing?: boolean
          is_read?: boolean
          provider: Database["public"]["Enums"]["inbox_provider"]
          received_at?: string
          recipients?: Json | null
          sender: Json
          sent_at: string
          subject?: string | null
          thread_id: string
          user_key: string
        }
        Update: {
          account_id?: string
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          external_message_id?: string
          id?: string
          in_reply_to?: string | null
          is_outgoing?: boolean
          is_read?: boolean
          provider?: Database["public"]["Enums"]["inbox_provider"]
          received_at?: string
          recipients?: Json | null
          sender?: Json
          sent_at?: string
          subject?: string | null
          thread_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inbox_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inbox_accounts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "inbox_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_sync_state: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          messages_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
          threads_synced: number | null
          user_key: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          messages_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          threads_synced?: number | null
          user_key: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          messages_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          threads_synced?: number | null
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_sync_state_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inbox_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_sync_state_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inbox_accounts_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_threads: {
        Row: {
          account_id: string
          created_at: string
          external_thread_id: string
          id: string
          is_archived: boolean
          is_pinned: boolean
          is_starred: boolean
          labels: string[] | null
          last_message_at: string | null
          message_count: number
          participants: Json | null
          provider: Database["public"]["Enums"]["inbox_provider"]
          snippet: string | null
          subject: string | null
          unread_count: number
          updated_at: string
          user_key: string
        }
        Insert: {
          account_id: string
          created_at?: string
          external_thread_id: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          is_starred?: boolean
          labels?: string[] | null
          last_message_at?: string | null
          message_count?: number
          participants?: Json | null
          provider: Database["public"]["Enums"]["inbox_provider"]
          snippet?: string | null
          subject?: string | null
          unread_count?: number
          updated_at?: string
          user_key: string
        }
        Update: {
          account_id?: string
          created_at?: string
          external_thread_id?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          is_starred?: boolean
          labels?: string[] | null
          last_message_at?: string | null
          message_count?: number
          participants?: Json | null
          provider?: Database["public"]["Enums"]["inbox_provider"]
          snippet?: string | null
          subject?: string | null
          unread_count?: number
          updated_at?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_threads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inbox_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_threads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inbox_accounts_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      map_destination_patterns: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          last_visited_at: string
          latitude: number
          longitude: number
          place_address: string | null
          place_id: string | null
          place_name: string
          time_bucket: string
          user_key: string
          visit_count: number
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          last_visited_at?: string
          latitude: number
          longitude: number
          place_address?: string | null
          place_id?: string | null
          place_name: string
          time_bucket: string
          user_key: string
          visit_count?: number
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          last_visited_at?: string
          latitude?: number
          longitude?: number
          place_address?: string | null
          place_id?: string | null
          place_name?: string
          time_bucket?: string
          user_key?: string
          visit_count?: number
        }
        Relationships: []
      }
      map_incident_votes: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          user_key: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          user_key: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          user_key?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_incident_votes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "map_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      map_incidents: {
        Row: {
          created_at: string
          description: string | null
          downvotes: number
          expires_at: string
          id: string
          incident_type: string
          is_active: boolean
          latitude: number
          longitude: number
          upvotes: number
          user_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          downvotes?: number
          expires_at: string
          id?: string
          incident_type: string
          is_active?: boolean
          latitude: number
          longitude: number
          upvotes?: number
          user_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          downvotes?: number
          expires_at?: string
          id?: string
          incident_type?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          upvotes?: number
          user_key?: string
        }
        Relationships: []
      }
      map_recent_searches: {
        Row: {
          id: string
          latitude: number | null
          longitude: number | null
          place_address: string | null
          place_id: string | null
          place_name: string | null
          query: string
          searched_at: string
          user_key: string
        }
        Insert: {
          id?: string
          latitude?: number | null
          longitude?: number | null
          place_address?: string | null
          place_id?: string | null
          place_name?: string | null
          query: string
          searched_at?: string
          user_key: string
        }
        Update: {
          id?: string
          latitude?: number | null
          longitude?: number | null
          place_address?: string | null
          place_id?: string | null
          place_name?: string | null
          query?: string
          searched_at?: string
          user_key?: string
        }
        Relationships: []
      }
      map_user_settings: {
        Row: {
          created_at: string
          default_map_type: string
          id: string
          pattern_learning_enabled: boolean
          show_incidents: boolean
          show_traffic: boolean
          updated_at: string
          user_key: string
        }
        Insert: {
          created_at?: string
          default_map_type?: string
          id?: string
          pattern_learning_enabled?: boolean
          show_incidents?: boolean
          show_traffic?: boolean
          updated_at?: string
          user_key: string
        }
        Update: {
          created_at?: string
          default_map_type?: string
          id?: string
          pattern_learning_enabled?: boolean
          show_incidents?: boolean
          show_traffic?: boolean
          updated_at?: string
          user_key?: string
        }
        Relationships: []
      }
      note_folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          parent_folder_id: string | null
          sort_order: number | null
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          parent_folder_id?: string | null
          sort_order?: number | null
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
          sort_order?: number | null
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          canvas_state: string | null
          created_at: string
          elements: Json | null
          folder_id: string | null
          id: string
          note_type: string
          page_mode: string | null
          pan_x: number
          pan_y: number
          pinned: boolean
          sort_order: number | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string | null
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
          page_mode?: string | null
          pan_x?: number
          pan_y?: number
          pinned?: boolean
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
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
          page_mode?: string | null
          pan_x?: number
          pan_y?: number
          pinned?: boolean
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      project_links: {
        Row: {
          created_at: string
          id: string
          link_type: string
          project_id: string
          title: string
          url: string
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_type?: string
          project_id: string
          title: string
          url: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_type?: string
          project_id?: string
          title?: string
          url?: string
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          id: string
          redeemed_at: string
          reward_id: string
          user_id: string | null
          user_key: string | null
          xp_spent: number
        }
        Insert: {
          id?: string
          redeemed_at?: string
          reward_id: string
          user_id?: string | null
          user_key?: string | null
          xp_spent: number
        }
        Update: {
          id?: string
          redeemed_at?: string
          reward_id?: string
          user_id?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          end_time: string | null
          icon: string | null
          id: string
          name: string
          reminder_enabled: boolean | null
          reminder_minutes_before: number | null
          reminder_sound: string | null
          reminder_type: string | null
          reminder_vibrate: boolean | null
          repeat_interval: number | null
          repeat_unit: string | null
          reward_description: string | null
          routine_type: string | null
          schedule_days: number[] | null
          start_time: string | null
          sunrise_offset_minutes: number | null
          trigger_location_id: string | null
          trigger_type: string | null
          updated_at: string
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          anchor_cue?: string | null
          created_at?: string
          enabled?: boolean
          end_time?: string | null
          icon?: string | null
          id?: string
          name: string
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          reminder_sound?: string | null
          reminder_type?: string | null
          reminder_vibrate?: boolean | null
          repeat_interval?: number | null
          repeat_unit?: string | null
          reward_description?: string | null
          routine_type?: string | null
          schedule_days?: number[] | null
          start_time?: string | null
          sunrise_offset_minutes?: number | null
          trigger_location_id?: string | null
          trigger_type?: string | null
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          anchor_cue?: string | null
          created_at?: string
          enabled?: boolean
          end_time?: string | null
          icon?: string | null
          id?: string
          name?: string
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          reminder_sound?: string | null
          reminder_type?: string | null
          reminder_vibrate?: boolean | null
          repeat_interval?: number | null
          repeat_unit?: string | null
          reward_description?: string | null
          routine_type?: string | null
          schedule_days?: number[] | null
          start_time?: string | null
          sunrise_offset_minutes?: number | null
          trigger_location_id?: string | null
          trigger_type?: string | null
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routines_trigger_location_id_fkey"
            columns: ["trigger_location_id"]
            isOneToOne: false
            referencedRelation: "user_saved_places"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          order_index: number
          task_id: string
          title: string
          updated_at: string
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          order_index?: number
          task_id: string
          title: string
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          order_index?: number
          task_id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          done: boolean
          due_date: string | null
          energy_level: string | null
          id: string
          order_index: number | null
          priority: number
          project_id: string | null
          scheduled_date: string | null
          time_estimate_minutes: number | null
          title: string
          updated_at: string
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          energy_level?: string | null
          id?: string
          order_index?: number | null
          priority?: number
          project_id?: string | null
          scheduled_date?: string | null
          time_estimate_minutes?: number | null
          title: string
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          energy_level?: string | null
          id?: string
          order_index?: number | null
          priority?: number
          project_id?: string | null
          scheduled_date?: string | null
          time_estimate_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          actual_duration_minutes: number | null
          block_type: string
          calendar_event_id: string | null
          created_at: string
          end_time: string
          id: string
          is_completed: boolean
          notes: string | null
          start_time: string
          task_id: string | null
          updated_at: string
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          block_type?: string
          calendar_event_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          start_time: string
          task_id?: string | null
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          block_type?: string
          calendar_event_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          start_time?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_destinations: {
        Row: {
          address: string | null
          arrival_date: string | null
          created_at: string
          currency: string | null
          departure_date: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          order_index: number
          place_id: string | null
          timezone: string | null
          trip_id: string
          user_key: string
        }
        Insert: {
          address?: string | null
          arrival_date?: string | null
          created_at?: string
          currency?: string | null
          departure_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          order_index?: number
          place_id?: string | null
          timezone?: string | null
          trip_id: string
          user_key: string
        }
        Update: {
          address?: string | null
          arrival_date?: string | null
          created_at?: string
          currency?: string | null
          departure_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          order_index?: number
          place_id?: string | null
          timezone?: string | null
          trip_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_destinations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_expenses: {
        Row: {
          amount: number
          amount_home_currency: number | null
          category: string
          created_at: string
          currency: string
          description: string
          expense_date: string | null
          id: string
          is_planned: boolean
          itinerary_item_id: string | null
          paid_by: string | null
          trip_id: string
          user_key: string
        }
        Insert: {
          amount: number
          amount_home_currency?: number | null
          category: string
          created_at?: string
          currency?: string
          description: string
          expense_date?: string | null
          id?: string
          is_planned?: boolean
          itinerary_item_id?: string | null
          paid_by?: string | null
          trip_id: string
          user_key: string
        }
        Update: {
          amount?: number
          amount_home_currency?: number | null
          category?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string | null
          id?: string
          is_planned?: boolean
          itinerary_item_id?: string | null
          paid_by?: string | null
          trip_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_expenses_itinerary_item_id_fkey"
            columns: ["itinerary_item_id"]
            isOneToOne: false
            referencedRelation: "trip_itinerary_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_flight_searches: {
        Row: {
          adults: number | null
          departure_date: string
          destination: string
          id: string
          is_nonstop: boolean | null
          max_price: number | null
          origin: string
          results: Json | null
          return_date: string | null
          searched_at: string
          trip_id: string
          user_key: string
        }
        Insert: {
          adults?: number | null
          departure_date: string
          destination: string
          id?: string
          is_nonstop?: boolean | null
          max_price?: number | null
          origin: string
          results?: Json | null
          return_date?: string | null
          searched_at?: string
          trip_id: string
          user_key: string
        }
        Update: {
          adults?: number | null
          departure_date?: string
          destination?: string
          id?: string
          is_nonstop?: boolean | null
          max_price?: number | null
          origin?: string
          results?: Json | null
          return_date?: string | null
          searched_at?: string
          trip_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_flight_searches_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itinerary_items: {
        Row: {
          calendar_event_id: string | null
          confirmation_code: string | null
          cost: number | null
          cost_currency: string | null
          created_at: string
          description: string | null
          destination_id: string | null
          end_time: string | null
          id: string
          item_type: string
          latitude: number | null
          links: string[] | null
          location_address: string | null
          location_name: string | null
          longitude: number | null
          notes: string | null
          order_index: number
          place_id: string | null
          reservation_id: string | null
          start_time: string
          timezone: string | null
          title: string
          trip_id: string
          updated_at: string
          user_key: string
        }
        Insert: {
          calendar_event_id?: string | null
          confirmation_code?: string | null
          cost?: number | null
          cost_currency?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string | null
          end_time?: string | null
          id?: string
          item_type: string
          latitude?: number | null
          links?: string[] | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          notes?: string | null
          order_index?: number
          place_id?: string | null
          reservation_id?: string | null
          start_time: string
          timezone?: string | null
          title: string
          trip_id: string
          updated_at?: string
          user_key: string
        }
        Update: {
          calendar_event_id?: string | null
          confirmation_code?: string | null
          cost?: number | null
          cost_currency?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string | null
          end_time?: string | null
          id?: string
          item_type?: string
          latitude?: number | null
          links?: string[] | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          notes?: string | null
          order_index?: number
          place_id?: string | null
          reservation_id?: string | null
          start_time?: string
          timezone?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_items_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_itinerary_items_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "trip_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_reservations: {
        Row: {
          confirmation_code: string | null
          cost: number | null
          cost_currency: string | null
          created_at: string
          end_date: string | null
          id: string
          import_source: string | null
          is_imported: boolean | null
          itinerary_item_id: string | null
          location: string | null
          parsed_data: Json | null
          provider: string | null
          raw_text: string | null
          reservation_type: string
          start_date: string | null
          trip_id: string
          updated_at: string
          user_key: string
        }
        Insert: {
          confirmation_code?: string | null
          cost?: number | null
          cost_currency?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          import_source?: string | null
          is_imported?: boolean | null
          itinerary_item_id?: string | null
          location?: string | null
          parsed_data?: Json | null
          provider?: string | null
          raw_text?: string | null
          reservation_type: string
          start_date?: string | null
          trip_id: string
          updated_at?: string
          user_key: string
        }
        Update: {
          confirmation_code?: string | null
          cost?: number | null
          cost_currency?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          import_source?: string | null
          is_imported?: boolean | null
          itinerary_item_id?: string | null
          location?: string | null
          parsed_data?: Json | null
          provider?: string | null
          raw_text?: string | null
          reservation_type?: string
          start_date?: string | null
          trip_id?: string
          updated_at?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_reservations_itinerary_item_id_fkey"
            columns: ["itinerary_item_id"]
            isOneToOne: false
            referencedRelation: "trip_itinerary_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reservations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_saved_flights: {
        Row: {
          created_at: string
          flight_data: Json
          id: string
          is_selected: boolean | null
          notes: string | null
          trip_id: string
          user_key: string
        }
        Insert: {
          created_at?: string
          flight_data: Json
          id?: string
          is_selected?: boolean | null
          notes?: string | null
          trip_id: string
          user_key: string
        }
        Update: {
          created_at?: string
          flight_data?: Json
          id?: string
          is_selected?: boolean | null
          notes?: string | null
          trip_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_saved_flights_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_saved_places: {
        Row: {
          address: string | null
          collection: string | null
          created_at: string
          distance_from_lodging: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          notes: string | null
          photo_url: string | null
          place_id: string | null
          place_types: string[] | null
          rating: number | null
          travel_time_from_lodging: string | null
          trip_id: string
          user_key: string
        }
        Insert: {
          address?: string | null
          collection?: string | null
          created_at?: string
          distance_from_lodging?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          notes?: string | null
          photo_url?: string | null
          place_id?: string | null
          place_types?: string[] | null
          rating?: number | null
          travel_time_from_lodging?: string | null
          trip_id: string
          user_key: string
        }
        Update: {
          address?: string | null
          collection?: string | null
          created_at?: string
          distance_from_lodging?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          notes?: string | null
          photo_url?: string | null
          place_id?: string | null
          place_types?: string[] | null
          rating?: number | null
          travel_time_from_lodging?: string | null
          trip_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_saved_places_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_travelers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_owner: boolean
          name: string
          trip_id: string
          user_key: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_owner?: boolean
          name: string
          trip_id: string
          user_key: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_owner?: boolean
          name?: string
          trip_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          end_date: string
          home_airport: string | null
          home_currency: string | null
          id: string
          name: string
          project_id: string | null
          start_date: string
          status: string
          updated_at: string
          user_key: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          home_airport?: string | null
          home_currency?: string | null
          id?: string
          name: string
          project_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_key: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          home_airport?: string | null
          home_currency?: string | null
          id?: string
          name?: string
          project_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: []
      }
      user_saved_places: {
        Row: {
          address: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          place_id: string | null
          place_type: string
          updated_at: string
          user_key: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          place_id?: string | null
          place_type: string
          updated_at?: string
          user_key: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          place_id?: string | null
          place_type?: string
          updated_at?: string
          user_key?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          analytics_enabled: boolean
          api_endpoint: string | null
          api_token: string | null
          created_at: string
          dashboard_module_layouts: Json
          dashboard_module_visibility: Json | null
          data_collection_enabled: boolean
          email_notifications_enabled: boolean
          encryption_enabled: boolean
          id: string
          learning_mode_enabled: boolean
          morning_wakeup_enabled: boolean | null
          morning_wakeup_time: string | null
          proactive_suggestions_enabled: boolean
          push_notifications_enabled: boolean
          sound_enabled: boolean
          theme: string
          updated_at: string
          user_id: string | null
          user_key: string | null
          voice_responses_enabled: boolean
        }
        Insert: {
          analytics_enabled?: boolean
          api_endpoint?: string | null
          api_token?: string | null
          created_at?: string
          dashboard_module_layouts?: Json
          dashboard_module_visibility?: Json | null
          data_collection_enabled?: boolean
          email_notifications_enabled?: boolean
          encryption_enabled?: boolean
          id?: string
          learning_mode_enabled?: boolean
          morning_wakeup_enabled?: boolean | null
          morning_wakeup_time?: string | null
          proactive_suggestions_enabled?: boolean
          push_notifications_enabled?: boolean
          sound_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
          voice_responses_enabled?: boolean
        }
        Update: {
          analytics_enabled?: boolean
          api_endpoint?: string | null
          api_token?: string | null
          created_at?: string
          dashboard_module_layouts?: Json
          dashboard_module_visibility?: Json | null
          data_collection_enabled?: boolean
          email_notifications_enabled?: boolean
          encryption_enabled?: boolean
          id?: string
          learning_mode_enabled?: boolean
          morning_wakeup_enabled?: boolean | null
          morning_wakeup_time?: string | null
          proactive_suggestions_enabled?: boolean
          push_notifications_enabled?: boolean
          sound_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id?: string | null
          user_key?: string | null
          voice_responses_enabled?: boolean
        }
        Relationships: []
      }
      voice_settings: {
        Row: {
          auto_send_on_silence: boolean | null
          cartesia_api_key: string | null
          cartesia_model: string | null
          cartesia_voice_id: string | null
          created_at: string
          id: string
          silence_timeout_ms: number | null
          updated_at: string
          user_key: string
          voice_mode_enabled: boolean | null
          wake_word_enabled: boolean | null
          wake_word_phrase: string | null
        }
        Insert: {
          auto_send_on_silence?: boolean | null
          cartesia_api_key?: string | null
          cartesia_model?: string | null
          cartesia_voice_id?: string | null
          created_at?: string
          id?: string
          silence_timeout_ms?: number | null
          updated_at?: string
          user_key: string
          voice_mode_enabled?: boolean | null
          wake_word_enabled?: boolean | null
          wake_word_phrase?: string | null
        }
        Update: {
          auto_send_on_silence?: boolean | null
          cartesia_api_key?: string | null
          cartesia_model?: string | null
          cartesia_voice_id?: string | null
          created_at?: string
          id?: string
          silence_timeout_ms?: number | null
          updated_at?: string
          user_key?: string
          voice_mode_enabled?: boolean | null
          wake_word_enabled?: boolean | null
          wake_word_phrase?: string | null
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
          user_id: string | null
          user_key: string | null
          xp_amount: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          reference_id?: string | null
          user_id?: string | null
          user_key?: string | null
          xp_amount: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          reference_id?: string | null
          user_id?: string | null
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
      drive_accounts_safe: {
        Row: {
          account_email: string | null
          account_name: string | null
          created_at: string | null
          enabled: boolean | null
          id: string | null
          is_connected: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          root_folder_id: string | null
          storage_quota_total: number | null
          storage_quota_used: number | null
          updated_at: string | null
          user_key: string | null
        }
        Insert: {
          account_email?: string | null
          account_name?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          is_connected?: never
          last_sync_at?: string | null
          last_sync_error?: string | null
          root_folder_id?: string | null
          storage_quota_total?: number | null
          storage_quota_used?: number | null
          updated_at?: string | null
          user_key?: string | null
        }
        Update: {
          account_email?: string | null
          account_name?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          is_connected?: never
          last_sync_at?: string | null
          last_sync_error?: string | null
          root_folder_id?: string | null
          storage_quota_total?: number | null
          storage_quota_used?: number | null
          updated_at?: string | null
          user_key?: string | null
        }
        Relationships: []
      }
      inbox_accounts_safe: {
        Row: {
          account_email: string | null
          account_id: string | null
          account_name: string | null
          created_at: string | null
          enabled: boolean | null
          id: string | null
          last_sync_at: string | null
          last_sync_error: string | null
          provider: Database["public"]["Enums"]["inbox_provider"] | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string | null
          user_key: string | null
        }
        Insert: {
          account_email?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          provider?: Database["public"]["Enums"]["inbox_provider"] | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_key?: string | null
        }
        Update: {
          account_email?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          provider?: Database["public"]["Enums"]["inbox_provider"] | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_key?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      inbox_provider:
        | "gmail"
        | "outlook"
        | "teams"
        | "whatsapp"
        | "telegram"
        | "instagram"
        | "linkedin"
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
      inbox_provider: [
        "gmail",
        "outlook",
        "teams",
        "whatsapp",
        "telegram",
        "instagram",
        "linkedin",
      ],
    },
  },
} as const
