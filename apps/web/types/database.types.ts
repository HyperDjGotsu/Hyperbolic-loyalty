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
      app_users: {
        Row: {
          clerk_user_id: string
          created_at: string
          email: string | null
          id: string
          real_name: string | null
          updated_at: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          email?: string | null
          id?: string
          real_name?: string | null
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          email?: string | null
          id?: string
          real_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          background_image: string | null
          badge: string | null
          bg_position: string
          bg_size: string
          color_from: string | null
          color_to: string | null
          created_at: string | null
          ends_at: string | null
          event_id: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          starts_at: string | null
          store_id: string | null
          subtitle: string | null
          text_color: string | null
          title: string
          twitch_url: string | null
          youtube_url: string | null
        }
        Insert: {
          background_image?: string | null
          badge?: string | null
          bg_position?: string
          bg_size?: string
          color_from?: string | null
          color_to?: string | null
          created_at?: string | null
          ends_at?: string | null
          event_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          starts_at?: string | null
          store_id?: string | null
          subtitle?: string | null
          text_color?: string | null
          title: string
          twitch_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          background_image?: string | null
          badge?: string | null
          bg_position?: string
          bg_size?: string
          color_from?: string | null
          color_to?: string | null
          created_at?: string | null
          ends_at?: string | null
          event_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          starts_at?: string | null
          store_id?: string | null
          subtitle?: string | null
          text_color?: string | null
          title?: string
          twitch_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bounty_hunter_events: {
        Row: {
          created_at: string | null
          event_date: string
          id: string
          month_key: string
          opt_in_closes_at: string
          opt_in_opens_at: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_date: string
          id?: string
          month_key: string
          opt_in_closes_at: string
          opt_in_opens_at: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_date?: string
          id?: string
          month_key?: string
          opt_in_closes_at?: string
          opt_in_opens_at?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bounty_hunter_matches: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          loser_id: string | null
          loser_points: number
          match_type: string
          recorded_by: string | null
          round: number | null
          winner_id: string | null
          winner_points: number
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          loser_id?: string | null
          loser_points: number
          match_type: string
          recorded_by?: string | null
          round?: number | null
          winner_id?: string | null
          winner_points: number
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          loser_id?: string | null
          loser_points?: number
          match_type?: string
          recorded_by?: string | null
          round?: number | null
          winner_id?: string | null
          winner_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "bounty_hunter_matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "bounty_hunter_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_hunter_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_hunter_matches_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_hunter_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      bounty_hunter_participants: {
        Row: {
          event_id: string | null
          id: string
          opted_in_at: string | null
          player_id: string | null
          role: string
        }
        Insert: {
          event_id?: string | null
          id?: string
          opted_in_at?: string | null
          player_id?: string | null
          role: string
        }
        Update: {
          event_id?: string | null
          id?: string
          opted_in_at?: string | null
          player_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "bounty_hunter_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "bounty_hunter_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_hunter_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          id: string
          message: string
          notification_type: string
          player_count: number
          scope: string
          sent_by_clerk_id: string
          store_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          notification_type?: string
          player_count?: number
          scope: string
          sent_by_clerk_id: string
          store_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          notification_type?: string
          player_count?: number
          scope?: string
          sent_by_clerk_id?: string
          store_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      card_of_the_day_history: {
        Row: {
          card_data: Json
          card_name: string
          card_number: string | null
          created_at: string | null
          featured_date: string
          game_display: string
          game_id: string
          id: string
          pool_card_id: string | null
          source: string
          total_votes: number | null
          winning_votes: number | null
        }
        Insert: {
          card_data: Json
          card_name: string
          card_number?: string | null
          created_at?: string | null
          featured_date: string
          game_display: string
          game_id: string
          id?: string
          pool_card_id?: string | null
          source?: string
          total_votes?: number | null
          winning_votes?: number | null
        }
        Update: {
          card_data?: Json
          card_name?: string
          card_number?: string | null
          created_at?: string | null
          featured_date?: string
          game_display?: string
          game_id?: string
          id?: string
          pool_card_id?: string | null
          source?: string
          total_votes?: number | null
          winning_votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_of_the_day_history_pool_card_id_fkey"
            columns: ["pool_card_id"]
            isOneToOne: false
            referencedRelation: "card_of_the_day_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      card_of_the_day_pool: {
        Row: {
          card_data: Json
          card_name: string
          card_number: string | null
          created_at: string | null
          featured_date: string | null
          game_display: string
          game_id: string
          id: string
          nominated_at: string | null
          nominated_by: string | null
          status: string
          updated_at: string | null
          vote_date: string | null
          votes_count: number | null
        }
        Insert: {
          card_data: Json
          card_name: string
          card_number?: string | null
          created_at?: string | null
          featured_date?: string | null
          game_display: string
          game_id: string
          id?: string
          nominated_at?: string | null
          nominated_by?: string | null
          status?: string
          updated_at?: string | null
          vote_date?: string | null
          votes_count?: number | null
        }
        Update: {
          card_data?: Json
          card_name?: string
          card_number?: string | null
          created_at?: string | null
          featured_date?: string | null
          game_display?: string
          game_id?: string
          id?: string
          nominated_at?: string | null
          nominated_by?: string | null
          status?: string
          updated_at?: string | null
          vote_date?: string | null
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_of_the_day_pool_nominated_by_fkey"
            columns: ["nominated_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      card_of_the_day_votes: {
        Row: {
          id: string
          player_id: string
          pool_card_id: string
          vote_date: string
          voted_at: string | null
          won: boolean | null
          xp_awarded: boolean | null
        }
        Insert: {
          id?: string
          player_id: string
          pool_card_id: string
          vote_date: string
          voted_at?: string | null
          won?: boolean | null
          xp_awarded?: boolean | null
        }
        Update: {
          id?: string
          player_id?: string
          pool_card_id?: string
          vote_date?: string
          voted_at?: string | null
          won?: boolean | null
          xp_awarded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "card_of_the_day_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_of_the_day_votes_pool_card_id_fkey"
            columns: ["pool_card_id"]
            isOneToOne: false
            referencedRelation: "card_of_the_day_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      circuit_qualifiers: {
        Row: {
          championship_event_id: string | null
          has_bye: boolean | null
          id: string
          placement: number
          player_id: string | null
          qualified_at: string | null
          qualifier_event_id: string
          store_id: string | null
        }
        Insert: {
          championship_event_id?: string | null
          has_bye?: boolean | null
          id?: string
          placement: number
          player_id?: string | null
          qualified_at?: string | null
          qualifier_event_id: string
          store_id?: string | null
        }
        Update: {
          championship_event_id?: string | null
          has_bye?: boolean | null
          id?: string
          placement?: number
          player_id?: string | null
          qualified_at?: string | null
          qualifier_event_id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circuit_qualifiers_championship_event_id_fkey"
            columns: ["championship_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuit_qualifiers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuit_qualifiers_qualifier_event_id_fkey"
            columns: ["qualifier_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuit_qualifiers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_spins: {
        Row: {
          created_at: string | null
          id: string
          player_id: string | null
          result_description: string | null
          result_rarity: string | null
          result_xp: number
          spin_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id?: string | null
          result_description?: string | null
          result_rarity?: string | null
          result_xp: number
          spin_date?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string | null
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
      economy_config: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          rationale: string | null
          version: number
        }
        Insert: {
          config: Json
          created_at?: string
          created_by?: string | null
          id?: string
          rationale?: string | null
          version?: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          rationale?: string | null
          version?: number
        }
        Relationships: []
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
          player_id: string | null
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
          player_id?: string | null
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
          player_id?: string | null
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
      event_attendances: {
        Row: {
          checked_in_at: string
          event_id: string
          game_id: string | null
          id: string
          player_id: string | null
          xp_awarded: number
        }
        Insert: {
          checked_in_at?: string
          event_id: string
          game_id?: string | null
          id?: string
          player_id?: string | null
          xp_awarded?: number
        }
        Update: {
          checked_in_at?: string
          event_id?: string
          game_id?: string | null
          id?: string
          player_id?: string | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_attendances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      event_interest: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          player_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          player_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_interest_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interest_player_id_fkey"
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
          event_type: string
          game_id: string | null
          gcal_uid: string | null
          has_stream: boolean | null
          id: string
          max_players: number | null
          name: string
          pass_free_entry: boolean | null
          prizing: string[] | null
          scheduled_at: string
          status: Database["public"]["Enums"]["event_status"] | null
          store_id: string
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
          event_type?: string
          game_id?: string | null
          gcal_uid?: string | null
          has_stream?: boolean | null
          id?: string
          max_players?: number | null
          name: string
          pass_free_entry?: boolean | null
          prizing?: string[] | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["event_status"] | null
          store_id: string
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
          event_type?: string
          game_id?: string | null
          gcal_uid?: string | null
          has_stream?: boolean | null
          id?: string
          max_players?: number | null
          name?: string
          pass_free_entry?: boolean | null
          prizing?: string[] | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          store_id?: string
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
          {
            foreignKeyName: "events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expo_push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string | null
          player_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string | null
          player_id: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string | null
          player_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expo_push_tokens_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
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
      network_settings: {
        Row: {
          id: number
          network_name: string
          player_id_prefix: string
          updated_at: string
        }
        Insert: {
          id?: number
          network_name?: string
          player_id_prefix?: string
          updated_at?: string
        }
        Update: {
          id?: number
          network_name?: string
          player_id_prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      network_staff_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_staff_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_staff_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          player_id: string
          store_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          player_id: string
          store_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          player_id?: string
          store_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name?: string
          slug?: string
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
          player_id: string | null
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
          player_id?: string | null
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
          player_id?: string | null
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
      player_deletions: {
        Row: {
          clerk_user_id: string | null
          completed_at: string | null
          created_at: string
          current_step: string | null
          error_message: string | null
          external_systems_notified: string[]
          id: string
          initiated_at: string
          last_retry_at: string | null
          player_id: string
          retry_count: number
          status: string
        }
        Insert: {
          clerk_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          external_systems_notified?: string[]
          id?: string
          initiated_at?: string
          last_retry_at?: string | null
          player_id: string
          retry_count?: number
          status?: string
        }
        Update: {
          clerk_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          external_systems_notified?: string[]
          id?: string
          initiated_at?: string
          last_retry_at?: string | null
          player_id?: string
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
      player_inventory: {
        Row: {
          id: string
          item_id: string | null
          player_id: string | null
          purchased_at: string | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          player_id?: string | null
          purchased_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string | null
          player_id?: string | null
          purchased_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_inventory_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_pass_subscriptions: {
        Row: {
          billing_frequency: string
          cancelled_at: string | null
          created_at: string
          diamond_entry_reset_at: string | null
          diamond_entry_used_this_month: boolean
          home_store_id: string | null
          id: string
          next_renewal_at: string | null
          player_id: string | null
          recurring_amount: number
          started_at: string
          status: string
          tier: string
        }
        Insert: {
          billing_frequency?: string
          cancelled_at?: string | null
          created_at?: string
          diamond_entry_reset_at?: string | null
          diamond_entry_used_this_month?: boolean
          home_store_id?: string | null
          id?: string
          next_renewal_at?: string | null
          player_id?: string | null
          recurring_amount?: number
          started_at?: string
          status?: string
          tier: string
        }
        Update: {
          billing_frequency?: string
          cancelled_at?: string | null
          created_at?: string
          diamond_entry_reset_at?: string | null
          diamond_entry_used_this_month?: boolean
          home_store_id?: string | null
          id?: string
          next_renewal_at?: string | null
          player_id?: string | null
          recurring_amount?: number
          started_at?: string
          status?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_pass_subscriptions_home_store_id_fkey"
            columns: ["home_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_pass_subscriptions_player_id_fkey"
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
          avatar_config: Json | null
          avatar_frame: string | null
          avatar_photo_url: string | null
          avatar_type: string | null
          clerk_user_id: string | null
          created_at: string | null
          discord_username: string | null
          display_name: string
          email: string | null
          favorite_games: Json | null
          gems: number | null
          home_store_id: string | null
          id: string
          is_banned: boolean | null
          is_founding_member: boolean | null
          is_shadow_vip: boolean | null
          is_staff: boolean | null
          last_check_in_at: string | null
          last_seen_at: string | null
          managed_store_id: string | null
          notification_preferences: Json
          pass_billing_anchor: number | null
          pass_expires_at: string | null
          pass_games: string[] | null
          pass_started_at: string | null
          pass_status: Database["public"]["Enums"]["pass_status"] | null
          pass_tier: Database["public"]["Enums"]["pass_tier"] | null
          phone: string | null
          player_id: string
          primary_game_id: string | null
          privacy_allow_friend_requests: boolean | null
          privacy_hide_from_search: boolean | null
          privacy_profile_visibility: string | null
          privacy_show_activity: boolean | null
          privacy_show_as_anonymous: boolean | null
          privacy_show_games: boolean | null
          privacy_show_on_leaderboard: boolean | null
          privacy_show_real_name: boolean | null
          profile_visibility:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          real_name: string | null
          referral_bonus_paid: boolean | null
          referral_code: string | null
          referred_by: string | null
          shopify_customer_id: string | null
          show_activity: boolean | null
          show_games: boolean | null
          show_on_leaderboard: boolean | null
          show_real_name: boolean | null
          show_stats: boolean | null
          square_customer_id: string | null
          status_text: string | null
          status_updated_at: string | null
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
          avatar_config?: Json | null
          avatar_frame?: string | null
          avatar_photo_url?: string | null
          avatar_type?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          discord_username?: string | null
          display_name: string
          email?: string | null
          favorite_games?: Json | null
          gems?: number | null
          home_store_id?: string | null
          id?: string
          is_banned?: boolean | null
          is_founding_member?: boolean | null
          is_shadow_vip?: boolean | null
          is_staff?: boolean | null
          last_check_in_at?: string | null
          last_seen_at?: string | null
          managed_store_id?: string | null
          notification_preferences?: Json
          pass_billing_anchor?: number | null
          pass_expires_at?: string | null
          pass_games?: string[] | null
          pass_started_at?: string | null
          pass_status?: Database["public"]["Enums"]["pass_status"] | null
          pass_tier?: Database["public"]["Enums"]["pass_tier"] | null
          phone?: string | null
          player_id: string
          primary_game_id?: string | null
          privacy_allow_friend_requests?: boolean | null
          privacy_hide_from_search?: boolean | null
          privacy_profile_visibility?: string | null
          privacy_show_activity?: boolean | null
          privacy_show_as_anonymous?: boolean | null
          privacy_show_games?: boolean | null
          privacy_show_on_leaderboard?: boolean | null
          privacy_show_real_name?: boolean | null
          profile_visibility?:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          real_name?: string | null
          referral_bonus_paid?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          shopify_customer_id?: string | null
          show_activity?: boolean | null
          show_games?: boolean | null
          show_on_leaderboard?: boolean | null
          show_real_name?: boolean | null
          show_stats?: boolean | null
          square_customer_id?: string | null
          status_text?: string | null
          status_updated_at?: string | null
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
          avatar_config?: Json | null
          avatar_frame?: string | null
          avatar_photo_url?: string | null
          avatar_type?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          discord_username?: string | null
          display_name?: string
          email?: string | null
          favorite_games?: Json | null
          gems?: number | null
          home_store_id?: string | null
          id?: string
          is_banned?: boolean | null
          is_founding_member?: boolean | null
          is_shadow_vip?: boolean | null
          is_staff?: boolean | null
          last_check_in_at?: string | null
          last_seen_at?: string | null
          managed_store_id?: string | null
          notification_preferences?: Json
          pass_billing_anchor?: number | null
          pass_expires_at?: string | null
          pass_games?: string[] | null
          pass_started_at?: string | null
          pass_status?: Database["public"]["Enums"]["pass_status"] | null
          pass_tier?: Database["public"]["Enums"]["pass_tier"] | null
          phone?: string | null
          player_id?: string
          primary_game_id?: string | null
          privacy_allow_friend_requests?: boolean | null
          privacy_hide_from_search?: boolean | null
          privacy_profile_visibility?: string | null
          privacy_show_activity?: boolean | null
          privacy_show_as_anonymous?: boolean | null
          privacy_show_games?: boolean | null
          privacy_show_on_leaderboard?: boolean | null
          privacy_show_real_name?: boolean | null
          profile_visibility?:
            | Database["public"]["Enums"]["privacy_visibility"]
            | null
          real_name?: string | null
          referral_bonus_paid?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          shopify_customer_id?: string | null
          show_activity?: boolean | null
          show_games?: boolean | null
          show_on_leaderboard?: boolean | null
          show_real_name?: boolean | null
          show_stats?: boolean | null
          square_customer_id?: string | null
          status_text?: string | null
          status_updated_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_home_store_id_fkey"
            columns: ["home_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_managed_store_id_fkey"
            columns: ["managed_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_primary_game_id_fkey"
            columns: ["primary_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      preorder_claims: {
        Row: {
          claimed_at: string | null
          id: string
          pass_tier_at_claim: Database["public"]["Enums"]["pass_tier"]
          player_id: string | null
          price_per_unit: number
          product_id: string
          quantity: number
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          pass_tier_at_claim: Database["public"]["Enums"]["pass_tier"]
          player_id?: string | null
          price_per_unit: number
          product_id: string
          quantity: number
        }
        Update: {
          claimed_at?: string | null
          id?: string
          pass_tier_at_claim?: Database["public"]["Enums"]["pass_tier"]
          player_id?: string | null
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
      prize_point_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          player_id: string | null
          reference_id: string | null
          source: string
          store_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          player_id?: string | null
          reference_id?: string | null
          source: string
          store_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          player_id?: string | null
          reference_id?: string | null
          source?: string
          store_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_point_transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_point_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_wall_items: {
        Row: {
          created_at: string | null
          description: string | null
          fulfillment_store_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_network_prize: boolean
          name: string
          quantity: number | null
          retail_value: number | null
          store_id: string | null
          unlock_threshold: number | null
          xp_cost: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fulfillment_store_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_network_prize?: boolean
          name: string
          quantity?: number | null
          retail_value?: number | null
          store_id?: string | null
          unlock_threshold?: number | null
          xp_cost: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fulfillment_store_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_network_prize?: boolean
          name?: string
          quantity?: number | null
          retail_value?: number | null
          store_id?: string | null
          unlock_threshold?: number | null
          xp_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "prize_wall_items_fulfillment_store_id_fkey"
            columns: ["fulfillment_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_wall_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_wall_redemptions: {
        Row: {
          claim_code: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          expires_at: string
          id: string
          item_id: string
          item_name: string
          item_retail_value: number | null
          player_id: string | null
          points_deducted: number
          status: string
          store_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          claim_code: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          item_id: string
          item_name: string
          item_retail_value?: number | null
          player_id?: string | null
          points_deducted: number
          status?: string
          store_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          claim_code?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          item_id?: string
          item_name?: string
          item_retail_value?: number | null
          player_id?: string | null
          points_deducted?: number
          status?: string
          store_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prize_wall_redemptions_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_wall_redemptions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "prize_wall_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_wall_redemptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_wall_redemptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_wall_redemptions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          player_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          player_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
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
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          request_count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          request_count?: number
          window_start?: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          name: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          active: boolean
          asset_data: Json
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          price: number
          rarity: string
        }
        Insert: {
          active?: boolean
          asset_data: Json
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          price?: number
          rarity?: string
        }
        Update: {
          active?: boolean
          asset_data?: Json
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          price?: number
          rarity?: string
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: string
          store_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role: string
          store_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: string
          store_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_store_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          store_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_store_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_store_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_store_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_config: {
        Row: {
          created_at: string | null
          currency_icon: string
          currency_name: string
          id: number
          network_calendar_url: string | null
          player_id_prefix: string
          shop_categories: Json
          shop_description: string
          shop_title: string
          staff_invite_code: string | null
          store_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency_icon?: string
          currency_name?: string
          id?: number
          network_calendar_url?: string | null
          player_id_prefix?: string
          shop_categories?: Json
          shop_description?: string
          shop_title?: string
          staff_invite_code?: string | null
          store_name?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency_icon?: string
          currency_name?: string
          id?: number
          network_calendar_url?: string | null
          player_id_prefix?: string
          shop_categories?: Json
          shop_description?: string
          shop_title?: string
          staff_invite_code?: string | null
          store_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          color: string | null
          created_at: string | null
          currency_icon: string
          currency_name: string
          ical_url: string | null
          id: string
          is_active: boolean | null
          is_flagship: boolean
          name: string
          org_id: string | null
          phone: string | null
          player_id_prefix: string
          short_id: string | null
          slug: string | null
          state: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          color?: string | null
          created_at?: string | null
          currency_icon?: string
          currency_name?: string
          ical_url?: string | null
          id?: string
          is_active?: boolean | null
          is_flagship?: boolean
          name: string
          org_id?: string | null
          phone?: string | null
          player_id_prefix?: string
          short_id?: string | null
          slug?: string | null
          state?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          color?: string | null
          created_at?: string | null
          currency_icon?: string
          currency_name?: string
          ical_url?: string | null
          id?: string
          is_active?: boolean | null
          is_flagship?: boolean
          name?: string
          org_id?: string | null
          phone?: string | null
          player_id_prefix?: string
          short_id?: string | null
          slug?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          player_id: string | null
          season_id: string | null
          source: Database["public"]["Enums"]["xp_source"]
          store_id: string | null
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
          player_id?: string | null
          season_id?: string | null
          source: Database["public"]["Enums"]["xp_source"]
          store_id?: string | null
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
          player_id?: string | null
          season_id?: string | null
          source?: Database["public"]["Enums"]["xp_source"]
          store_id?: string | null
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
          {
            foreignKeyName: "xp_ledger_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
      accept_staff_invitation: {
        Args: {
          p_clerk_user_id: string
          p_token_hash: string
          p_verified_emails: string[]
        }
        Returns: Json
      }
      adjust_prize_points: {
        Args: {
          p_amount: number
          p_player_id: string
          p_reason: string
          p_store_id: string
        }
        Returns: Json
      }
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
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      cleanup_player_data: { Args: { p_player_id: string }; Returns: undefined }
      create_prize_redemption: {
        Args: { p_item_id: string; p_player_id: string; p_store_id: string }
        Returns: Json
      }
      get_pass_multiplier: { Args: { p_player_id: string }; Returns: number }
      get_player_multiplier: { Args: { p_player_id: string }; Returns: number }
      get_player_rank: {
        Args: { p_game_id: string; p_player_id: string }
        Returns: string
      }
      get_user_point_balance: {
        Args: { p_player_id: string; p_store_id: string }
        Returns: number
      }
      get_xp_discount: { Args: { p_player_id: string }; Returns: number }
      refresh_xp_aggregates: { Args: never; Returns: undefined }
    }
    Enums: {
      event_status: "scheduled" | "active" | "completed" | "cancelled"
      friend_status: "pending" | "accepted" | "blocked"
      pass_status: "active" | "grace_period" | "cancelled" | "expired"
      pass_tier:
        | "none"
        | "access"
        | "player"
        | "all_access"
        | "shadow_vip"
        | "diamond"
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
        | "welcome_bonus"
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
      pass_tier: [
        "none",
        "access",
        "player",
        "all_access",
        "shadow_vip",
        "diamond",
      ],
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
        "welcome_bonus",
      ],
    },
  },
} as const
