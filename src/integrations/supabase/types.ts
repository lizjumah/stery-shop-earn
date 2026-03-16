export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          id: string
          staff_id: string
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          }
        ]
      }
      commission_approvals: {
        Row: {
          id: string
          customer_id: string
          amount: number
          status: string
          mpesa_number: string | null
          rejection_reason: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
          approved_at: string | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          amount: number
          status?: string
          mpesa_number?: string | null
          rejection_reason?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          paid_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          amount?: number
          status?: string
          mpesa_number?: string | null
          rejection_reason?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_approvals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          }
        ]
      }
      commissions: {
        Row: {
          id: string
          reseller_id: string
          order_id: string | null
          product_name: string
          product_id: string | null
          amount: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          order_id?: string | null
          product_name: string
          product_id?: string | null
          amount: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          order_id?: string | null
          product_name?: string
          product_id?: string | null
          amount?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          birthday_bonus_claimed: boolean
          created_at: string
          delivery_location: string | null
          delivery_notes: string | null
          email: string | null
          id: string
          is_admin: boolean
          loyalty_points: number
          name: string
          phone: string
          referral_code: string | null
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          birthday_bonus_claimed?: boolean
          created_at?: string
          delivery_location?: string | null
          delivery_notes?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
          loyalty_points?: number
          name: string
          phone: string
          referral_code?: string | null
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          birthday_bonus_claimed?: boolean
          created_at?: string
          delivery_location?: string | null
          delivery_notes?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
          loyalty_points?: number
          name?: string
          phone?: string
          referral_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_routes: {
        Row: {
          id: string
          area_name: string
          delivery_fee: number
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          area_name: string
          delivery_fee: number
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          area_name?: string
          delivery_fee?: number
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_per_item: number
          product_name: string
          quantity: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_per_item?: number
          product_name: string
          quantity?: number
          subtotal?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_per_item?: number
          product_name?: string
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string
          delivery_area: string | null
          delivery_fee: number
          delivery_location: string | null
          delivery_option: string
          id: string
          items: Json
          order_number: string
          order_source: string | null
          payment_method: string
          points_earned: number
          points_redeemed: number
          status: string
          subtotal: number
          total: number
          updated_at: string
          pos_receipt_number: string | null
          pos_total: number | null
          pos_processed_at: string | null
          staff_notes: string | null
          assigned_to: string | null
          created_by: string | null
          updated_by: string | null
          paid_at: string | null
          payment_status: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone: string
          delivery_area?: string | null
          delivery_fee?: number
          delivery_location?: string | null
          delivery_option?: string
          id?: string
          items?: Json
          order_number: string
          order_source?: string | null
          payment_method?: string
          points_earned?: number
          points_redeemed?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          pos_receipt_number?: string | null
          pos_total?: number | null
          pos_processed_at?: string | null
          staff_notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          updated_by?: string | null
          paid_at?: string | null
          payment_status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string
          delivery_area?: string | null
          delivery_fee?: number
          delivery_location?: string | null
          delivery_option?: string
          id?: string
          items?: Json
          order_number?: string
          order_source?: string | null
          payment_method?: string
          points_earned?: number
          points_redeemed?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          pos_receipt_number?: string | null
          pos_total?: number | null
          pos_processed_at?: string | null
          staff_notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          updated_by?: string | null
          paid_at?: string | null
          payment_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          variant_type: string
          variant_value: string
          sku: string | null
          stock_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          variant_type: string
          variant_value: string
          sku?: string | null
          stock_quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          variant_type?: string
          variant_value?: string
          sku?: string | null
          stock_quantity?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          original_price: number | null
          image_url: string | null
          category: string
          subcategory: string | null
          description: string | null
          commission: number | null
          loyalty_points: number
          in_stock: boolean
          stock_quantity: number
          is_offer: boolean
          stock_status: string
          barcode: string | null
          created_at: string
          updated_at: string
          visibility: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          price: number
          original_price?: number | null
          image_url?: string | null
          category?: string
          subcategory?: string | null
          description?: string | null
          commission?: number | null
          loyalty_points?: number
          in_stock?: boolean
          stock_quantity?: number
          is_offer?: boolean
          stock_status?: string
          barcode?: string | null
          created_at?: string
          updated_at?: string
          visibility?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          original_price?: number | null
          image_url?: string | null
          category?: string
          subcategory?: string | null
          description?: string | null
          commission?: number | null
          loyalty_points?: number
          in_stock?: boolean
          stock_quantity?: number
          is_offer?: boolean
          stock_status?: string
          barcode?: string | null
          created_at?: string
          updated_at?: string
          visibility?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      points_history: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          label: string
          points: number
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          label: string
          points: number
          type?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          label?: string
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string | null
          referred_phone: string | null
          referred_name: string | null
          bonus_amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id?: string | null
          referred_phone?: string | null
          referred_name?: string | null
          bonus_amount?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string | null
          referred_phone?: string | null
          referred_name?: string | null
          bonus_amount?: number
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      staff_users: {
        Row: {
          id: string
          customer_id: string | null
          name: string
          phone: string
          role: string
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          customer_id?: string | null
          name: string
          phone: string
          role?: string
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          name?: string
          phone?: string
          role?: string
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_alerts: {
        Row: {
          id: string
          product_id: string
          alert_type: string
          threshold: number
          status: string
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          alert_type?: string
          threshold?: number
          status?: string
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          alert_type?: string
          threshold?: number
          status?: string
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      staff_role: "admin" | "product_manager"
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      staff_role: ["admin", "product_manager"],
    },
  },
} as const
