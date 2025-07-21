export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      hospital_or_mso: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          type: string
          representative: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          type: string
          representative?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          type?: string
          representative?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee: {
        Row: {
          id: string
          name: string
          email: string
          department_id: string | null
          hospital_id: string
          role: 'super_admin' | 'admin' | 'manager' | 'employee'
          position: string | null
          status: string
          phone: string | null
          hire_date: string | null
          auth_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          department_id?: string | null
          hospital_id: string
          role?: 'super_admin' | 'admin' | 'manager' | 'employee'
          position?: string | null
          status?: string
          phone?: string | null
          hire_date?: string | null
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          department_id?: string | null
          hospital_id?: string
          role?: 'super_admin' | 'admin' | 'manager' | 'employee'
          position?: string | null
          status?: string
          phone?: string | null
          hire_date?: string | null
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification: {
        Row: {
          id: string
          type: string
          user_id: string
          hospital_id: string
          title: string
          message: string
          is_read: boolean | null
          read_at: string | null
          related_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          user_id: string
          hospital_id: string
          title: string
          message: string
          is_read?: boolean | null
          read_at?: string | null
          related_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          user_id?: string
          hospital_id?: string
          title?: string
          message?: string
          is_read?: boolean | null
          read_at?: string | null
          related_id?: string | null
          created_at?: string
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
