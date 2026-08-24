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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      android_waitlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      cookbook_thumbnail_mapping: {
        Row: {
          cookbook_id: number | null
          created_at: string
          id: number
          order: number
          recipe_id: number
          user_id: string
        }
        Insert: {
          cookbook_id?: number | null
          created_at?: string
          id?: number
          order: number
          recipe_id: number
          user_id: string
        }
        Update: {
          cookbook_id?: number | null
          created_at?: string
          id?: number
          order?: number
          recipe_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cookbook_thumbnail_mapping_cookbook_id_fkey"
            columns: ["cookbook_id"]
            isOneToOne: false
            referencedRelation: "cookbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cookbook_thumbnail_mapping_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      cookbooks: {
        Row: {
          created_at: string
          id: number
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      directions: {
        Row: {
          created_at: string
          desc: string
          id: number
          is_heading: boolean | null
          order: number
          recipe_id: number
        }
        Insert: {
          created_at?: string
          desc: string
          id?: number
          is_heading?: boolean | null
          order: number
          recipe_id: number
        }
        Update: {
          created_at?: string
          desc?: string
          id?: number
          is_heading?: boolean | null
          order?: number
          recipe_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "directions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      exception_log: {
        Row: {
          context: string | null
          created_at: string
          error_details: Json | null
          error_message: string | null
          file: string | null
          function: string | null
          id: number
          line: number | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          file?: string | null
          function?: string | null
          id?: number
          line?: number | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          file?: string | null
          function?: string | null
          id?: number
          line?: number | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follow_type: string
          follows_cookbook_id: number | null
          follows_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          follow_type?: string
          follows_cookbook_id?: number | null
          follows_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          follow_type?: string
          follows_cookbook_id?: number | null
          follows_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follows_cookbook_id_fkey"
            columns: ["follows_cookbook_id"]
            isOneToOne: false
            referencedRelation: "cookbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_follows_user_id_fkey1"
            columns: ["follows_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_list: {
        Row: {
          checked: boolean
          checked_at: string | null
          created_at: string
          id: number
          keyword: string | null
          name: string
          quantity: string | null
          user_id: string | null
        }
        Insert: {
          checked?: boolean
          checked_at?: string | null
          created_at?: string
          id?: number
          keyword?: string | null
          name: string
          quantity?: string | null
          user_id?: string | null
        }
        Update: {
          checked?: boolean
          checked_at?: string | null
          created_at?: string
          id?: number
          keyword?: string | null
          name?: string
          quantity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      households: {
        Row: {
          created_at: string
          id: number
          member_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          member_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: number
          member_id?: string
          owner_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          created_at: string
          desc: string
          id: number
          is_heading: boolean | null
          keyword: string | null
          measurement: string | null
          order: number
          recipe_id: number
        }
        Insert: {
          created_at?: string
          desc: string
          id?: number
          is_heading?: boolean | null
          keyword?: string | null
          measurement?: string | null
          order: number
          recipe_id: number
        }
        Update: {
          created_at?: string
          desc?: string
          id?: number
          is_heading?: boolean | null
          keyword?: string | null
          measurement?: string | null
          order?: number
          recipe_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      mealplan_recipe_mapping: {
        Row: {
          created_at: string
          date: string
          id: number
          recipe_id: number
          type: Database["public"]["Enums"]["Meal Plan Types"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          recipe_id: number
          type: Database["public"]["Enums"]["Meal Plan Types"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          recipe_id?: number
          type?: Database["public"]["Enums"]["Meal Plan Types"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mealplan_recipe_mapping_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: number
          name: string
          notes: string | null
          rating: number | null
          request: string | null
          response: string | null
          source_text: string
          source_url: string | null
          thumbnail: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          notes?: string | null
          rating?: number | null
          request?: string | null
          response?: string | null
          source_text?: string
          source_url?: string | null
          thumbnail?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          notes?: string | null
          rating?: number | null
          request?: string | null
          response?: string | null
          source_text?: string
          source_url?: string | null
          thumbnail?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipes_mapping: {
        Row: {
          cookbook_id: number
          created_at: string
          id: number
          recipe_id: number
        }
        Insert: {
          cookbook_id: number
          created_at?: string
          id?: number
          recipe_id: number
        }
        Update: {
          cookbook_id?: number
          created_at?: string
          id?: number
          recipe_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_mapping_cookbook_id_fkey"
            columns: ["cookbook_id"]
            isOneToOne: false
            referencedRelation: "cookbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_mapping_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expiration_date: string
          original_transaction_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expiration_date: string
          original_transaction_id: string
          product_id: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expiration_date?: string
          original_transaction_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions_family: {
        Row: {
          created_at: string
          subscribed_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          subscribed_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          subscribed_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_family_subscribed_user_id_fkey"
            columns: ["subscribed_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_family_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: number
          sort_type_recipe:
            | Database["public"]["Enums"]["Recipe Sort Types"]
            | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          sort_type_recipe?:
            | Database["public"]["Enums"]["Recipe Sort Types"]
            | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          sort_type_recipe?:
            | Database["public"]["Enums"]["Recipe Sort Types"]
            | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          profile_pic_url: string | null
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id: string
          profile_pic_url?: string | null
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          profile_pic_url?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      Cookbooks_Following_ReadAll: {
        Args: { p_user_id: string }
        Returns: {
          id: number
          thumbnails: Json
          title: string
          user_id: string
        }[]
      }
      Cookbooks_ReadAll: {
        Args: { p_user_id: string }
        Returns: {
          id: number
          thumbnails: Json
          title: string
          user_id: string
        }[]
      }
      Cookbooks_WriteSortOrder: {
        Args: { p_payload: Json }
        Returns: undefined
      }
      FamilyPlan_JoinFamily_Accept: {
        Args: { p_owner_id: string; p_user_id: string }
        Returns: undefined
      }
      FamilyPlan_JoinFamily_GetSetupData: {
        Args: { p_owner_id: string; p_user_id: string }
        Returns: {
          display_name: string
          error_code: number
        }[]
      }
      FamilyPlan_ReadAllMembers: { Args: { p_user_id: string }; Returns: Json }
      Households_JoinHousehold_GetSetupData: {
        Args: { p_owner_id: string; p_user_id: string }
        Returns: {
          display_name: string
          error_code: number
        }[]
      }
      Households_ReadAllMembers: { Args: { p_user_id: string }; Returns: Json }
      Households_Write: {
        Args: { p_owner_id: string; p_user_id: string }
        Returns: undefined
      }
      MealPlanRecipes_ReadAll: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          created_at: string
          date: string
          id: number
          recipe_id: number
          type: Database["public"]["Enums"]["Meal Plan Types"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "mealplan_recipe_mapping"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      Recipe_Write: {
        Args: {
          _cookbook_ids: string
          _id: number
          _name: string
          _notes: string
          _rating: number
          _request: string
          _response: string
          _source_text: string
          _source_url: string
          _thumbnail: string
          _user_id: string
        }
        Returns: number
      }
      Recipes_Read: { Args: { _recipe_id: number }; Returns: Json }
      Recipes_ReadAll: { Args: { _user_id: string }; Returns: Json }
      Recipes_ReadAllFollowing: { Args: { p_user_id: string }; Returns: Json }
      Subscriptions_GetStatus: {
        Args: { p_user_id: string }
        Returns: {
          product_id: string
          status: string
        }[]
      }
      Users_Read: { Args: { p_user_id: string }; Returns: Json }
      Users_ReadAll: { Args: never; Returns: Json }
      Users_ReadAllFollowing: { Args: { p_user_id: string }; Returns: Json }
      Users_ReadAllFollowingCookbooks: {
        Args: { p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      "Meal Plan Types": "breakfast" | "lunch" | "dinner" | "snack"
      "Recipe Sort Types": "newest" | "oldest" | "highestRated"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      "Meal Plan Types": ["breakfast", "lunch", "dinner", "snack"],
      "Recipe Sort Types": ["newest", "oldest", "highestRated"],
    },
  },
} as const
