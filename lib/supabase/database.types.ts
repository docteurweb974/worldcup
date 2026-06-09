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
  public: {
    Tables: {
      predictions: {
        Row: {
          away: number
          created_at: string
          home: number
          id: number
          match_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          away: number
          created_at?: string
          home: number
          id?: never
          match_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          away?: number
          created_at?: string
          home?: number
          id?: never
          match_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          favorite_team: string | null
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          favorite_team?: string | null
          id: string
          username: string
        }
        Update: {
          created_at?: string
          favorite_team?: string | null
          id?: string
          username?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
