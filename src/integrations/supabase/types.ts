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
      daily_checkins: {
        Row: {
          amount: number
          checkin_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          checkin_date?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkin_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["deposit_method"]
          paystack_ref: string | null
          processed_at: string | null
          proof_note: string | null
          status: Database["public"]["Enums"]["tx_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["deposit_method"]
          paystack_ref?: string | null
          processed_at?: string | null
          proof_note?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["deposit_method"]
          paystack_ref?: string | null
          processed_at?: string | null
          proof_note?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          daily_roi_pct: number
          days_paid: number
          duration_days: number
          ends_at: string
          id: string
          last_payout_at: string
          plan_id: string
          plan_name: string
          return_principal: boolean
          started_at: string
          status: Database["public"]["Enums"]["investment_status"]
          total_earned: number
          user_id: string
        }
        Insert: {
          amount: number
          daily_roi_pct: number
          days_paid?: number
          duration_days: number
          ends_at: string
          id?: string
          last_payout_at?: string
          plan_id: string
          plan_name: string
          return_principal: boolean
          started_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          total_earned?: number
          user_id: string
        }
        Update: {
          amount?: number
          daily_roi_pct?: number
          days_paid?: number
          duration_days?: number
          ends_at?: string
          id?: string
          last_payout_at?: string
          plan_id?: string
          plan_name?: string
          return_principal?: boolean
          started_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          total_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          daily_roi_pct: number
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          max_amount: number
          min_amount: number
          name: string
          price: number
          return_principal: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          daily_roi_pct: number
          description?: string | null
          duration_days: number
          id?: string
          is_active?: boolean
          max_amount: number
          min_amount: number
          name: string
          price?: number
          return_principal?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          daily_roi_pct?: number
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          name?: string
          price?: number
          return_principal?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bank_account_name: string | null
          bank_account_no: string | null
          bank_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          referral_code: string
          referred_by: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          referral_code: string
          referred_by?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string
          from_user_id: string
          id: string
          level: number
          source_amount: number
          source_type: Database["public"]["Enums"]["referral_source"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_user_id: string
          id?: string
          level: number
          source_amount: number
          source_type: Database["public"]["Enums"]["referral_source"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_user_id?: string
          id?: string
          level?: number
          source_amount?: number
          source_type?: Database["public"]["Enums"]["referral_source"]
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          daily_checkin_amount: number
          dashboard_popup_buttons: Json
          dashboard_popup_enabled: boolean
          dashboard_popup_message: string
          dashboard_popup_title: string
          deposit_enabled: boolean
          deposit_instructions: string
          id: number
          investment_enabled: boolean
          maintenance_message: string
          maintenance_mode: boolean
          manual_bank_account: string
          manual_bank_account_name: string
          manual_bank_name: string
          manual_deposit_enabled: boolean
          max_withdrawal: number
          min_deposit: number
          min_withdrawal: number
          paystack_enabled: boolean
          ref_l1_pct: number
          ref_l2_pct: number
          ref_l3_pct: number
          ref_source: Database["public"]["Enums"]["referral_source"]
          referral_instructions: string
          site_name: string
          support_agent_details: string
          support_agent_name: string
          support_contact_link: string
          support_contacts: Json
          support_title: string
          updated_at: string
          welcome_bonus_amount: number
          welcome_bonus_withdrawable: boolean
          withdraw_instructions: string
          withdrawal_enabled: boolean
          withdrawal_fee_pct: number
        }
        Insert: {
          daily_checkin_amount?: number
          dashboard_popup_buttons?: Json
          dashboard_popup_enabled?: boolean
          dashboard_popup_message?: string
          dashboard_popup_title?: string
          deposit_enabled?: boolean
          deposit_instructions?: string
          id?: number
          investment_enabled?: boolean
          maintenance_message?: string
          maintenance_mode?: boolean
          manual_bank_account?: string
          manual_bank_account_name?: string
          manual_bank_name?: string
          manual_deposit_enabled?: boolean
          max_withdrawal?: number
          min_deposit?: number
          min_withdrawal?: number
          paystack_enabled?: boolean
          ref_l1_pct?: number
          ref_l2_pct?: number
          ref_l3_pct?: number
          ref_source?: Database["public"]["Enums"]["referral_source"]
          referral_instructions?: string
          site_name?: string
          support_agent_details?: string
          support_agent_name?: string
          support_contact_link?: string
          support_contacts?: Json
          support_title?: string
          updated_at?: string
          welcome_bonus_amount?: number
          welcome_bonus_withdrawable?: boolean
          withdraw_instructions?: string
          withdrawal_enabled?: boolean
          withdrawal_fee_pct?: number
        }
        Update: {
          daily_checkin_amount?: number
          dashboard_popup_buttons?: Json
          dashboard_popup_enabled?: boolean
          dashboard_popup_message?: string
          dashboard_popup_title?: string
          deposit_enabled?: boolean
          deposit_instructions?: string
          id?: number
          investment_enabled?: boolean
          maintenance_message?: string
          maintenance_mode?: boolean
          manual_bank_account?: string
          manual_bank_account_name?: string
          manual_bank_name?: string
          manual_deposit_enabled?: boolean
          max_withdrawal?: number
          min_deposit?: number
          min_withdrawal?: number
          paystack_enabled?: boolean
          ref_l1_pct?: number
          ref_l2_pct?: number
          ref_l3_pct?: number
          ref_source?: Database["public"]["Enums"]["referral_source"]
          referral_instructions?: string
          site_name?: string
          support_agent_details?: string
          support_agent_name?: string
          support_contact_link?: string
          support_contacts?: Json
          support_title?: string
          updated_at?: string
          welcome_bonus_amount?: number
          welcome_bonus_withdrawable?: boolean
          withdraw_instructions?: string
          withdrawal_enabled?: boolean
          withdrawal_fee_pct?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          meta: Json
          reference: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          meta?: Json
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          meta?: Json
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
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
      wallets: {
        Row: {
          balance: number
          locked_balance: number
          non_withdrawable: number
          referral_earned: number
          total_deposited: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          locked_balance?: number
          non_withdrawable?: number
          referral_earned?: number
          total_deposited?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          locked_balance?: number
          non_withdrawable?: number
          referral_earned?: number
          total_deposited?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          bank_account_name: string
          bank_account_no: string
          bank_name: string
          created_at: string
          fee: number
          id: string
          net_amount: number
          processed_at: string | null
          status: Database["public"]["Enums"]["tx_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_account_name: string
          bank_account_no: string
          bank_name: string
          created_at?: string
          fee?: number
          id?: string
          net_amount: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_account_name?: string
          bank_account_no?: string
          bank_name?: string
          created_at?: string
          fee?: number
          id?: string
          net_amount?: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_ref_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      deposit_method: "paystack" | "manual"
      investment_status: "active" | "completed" | "cancelled"
      referral_source: "deposit" | "investment" | "roi"
      tx_status: "pending" | "approved" | "rejected" | "completed" | "failed"
      tx_type:
        | "deposit"
        | "withdrawal"
        | "investment"
        | "roi"
        | "referral"
        | "welcome_bonus"
        | "daily_checkin"
        | "refund"
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
      app_role: ["admin", "user"],
      deposit_method: ["paystack", "manual"],
      investment_status: ["active", "completed", "cancelled"],
      referral_source: ["deposit", "investment", "roi"],
      tx_status: ["pending", "approved", "rejected", "completed", "failed"],
      tx_type: [
        "deposit",
        "withdrawal",
        "investment",
        "roi",
        "referral",
        "welcome_bonus",
        "daily_checkin",
        "refund",
      ],
    },
  },
} as const
