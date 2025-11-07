export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          avatar_url: string | null
          created_at: string
          updated_at: string
          first_name: string | null
          last_name: string | null
          email: string
        }
        Insert: {
          id: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          first_name?: string | null
          last_name?: string | null
          email?: string
        }
        Update: {
          id?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          first_name?: string | null
          last_name?: string | null
          email?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string | null
          title: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string | null
          sender: 'user' | 'assistant' | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          sender?: 'user' | 'assistant' | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          sender?: 'user' | 'assistant' | null
          content?: string
          created_at?: string
        }
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          type: 'home' | 'work' | 'custom'
          name: string
          street: string
          city: string
          state: string
          zip_code: string
          country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'home' | 'work' | 'custom'
          name: string
          street: string
          city: string
          state: string
          zip_code: string
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'home' | 'work' | 'custom'
          name?: string
          street?: string
          city?: string
          state?: string
          zip_code?: string
          country?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}
