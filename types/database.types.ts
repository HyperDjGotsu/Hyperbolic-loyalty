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
      daily_spins: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          result_description: string | null
          result_rarity: string | null
          result_xp: number
          spin_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          result_description?: string | null
          result_rarity?: string | null
          result_xp: number
          spin_date?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          result_description?: string | null
          result_rarity?: string | null
          result_xp?: number
          spin_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_spins_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      emperors: {
        Row: {
          berries: number | null
          bounty_display: string | null
          crowned_at: string | null
          crowned_by: string | null
          game_id: string
          id: string
          month: string
          month_label: string
          monthly_xp: number
          player_id: string
          player_name: string
        }
        Insert: {
          berries?: number | null
          bounty_display?: string | null
          crowned_at?: string | null
          crowned_by?: string | null
          game_id: string
          id?: string
          month: string
          month_label: string
          monthly_xp: number
          player_id: string
          player_name: string
        }
        Update: {
          berries?: number | null
          bounty_display?: string | null
          crowned_at?: string | null
          crowned_by?: string | null
          game_id?: string
          id?: string
          month?: string
          month_label?: string
          monthly_xp?: number
          player_id?: string
          player_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "emperors_crowned_by_fkey"
            columns: ["crowned_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emperors_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emperors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          checked_in_at: string | null
          event_id: string
          final_standing: number | null
          id: string
          is_undefeated: boolean | null
          losses: number | null
          player_id: string
          wins: number | null
          xp_awarded: number | null
        }
        Insert: {
          checked_in_at?: string | null
          event_id: string
          final_standing?: number | null
          id?: string
          is_undefeated?: boolean | null
          losses?: number | null
          player_id: string
          wins?: number | null
          xp_awarded?: number | null
        }
        Update: {
          checked_in_at?: string | null
          event_id?: string
          final_standing?: number | null
          id?: string
          is_undefeated?: boolean | null
          losses?: number | null
          player_id?: string
          wins?: number | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendance_xp: number | null
          created_at: string | null
          current_players: number | null
          description: string | null
          ends_at: string | null
          entry_fee: number | null
          game_id: string | null
          has_stream: boolean | null
          id: string
          max_players: number | null
          name: string
          pass_free_entry: boolean | null
          scheduled_at: string
          status: Database["public"]["Enums"]["event_status"] | null
          twitch_url: string | null
          updated_at: string | null
          win_xp: number | null
          youtube_url: string | null
        }
        Insert: {
          attendance_xp?: number | null
          created_at?: string | null
          current_players?: number | null
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          game_id?: string | null
          has_stream?: boolean | null
          id?: string
          max_players?: number | null
          name: string
          pass_free_entry?: boolean | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["event_status"] | null
          twitch_url?: string | null
          updated_at?: string | null
          win_xp?: number | null
          youtube_url?: string | null
        }
        Update: {
          attendance_xp?: number | null
          created_at?: string | null
          current_players?: number | null
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          game_id?: string | null
          has_stream?: boolean | null
          id?: string
          max_players?: number | null
          name?: string
          pass_free_entry?: boolean | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          twitch_url?: string | null
          updated_at?: string | null
          win_xp?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friend_status"] | null
          updated_at: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friend_status"] | null
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friend_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          color: string
          created_at: string | null
          currency_name: string
          frequency: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          pass_slots_total: number | null
        }
        Insert: {
          color: string
          created_at?: string | null
          currency_name: string
          frequency?: string | null
          icon: string
          id: string
          is_active?: boolean | null
          name: string
          pass_slots_total?: number | null
        }
        Update: {
          color?: string
          created_at?: string | null
          currency_name?: string
          frequency?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          pass_slots_total?: number | null
        }
        Relationships: []
      }
      pass_history: {
        Row: {
          amount_paid: number | null
          change_reason: string | null
          created_at: string | null
          discount_percent: number | null
          games: string[] | null
          id: string
          period_end: string
          period_start: string
          player_id: string
          status: Database["public"]["Enums"]["pass_status"]
          stripe_invoice_id: string | null
          tier: Database["public"]["Enums"]["pass_tier"]
        }
        Insert: {
          amount_paid?: number | null
          change_reason?: string | null
          created_at?: string | null
          discount_percent?: number | null
          games?: string[] | null
          id?: string
          period_end: string
          period_start: string
          player_id: string
          status: Database["public"]["Enums"]["pass_status"]
          stripe_invoice_id?: string | null
          tier: Database["public"]["Enums"]["pass_tier"]
        }
        Update: {
          amount_paid?: number | null
          change_reason?: string | null
          created_at?: string | null
          discount_percent?: number | null
          games?: string[] | null
          id?: string
          period_end?: string
          period_start?: string
          player_id?: string
          status?: Database["public"]["Enums"]["pass_status"]
          stripe_invoice_id?: string | null
          tier?: Database["public"]["Enums"]["pass_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "pass_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          allow_friend_requests: boolean | null
          allow_messages:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          avatar_background: string | null
          avatar_badge: string | null
          avatar_base: string | null
          avatar_frame: string | null
          avatar_photo_url: string | null
          avatar_type: string | null
          clerk_user_id: string | null
          created_at: string | null
          discord_username: string | null
          display_name: string
          email: string | null
          id: string
          is_banned: boolean | null
          is_founding_member: boolean | null
          is_shadow_vip: boolean | null
          is_staff: boolean | null
          last_check_in_at: string | null
          last_seen_at: string | null
          pass_billing_anchor: number | null
          pass_expires_at: string | null
          pass_games: string[] | null
          pass_started_at: string | null
          pass_status: Database["public"]["Enums"]["pass_status"] | null
          pass_tier: Database["public"]["Enums"]["pass_tier"] | null
          phone: string | null
          player_id: string
          primary_game_id: string | null
          profile_visibility:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          real_name: string | null
          shopify_customer_id: string | null
          show_activity: boolean | null
          show_games: boolean | null
          show_on_leaderboard: boolean | null
          show_real_name: boolean | null
          show_stats: boolean | null
          square_customer_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          allow_friend_requests?: boolean | null
          allow_messages?:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          avatar_background?: string | null
          avatar_badge?: string | null
          avatar_base?: string | null
          avatar_frame?: string | null
          avatar_photo_url?: string | null
          avatar_type?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          discord_username?: string | null
          display_name: string
          email?: string | null
          id?: string
          is_banned?: boolean | null
          is_founding_member?: boolean | null
          is_shadow_vip?: boolean | null
          is_staff?: boolean | null
          last_check_in_at?: string | null
          last_seen_at?: string | null
          pass_billing_anchor?: number | null
          pass_expires_at?: string | null
          pass_games?: string[] | null
          pass_started_at?: string | null
          pass_status?: Database["public"]["Enums"]["pass_status"] | null
          pass_tier?: Database["public"]["Enums"]["pass_tier"] | null
          phone?: string | null
          player_id: string
          primary_game_id?: string | null
          profile_visibility?:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          real_name?: string | null
          shopify_customer_id?: string | null
          show_activity?: boolean | null
          show_games?: boolean | null
          show_on_leaderboard?: boolean | null
          show_real_name?: boolean | null
          show_stats?: boolean | null
          square_customer_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_friend_requests?: boolean | null
          allow_messages?:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          avatar_background?: string | null
          avatar_badge?: string | null
          avatar_base?: string | null
          avatar_frame?: string | null
          avatar_photo_url?: string | null
          avatar_type?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          discord_username?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_banned?: boolean | null
          is_founding_member?: boolean | null
          is_shadow_vip?: boolean | null
          is_staff?: boolean | null
          last_check_in_at?: string | null
          last_seen_at?: string | null
          pass_billing_anchor?: number | null
          pass_expires_at?: string | null
          pass_games?: string[] | null
          pass_started_at?: string | null
          pass_status?: Database["public"]["Enums"]["pass_status"] | null
          pass_tier?: Database["public"]["Enums"]["pass_tier"] | null
          phone?: string | null
          player_id?: string
          primary_game_id?: string | null
          profile_visibility?:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          real_name?: string | null
          shopify_customer_id?: string | null
          show_activity?: boolean | null
          show_games?: boolean | null
          show_on_leaderboard?: boolean | null
          show_real_name?: boolean | null
          show_stats?: boolean | null
          square_customer_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_primary_game_id_fkey"
            columns: ["primary_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      preorder_claims: {
        Row: {
          claimed_at: string | null
          id: string
          pass_tier_at_claim: Database["public"]["Enums"]["pass_tier"]
          player_id: string
          price_per_unit: number
          product_id: string
          quantity: number
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          pass_tier_at_claim: Database["public"]["Enums"]["pass_tier"]
          player_id: string
          price_per_unit: number
          product_id: string
          quantity: number
        }
        Update: {
          claimed_at?: string | null
          id?: string
          pass_tier_at_claim?: Database["public"]["Enums"]["pass_tier"]
          player_id?: string
          price_per_unit?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "preorder_claims_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preorder_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "preorder_products"
            referencedColumns: ["id"]
          },
        ]
      }
      preorder_products: {
        Row: {
          bonus_access: number | null
          bonus_all_access: number | null
          bonus_none: number | null
          bonus_player: number | null
          bonus_shadow_vip: number | null
          created_at: string | null
          game_id: string | null
          id: string
          name: string
          price_access: number | null
          price_all_access: number | null
          price_none: number | null
          price_player: number | null
          price_shadow_vip: number | null
          release_date: string | null
          remaining_allocation: number | null
          total_allocation: number | null
        }
        Insert: {
          bonus_access?: number | null
          bonus_all_access?: number | null
          bonus_none?: number | null
          bonus_player?: number | null
          bonus_shadow_vip?: number | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          name: string
          price_access?: number | null
          price_all_access?: number | null
          price_none?: number | null
          price_player?: number | null
          price_shadow_vip?: number | null
          release_date?: string | null
          remaining_allocation?: number | null
          total_allocation?: number | null
        }
        Update: {
          bonus_access?: number | null
          bonus_all_access?: number | null
          bonus_none?: number | null
          bonus_player?: number | null
          bonus_shadow_vip?: number | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          name?: string
          price_access?: number | null
          price_all_access?: number | null
          price_none?: number | null
          price_player?: number | null
          price_shadow_vip?: number | null
          release_date?: string | null
          remaining_allocation?: number | null
          total_allocation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preorder_products_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_thresholds: {
        Row: {
          game_id: string | null
          id: number
          min_xp: number
          sort_order: number
          title: string
        }
        Insert: {
          game_id?: string | null
          id?: number
          min_xp: number
          sort_order: number
          title: string
        }
        Update: {
          game_id?: string | null
          id?: number
          min_xp?: number
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_thresholds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          currency: string | null
          external_id: string
          id: string
          items: Json | null
          location: string | null
          player_id: string | null
          source: string
          synced_at: string | null
          transacted_at: string
          xp_awarded: number | null
          xp_ledger_id: string | null
        }
        Insert: {
          amount: number
          currency?: string | null
          external_id: string
          id?: string
          items?: Json | null
          location?: string | null
          player_id?: string | null
          source: string
          synced_at?: string | null
          transacted_at: string
          xp_awarded?: number | null
          xp_ledger_id?: string | null
        }
        Update: {
          amount?: number
          currency?: string | null
          external_id?: string
          id?: string
          items?: Json | null
          location?: string | null
          player_id?: string | null
          source?: string
          synced_at?: string | null
          transacted_at?: string
          xp_awarded?: number | null
          xp_ledger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_xp_ledger_id_fkey"
            columns: ["xp_ledger_id"]
            isOneToOne: false
            referencedRelation: "xp_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_ledger: {
        Row: {
          awarded_by: string | null
          base_xp: number
          created_at: string | null
          description: string | null
          event_id: string | null
          final_xp: number
          game_id: string | null
          id: string
          multiplier: number | null
          player_id: string
          source: Database["public"]["Enums"]["xp_source"]
          transaction_id: string | null
        }
        Insert: {
          awarded_by?: string | null
          base_xp: number
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          final_xp: number
          game_id?: string | null
          id?: string
          multiplier?: number | null
          player_id: string
          source: Database["public"]["Enums"]["xp_source"]
          transaction_id?: string | null
        }
        Update: {
          awarded_by?: string | null
          base_xp?: number
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          final_xp?: number
          game_id?: string | null
          id?: string
          multiplier?: number | null
          player_id?: string
          source?: Database["public"]["Enums"]["xp_source"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_ledger_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_ledger_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_ledger_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      player_game_xp: {
        Row: {
          game_events: number | null
          game_id: string | null
          game_wins: number | null
          game_xp: number | null
          player_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_ledger_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_ledger_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_monthly_xp: {
        Row: {
          game_id: string | null
          month: string | null
          monthly_xp: number | null
          player_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_ledger_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_ledger_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_xp_totals: {
        Row: {
          player_id: string | null
          total_events: number | null
          total_wins: number | null
          total_xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_ledger_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      award_xp: {
        Args: {
          p_awarded_by?: string
          p_base_xp: number
          p_description?: string
          p_event_id?: string
          p_game_id?: string
          p_player_id: string
          p_source: Database["public"]["Enums"]["xp_source"]
        }
        Returns: string
      }
      get_pass_multiplier: { Args: { p_player_id: string }; Returns: number }
      get_player_rank: {
        Args: { p_game_id: string; p_player_id: string }
        Returns: string
      }
      get_xp_discount: { Args: { p_player_id: string }; Returns: number }
      refresh_xp_aggregates: { Args: never; Returns: undefined }
    }
    Enums: {
      event_status: "scheduled" | "active" | "completed" | "cancelled"
      friend_status: "pending" | "accepted" | "blocked"
      pass_status: "active" | "grace_period" | "cancelled" | "expired"
      pass_tier: "none" | "access" | "player" | "all_access" | "shadow_vip"
      privacy_visibility: "public" | "friends" | "private"
      xp_source:
        | "event_attendance"
        | "match_win"
        | "undefeated_bonus"
        | "referral"
        | "purchase"
        | "daily_spin"
        | "achievement"
        | "manual_adjustment"
        | "bonus_event"
        | "community_contribution"
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
      event_status: ["scheduled", "active", "completed", "cancelled"],
      friend_status: ["pending", "accepted", "blocked"],
      pass_status: ["active", "grace_period", "cancelled", "expired"],
      pass_tier: ["none", "access", "player", "all_access", "shadow_vip"],
      privacy_visibility: ["public", "friends", "private"],
      xp_source: [
        "event_attendance",
        "match_win",
        "undefeated_bonus",
        "referral",
        "purchase",
        "daily_spin",
        "achievement",
        "manual_adjustment",
        "bonus_event",
        "community_contribution",
      ],
    },
  },
} as const
