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
          email: string
          name: string | null
          user_type: 'provider' | 'seeker' | 'both'
          profile_photo: string | null
          phone: string | null
          location: unknown | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          user_type?: 'provider' | 'seeker' | 'both'
          profile_photo?: string | null
          phone?: string | null
          location?: unknown | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          user_type?: 'provider' | 'seeker' | 'both'
          profile_photo?: string | null
          phone?: string | null
          location?: unknown | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          parent_id: string | null
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          parent_id?: string | null
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          parent_id?: string | null
          slug?: string
          created_at?: string
        }
      }
      service_ads: {
        Row: {
          id: string
          provider_id: string
          title: string
          description: string
          category_id: string
          price_type: 'fixed' | 'hourly' | 'quote'
          price_min: number | null
          price_max: number | null
          service_area: unknown | null
          photos: string[]
          tags: string[]
          status: 'draft' | 'active' | 'paused' | 'expired'
          views_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          title: string
          description: string
          category_id: string
          price_type?: 'fixed' | 'hourly' | 'quote'
          price_min?: number | null
          price_max?: number | null
          service_area?: unknown | null
          photos?: string[]
          tags?: string[]
          status?: 'draft' | 'active' | 'paused' | 'expired'
          views_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          title?: string
          description?: string
          category_id?: string
          price_type?: 'fixed' | 'hourly' | 'quote'
          price_min?: number | null
          price_max?: number | null
          service_area?: unknown | null
          photos?: string[]
          tags?: string[]
          status?: 'draft' | 'active' | 'paused' | 'expired'
          views_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          reviewer_id: string
          service_ad_id: string
          provider_id: string
          rating: number
          comment: string | null
          photos: string[]
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          reviewer_id: string
          service_ad_id: string
          provider_id: string
          rating: number
          comment?: string | null
          photos?: string[]
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          reviewer_id?: string
          service_ad_id?: string
          provider_id?: string
          rating?: number
          comment?: string | null
          photos?: string[]
          verified?: boolean
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          service_ad_id: string | null
          content: string
          message_type: 'text' | 'quote_request' | 'quote_response'
          quote_amount: number | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          service_ad_id?: string | null
          content: string
          message_type?: 'text' | 'quote_request' | 'quote_response'
          quote_amount?: number | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          service_ad_id?: string | null
          content?: string
          message_type?: 'text' | 'quote_request' | 'quote_response'
          quote_amount?: number | null
          read_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      conversations: {
        Row: {
          user1_id: string
          user2_id: string
          service_ad_id: string | null
          last_message_at: string
        }
      }
    }
    Functions: {
      increment_ad_views: {
        Args: {
          ad_id: string
        }
        Returns: void
      }
      get_provider_rating: {
        Args: {
          provider_uuid: string
        }
        Returns: number
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type ServiceAd = Database['public']['Tables']['service_ads']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Message = Database['public']['Tables']['messages']['Row']