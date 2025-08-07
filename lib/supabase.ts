import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: string
          user_id: string
          platform: string
          platform_user_id: string
          username: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          platform_user_id: string
          username: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          platform_user_id?: string
          username?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string
          media_urls: string[] | null
          platforms: string[]
          status: 'draft' | 'scheduled' | 'published' | 'failed'
          scheduled_at: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content: string
          media_urls?: string[] | null
          platforms: string[]
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          scheduled_at?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          content?: string
          media_urls?: string[] | null
          platforms?: string[]
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          scheduled_at?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      post_analytics: {
        Row: {
          id: string
          post_id: string
          platform: string
          platform_post_id: string
          likes: number
          shares: number
          comments: number
          views: number | null
          engagement_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          platform: string
          platform_post_id: string
          likes?: number
          shares?: number
          comments?: number
          views?: number | null
          engagement_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          platform?: string
          platform_post_id?: string
          likes?: number
          shares?: number
          comments?: number
          views?: number | null
          engagement_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price_monthly: number
          price_yearly: number
          features: any
          limits: any
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          price_monthly: number
          price_yearly: number
          features?: any
          limits?: any
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          features?: any
          limits?: any
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          billing_cycle: string
          current_period_start: string
          current_period_end: string
          trial_end: string | null
          cancel_at: string | null
          canceled_at: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: string
          billing_cycle?: string
          current_period_start: string
          current_period_end: string
          trial_end?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: string
          billing_cycle?: string
          current_period_start?: string
          current_period_end?: string
          trial_end?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      payment_history: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          amount: number
          currency: string
          status: string
          description: string | null
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          amount: number
          currency?: string
          status: string
          description?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          amount?: number
          currency?: string
          status?: string
          description?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          metadata?: any
          created_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          resource_type: string
          count: number
          period_start: string
          period_end: string
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_type: string
          count?: number
          period_start: string
          period_end: string
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_type?: string
          count?: number
          period_start?: string
          period_end?: string
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}