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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      brands: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_url: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          emoji: string
          id: Database["public"]["Enums"]["product_category"]
          image_url: string
          name: string
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          emoji?: string
          id: Database["public"]["Enums"]["product_category"]
          image_url?: string
          name: string
          slug: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          emoji?: string
          id?: Database["public"]["Enums"]["product_category"]
          image_url?: string
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number
          min_order_value: number
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          min_order_value?: number
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          min_order_value?: number
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          data: Json
          id: string
          kind: string
          message: string
          order_id: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind: string
          message?: string
          order_id: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          message?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          size?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          coupon_code: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_whatsapp: string
          delivered_at: string | null
          discount: number
          fulfillment_status: string
          id: string
          idempotency_key: string | null
          notes: string | null
          payment_confirmed_amount: number | null
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_confirmed_by_email: string | null
          payment_method: string
          payment_status: string
          posted_at: string | null
          refund_amount: number | null
          refund_note: string | null
          refunded_at: string | null
          refunded_by: string | null
          ship_cep: string
          ship_city: string
          ship_complement: string
          ship_district: string
          ship_number: string
          ship_street: string
          ship_uf: string
          shipping: number
          shipping_carrier: string
          shipping_days_max: number | null
          shipping_days_min: number | null
          shipping_environment: string
          shipping_prep_days: number
          shipping_quoted_at: string | null
          shipping_service: string
          shipping_service_key: string
          shipping_status: string
          status: Database["public"]["Enums"]["order_status"]
          stock_deducted_at: string | null
          stock_restored_at: string | null
          subtotal: number
          total: number
          tracking_carrier: string
          tracking_code: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string
          coupon_code?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_whatsapp?: string
          delivered_at?: string | null
          discount?: number
          fulfillment_status?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_confirmed_amount?: number | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_confirmed_by_email?: string | null
          payment_method?: string
          payment_status?: string
          posted_at?: string | null
          refund_amount?: number | null
          refund_note?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          ship_cep?: string
          ship_city?: string
          ship_complement?: string
          ship_district?: string
          ship_number?: string
          ship_street?: string
          ship_uf?: string
          shipping?: number
          shipping_carrier?: string
          shipping_days_max?: number | null
          shipping_days_min?: number | null
          shipping_environment?: string
          shipping_prep_days?: number
          shipping_quoted_at?: string | null
          shipping_service?: string
          shipping_service_key?: string
          shipping_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_deducted_at?: string | null
          stock_restored_at?: string | null
          subtotal?: number
          total?: number
          tracking_carrier?: string
          tracking_code?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string
          coupon_code?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_whatsapp?: string
          delivered_at?: string | null
          discount?: number
          fulfillment_status?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_confirmed_amount?: number | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_confirmed_by_email?: string | null
          payment_method?: string
          payment_status?: string
          posted_at?: string | null
          refund_amount?: number | null
          refund_note?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          ship_cep?: string
          ship_city?: string
          ship_complement?: string
          ship_district?: string
          ship_number?: string
          ship_street?: string
          ship_uf?: string
          shipping?: number
          shipping_carrier?: string
          shipping_days_max?: number | null
          shipping_days_min?: number | null
          shipping_environment?: string
          shipping_prep_days?: number
          shipping_quoted_at?: string | null
          shipping_service?: string
          shipping_service_key?: string
          shipping_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_deducted_at?: string | null
          stock_restored_at?: string | null
          subtotal?: number
          total?: number
          tracking_carrier?: string
          tracking_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          product_id: string
          quantity: number
          size: string
          updated_at: string
        }
        Insert: {
          product_id: string
          quantity?: number
          size: string
          updated_at?: string
        }
        Update: {
          product_id?: string
          quantity?: number
          size?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand_id: string | null
          category: Database["public"]["Enums"]["product_category"]
          club: string
          colors: string[]
          created_at: string
          description: string | null
          discount: number
          featured: boolean
          id: string
          image_url: string
          image_url_2: string
          image_url_3: string
          image_url_4: string
          name: string
          old_price: number
          price: number
          sizes: string[] | null
          slug: string
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand_id?: string | null
          category: Database["public"]["Enums"]["product_category"]
          club: string
          colors?: string[]
          created_at?: string
          description?: string | null
          discount?: number
          featured?: boolean
          id?: string
          image_url?: string
          image_url_2?: string
          image_url_3?: string
          image_url_4?: string
          name: string
          old_price?: number
          price?: number
          sizes?: string[] | null
          slug: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand_id?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          club?: string
          colors?: string[]
          created_at?: string
          description?: string | null
          discount?: number
          featured?: boolean
          id?: string
          image_url?: string
          image_url_2?: string
          image_url_3?: string
          image_url_4?: string
          name?: string
          old_price?: number
          price?: number
          sizes?: string[] | null
          slug?: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          id: string
          product_id: string | null
          rating: number
          reply: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          product_id?: string | null
          rating?: number
          reply?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          product_id?: string | null
          rating?: number
          reply?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          active: boolean
          created_at: string
          delivery_days: string
          free_above: number
          id: string
          price: number
          region: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          delivery_days?: string
          free_above?: number
          id?: string
          price?: number
          region: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          delivery_days?: string
          free_above?: number
          id?: string
          price?: number
          region?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          delta: number
          id: string
          note: string | null
          order_id: string | null
          product_id: string
          quantity_after: number
          reason: string
          size: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          order_id?: string | null
          product_id: string
          quantity_after: number
          reason: string
          size: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          order_id?: string | null
          product_id?: string
          quantity_after?: number
          reason?: string
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actor_email: { Args: never; Returns: string }
      admin_add_order_note: {
        Args: { _order_id: string; _text: string }
        Returns: Json
      }
      admin_adjust_stock: {
        Args: {
          _delta: number
          _note?: string
          _product_id: string
          _reason: string
          _size: string
        }
        Returns: Json
      }
      admin_cancel_order: {
        Args: { _order_id: string; _reason: string; _restock?: boolean }
        Returns: Json
      }
      admin_confirm_payment: {
        Args: { _amount: number; _note?: string; _order_id: string }
        Returns: Json
      }
      admin_dashboard: {
        Args: { _from: string; _low_stock?: number; _to: string }
        Returns: Json
      }
      admin_register_refund: {
        Args: { _amount: number; _note: string; _order_id: string }
        Returns: Json
      }
      admin_set_fulfillment: {
        Args: {
          _carrier?: string
          _order_id: string
          _posted_at?: string
          _to: string
          _tracking?: string
        }
        Returns: Json
      }
      admin_set_shipping: {
        Args: {
          _amount: number
          _days?: string
          _order_id: string
          _service: string
        }
        Returns: Json
      }
      admin_update_tracking: {
        Args: {
          _carrier: string
          _order_id: string
          _posted_at: string
          _tracking: string
        }
        Returns: Json
      }
      assert_admin: { Args: never; Returns: undefined }
      create_checkout_order: { Args: { _payload: Json }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_order_event: {
        Args: { _data?: Json; _kind: string; _message: string; _order: string }
        Returns: undefined
      }
      redeem_coupon: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin"
      order_status: "pendente" | "pago" | "enviado" | "entregue" | "cancelado"
      product_category:
        | "masculino"
        | "feminino"
        | "retro"
        | "caneleiras"
        | "jogador"
      review_status: "pendente" | "aprovada" | "reprovada"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
      order_status: ["pendente", "pago", "enviado", "entregue", "cancelado"],
      product_category: [
        "masculino",
        "feminino",
        "retro",
        "caneleiras",
        "jogador",
      ],
      review_status: ["pendente", "aprovada", "reprovada"],
    },
  },
} as const
