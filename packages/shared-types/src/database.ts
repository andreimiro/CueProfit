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
      ai_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          role: string
          structured_context: Json | null
          thread_id: string
          token_usage: Json | null
          tool_calls: Json | null
          workspace_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          role: string
          structured_context?: Json | null
          thread_id: string
          token_usage?: Json | null
          tool_calls?: Json | null
          workspace_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          role?: string
          structured_context?: Json | null
          thread_id?: string
          token_usage?: Json | null
          tool_calls?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_threads: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: number
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_daily_stats: {
        Row: {
          bidding_strategy: string | null
          budget_amount: number | null
          campaign_id: number
          campaign_name: string | null
          campaign_type: string | null
          clicks: number
          conversion_value: number
          conversions: number
          created_at: string
          currency: string | null
          customer_id: number
          date: string
          impressions: number
          spend: number
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bidding_strategy?: string | null
          budget_amount?: number | null
          campaign_id: number
          campaign_name?: string | null
          campaign_type?: string | null
          clicks?: number
          conversion_value?: number
          conversions?: number
          created_at?: string
          currency?: string | null
          customer_id: number
          date: string
          impressions?: number
          spend?: number
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bidding_strategy?: string | null
          budget_amount?: number | null
          campaign_id?: number
          campaign_name?: string | null
          campaign_type?: string | null
          clicks?: number
          conversion_value?: number
          conversions?: number
          created_at?: string
          currency?: string | null
          customer_id?: number
          date?: string
          impressions?: number
          spend?: number
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_daily_stats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          base: string
          date: string
          quote: string
          rate: number
        }
        Insert: {
          base: string
          date: string
          quote: string
          rate: number
        }
        Update: {
          base?: string
          date?: string
          quote?: string
          rate?: number
        }
        Relationships: []
      }
      oauth_connections: {
        Row: {
          connected_by: string | null
          created_at: string
          display_name: string | null
          external_account_id: string
          id: string
          last_error: string | null
          last_refresh_at: string | null
          last_synced_at: string | null
          login_customer_id: string | null
          provider: Database["public"]["Enums"]["connection_provider"]
          scopes: string[]
          status: Database["public"]["Enums"]["connection_status"]
          token_expires_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connected_by?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id: string
          id?: string
          last_error?: string | null
          last_refresh_at?: string | null
          last_synced_at?: string | null
          login_customer_id?: string | null
          provider: Database["public"]["Enums"]["connection_provider"]
          scopes?: string[]
          status?: Database["public"]["Enums"]["connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connected_by?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string
          id?: string
          last_error?: string | null
          last_refresh_at?: string | null
          last_synced_at?: string | null
          login_customer_id?: string | null
          provider?: Database["public"]["Enums"]["connection_provider"]
          scopes?: string[]
          status?: Database["public"]["Enums"]["connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_secrets: {
        Row: {
          connection_id: string
          created_at: string
          encrypted_refresh_token: string
          kms_key_version: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          encrypted_refresh_token: string
          kms_key_version: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          encrypted_refresh_token?: string
          kms_key_version?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "oauth_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_secrets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          commission_rate: number | null
          cost_of_goods: number | null
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          match_key: string
          match_key_type: string
          other_cost: number | null
          packaging_cost: number | null
          payment_fee_rate: number | null
          product_id: string | null
          return_rate: number | null
          shipping_cost: number | null
          source: string
          target_margin: number | null
          updated_at: string
          validation_rate: number | null
          vat_rate: number | null
          workspace_id: string
        }
        Insert: {
          commission_rate?: number | null
          cost_of_goods?: number | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          match_key: string
          match_key_type?: string
          other_cost?: number | null
          packaging_cost?: number | null
          payment_fee_rate?: number | null
          product_id?: string | null
          return_rate?: number | null
          shipping_cost?: number | null
          source?: string
          target_margin?: number | null
          updated_at?: string
          validation_rate?: number | null
          vat_rate?: number | null
          workspace_id: string
        }
        Update: {
          commission_rate?: number | null
          cost_of_goods?: number | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          match_key?: string
          match_key_type?: string
          other_cost?: number | null
          packaging_cost?: number | null
          payment_fee_rate?: number | null
          product_id?: string | null
          return_rate?: number | null
          shipping_cost?: number | null
          source?: string
          target_margin?: number | null
          updated_at?: string
          validation_rate?: number | null
          vat_rate?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_costs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_daily_stats: {
        Row: {
          ads_item_id: string
          campaign_id: number
          clicks: number
          conversion_value: number
          conversions: number
          created_at: string
          currency: string | null
          customer_id: number
          date: string
          impressions: number
          product_id: string | null
          spend: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ads_item_id: string
          campaign_id: number
          clicks?: number
          conversion_value?: number
          conversions?: number
          created_at?: string
          currency?: string | null
          customer_id: number
          date: string
          impressions?: number
          product_id?: string | null
          spend?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ads_item_id?: string
          campaign_id?: number
          clicks?: number
          conversion_value?: number
          conversions?: number
          created_at?: string
          currency?: string | null
          customer_id?: number
          date?: string
          impressions?: number
          product_id?: string | null
          spend?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_daily_stats_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_daily_stats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_identity_map: {
        Row: {
          ads_item_id: string
          created_at: string
          gtin: string | null
          id: string
          is_manual: boolean
          landing_url: string | null
          match_confidence: number | null
          match_method: string | null
          merchant_product_id: string | null
          normalized_title: string | null
          offer_id: string | null
          product_id: string | null
          sku: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ads_item_id: string
          created_at?: string
          gtin?: string | null
          id?: string
          is_manual?: boolean
          landing_url?: string | null
          match_confidence?: number | null
          match_method?: string | null
          merchant_product_id?: string | null
          normalized_title?: string | null
          offer_id?: string | null
          product_id?: string | null
          sku?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ads_item_id?: string
          created_at?: string
          gtin?: string | null
          id?: string
          is_manual?: boolean
          landing_url?: string | null
          match_confidence?: number | null
          match_method?: string | null
          merchant_product_id?: string | null
          normalized_title?: string | null
          offer_id?: string | null
          product_id?: string | null
          sku?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_identity_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_identity_map_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          availability: string | null
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string
          currency: string | null
          custom_label_0: string | null
          custom_label_1: string | null
          custom_label_2: string | null
          custom_label_3: string | null
          custom_label_4: string | null
          gtin: string | null
          id: string
          image_url: string | null
          landing_url: string | null
          merchant_product_id: string | null
          mpn: string | null
          offer_id: string | null
          price: number | null
          product_type: string | null
          raw: Json | null
          sale_price: number | null
          sku: string | null
          status: string | null
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          availability?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          custom_label_0?: string | null
          custom_label_1?: string | null
          custom_label_2?: string | null
          custom_label_3?: string | null
          custom_label_4?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          landing_url?: string | null
          merchant_product_id?: string | null
          mpn?: string | null
          offer_id?: string | null
          price?: number | null
          product_type?: string | null
          raw?: Json | null
          sale_price?: number | null
          sku?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          availability?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          custom_label_0?: string | null
          custom_label_1?: string | null
          custom_label_2?: string | null
          custom_label_3?: string | null
          custom_label_4?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          landing_url?: string | null
          merchant_product_id?: string | null
          mpn?: string | null
          offer_id?: string | null
          price?: number | null
          product_type?: string | null
          raw?: Json | null
          sale_price?: number | null
          sku?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profit_daily_facts: {
        Row: {
          adjusted_revenue: number
          break_even_roas: number | null
          computed_at: string
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          currency: string | null
          date: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          gross_profit_before_ads: number
          net_poas: number | null
          net_profit: number
          poas: number | null
          revenue: number
          spend: number
          variable_cost: number
          waste_amount: number
          workspace_id: string
        }
        Insert: {
          adjusted_revenue?: number
          break_even_roas?: number | null
          computed_at?: string
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          currency?: string | null
          date: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          gross_profit_before_ads?: number
          net_poas?: number | null
          net_profit?: number
          poas?: number | null
          revenue?: number
          spend?: number
          variable_cost?: number
          waste_amount?: number
          workspace_id: string
        }
        Update: {
          adjusted_revenue?: number
          break_even_roas?: number | null
          computed_at?: string
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          currency?: string | null
          date?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          gross_profit_before_ads?: number
          net_poas?: number | null
          net_profit?: number
          poas?: number | null
          revenue?: number
          spend?: number
          variable_cost?: number
          waste_amount?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profit_daily_facts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_thresholds: {
        Row: {
          config: Json
          created_at: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_thresholds_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          description: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          evidence: Json | null
          expected_impact: number | null
          id: string
          impact_currency: string | null
          kind: Database["public"]["Enums"]["recommendation_kind"]
          period_end: string | null
          period_start: string | null
          resolved_at: string | null
          rule_key: string
          severity: Database["public"]["Enums"]["recommendation_severity"]
          status: Database["public"]["Enums"]["recommendation_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          evidence?: Json | null
          expected_impact?: number | null
          id?: string
          impact_currency?: string | null
          kind: Database["public"]["Enums"]["recommendation_kind"]
          period_end?: string | null
          period_start?: string | null
          resolved_at?: string | null
          rule_key: string
          severity?: Database["public"]["Enums"]["recommendation_severity"]
          status?: Database["public"]["Enums"]["recommendation_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          evidence?: Json | null
          expected_impact?: number | null
          id?: string
          impact_currency?: string | null
          kind?: Database["public"]["Enums"]["recommendation_kind"]
          period_end?: string | null
          period_start?: string | null
          resolved_at?: string | null
          rule_key?: string
          severity?: Database["public"]["Enums"]["recommendation_severity"]
          status?: Database["public"]["Enums"]["recommendation_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          seats: number
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          seats?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          seats?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          connection_id: string | null
          created_at: string
          cursor: Json | null
          error: string | null
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["sync_kind"]
          provider: Database["public"]["Enums"]["connection_provider"]
          rows_written: number
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"]
          workspace_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          cursor?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["sync_kind"]
          provider: Database["public"]["Enums"]["connection_provider"]
          rows_written?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          workspace_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          cursor?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["sync_kind"]
          provider?: Database["public"]["Enums"]["connection_provider"]
          rows_written?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "oauth_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          created_by: string | null
          currency: string
          default_commission_rate: number | null
          default_margin_rate: number | null
          default_payment_fee_rate: number
          default_return_rate: number
          default_shipping_cost: number | null
          default_validation_rate: number
          default_vat_rate: number
          id: string
          name: string
          slug: string | null
          target_net_margin: number | null
          target_poas: number | null
          updated_at: string
          vat_mode: Database["public"]["Enums"]["vat_mode"]
        }
        Insert: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          created_by?: string | null
          currency?: string
          default_commission_rate?: number | null
          default_margin_rate?: number | null
          default_payment_fee_rate?: number
          default_return_rate?: number
          default_shipping_cost?: number | null
          default_validation_rate?: number
          default_vat_rate?: number
          id?: string
          name: string
          slug?: string | null
          target_net_margin?: number | null
          target_poas?: number | null
          updated_at?: string
          vat_mode?: Database["public"]["Enums"]["vat_mode"]
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          created_by?: string | null
          currency?: string
          default_commission_rate?: number | null
          default_margin_rate?: number | null
          default_payment_fee_rate?: number
          default_return_rate?: number
          default_shipping_cost?: number | null
          default_validation_rate?: number
          default_vat_rate?: number
          id?: string
          name?: string
          slug?: string | null
          target_net_margin?: number | null
          target_poas?: number | null
          updated_at?: string
          vat_mode?: Database["public"]["Enums"]["vat_mode"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["member_role"][]
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      shares_workspace_with: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      business_type:
        | "ecommerce"
        | "affiliate"
        | "agency"
        | "brand"
        | "dropshipping"
      confidence_level: "low" | "medium" | "high"
      connection_provider: "google_ads" | "merchant_center"
      connection_status: "active" | "needs_reauth" | "revoked" | "error"
      entity_type: "account" | "campaign" | "ad_group" | "product" | "category"
      member_role: "owner" | "admin" | "member" | "viewer"
      recommendation_kind:
        | "scale"
        | "keep"
        | "watch"
        | "fix"
        | "reduce"
        | "exclude"
        | "pause"
        | "needs_more_data"
        | "good_roas_bad_profit"
        | "wasted_spend"
        | "tracking_issue"
        | "feed_issue"
        | "low_margin_pmax"
      recommendation_severity: "info" | "low" | "medium" | "high" | "critical"
      recommendation_status:
        | "open"
        | "acknowledged"
        | "applied"
        | "dismissed"
        | "expired"
      subscription_plan: "free" | "starter" | "growth" | "agency"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
      sync_kind: "backfill" | "daily" | "lag_repull" | "intraday" | "manual"
      sync_status: "queued" | "running" | "success" | "partial" | "failed"
      vat_mode: "inclusive" | "exclusive" | "unknown"
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
      business_type: [
        "ecommerce",
        "affiliate",
        "agency",
        "brand",
        "dropshipping",
      ],
      confidence_level: ["low", "medium", "high"],
      connection_provider: ["google_ads", "merchant_center"],
      connection_status: ["active", "needs_reauth", "revoked", "error"],
      entity_type: ["account", "campaign", "ad_group", "product", "category"],
      member_role: ["owner", "admin", "member", "viewer"],
      recommendation_kind: [
        "scale",
        "keep",
        "watch",
        "fix",
        "reduce",
        "exclude",
        "pause",
        "needs_more_data",
        "good_roas_bad_profit",
        "wasted_spend",
        "tracking_issue",
        "feed_issue",
        "low_margin_pmax",
      ],
      recommendation_severity: ["info", "low", "medium", "high", "critical"],
      recommendation_status: [
        "open",
        "acknowledged",
        "applied",
        "dismissed",
        "expired",
      ],
      subscription_plan: ["free", "starter", "growth", "agency"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
      sync_kind: ["backfill", "daily", "lag_repull", "intraday", "manual"],
      sync_status: ["queued", "running", "success", "partial", "failed"],
      vat_mode: ["inclusive", "exclusive", "unknown"],
    },
  },
} as const
