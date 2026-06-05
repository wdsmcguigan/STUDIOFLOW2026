export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      cast_day_statuses: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string | null
          person_id: string
          project_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string | null
          person_id: string
          project_id: string
          source?: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          person_id?: string
          project_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cast_day_statuses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cast_day_statuses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          aliases: string[]
          cast_person_id: string | null
          created_at: string
          description: string | null
          id: string
          primary_name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          cast_person_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          primary_name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          cast_person_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          primary_name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_cast_person_id_fkey"
            columns: ["cast_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          ordinal: number
          project_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          ordinal?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          ordinal?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      element_categories: {
        Row: {
          code: string | null
          created_at: string
          department_id: string | null
          id: string
          name: string
          ordinal: number
          project_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
          ordinal?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
          ordinal?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "element_categories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "element_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      elements: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          name: string
          project_id: string
          updated_at: string
          vendor_org_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          name: string
          project_id: string
          updated_at?: string
          vendor_org_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
          vendor_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "element_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elements_vendor_org_id_fkey"
            columns: ["vendor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed: number | null
          created_at: string
          created_by: string
          error: string | null
          id: string
          params: Json
          progress: number
          project_id: string
          result: Json | null
          status: string
          total: number | null
          type: string
          updated_at: string
          workflow_run_id: string | null
        }
        Insert: {
          completed?: number | null
          created_at?: string
          created_by: string
          error?: string | null
          id?: string
          params?: Json
          progress?: number
          project_id: string
          result?: Json | null
          status?: string
          total?: number | null
          type: string
          updated_at?: string
          workflow_run_id?: string | null
        }
        Update: {
          completed?: number | null
          created_at?: string
          created_by?: string
          error?: string | null
          id?: string
          params?: Json
          progress?: number
          project_id?: string
          result?: Json | null
          status?: string
          total?: number | null
          type?: string
          updated_at?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          geo_lat: number | null
          geo_lng: number | null
          id: string
          name: string
          project_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          name: string
          project_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          name?: string
          project_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          project_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          project_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          org_id: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          org_id?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      revisions: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          ordinal: number
          project_id: string
        }
        Insert: {
          active?: boolean
          color: string
          created_at?: string
          id?: string
          name: string
          ordinal: number
          project_id: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          ordinal?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_characters: {
        Row: {
          anchor_state: string
          character_id: string
          confidence: number | null
          created_at: string
          id: string
          notes: string | null
          presence_type: string
          provenance: string
          scene_id: string
          segment_id: string | null
          status: string
          text_anchor: Json | null
          updated_at: string
        }
        Insert: {
          anchor_state?: string
          character_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          presence_type: string
          provenance?: string
          scene_id: string
          segment_id?: string | null
          status?: string
          text_anchor?: Json | null
          updated_at?: string
        }
        Update: {
          anchor_state?: string
          character_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          presence_type?: string
          provenance?: string
          scene_id?: string
          segment_id?: string | null
          status?: string
          text_anchor?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_characters_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_elements: {
        Row: {
          anchor_state: string
          confidence: number | null
          created_at: string
          element_id: string
          id: string
          notes: string | null
          provenance: string
          quantity: number | null
          scene_id: string
          segment_id: string | null
          status: string
          text_anchor: Json | null
          updated_at: string
        }
        Insert: {
          anchor_state?: string
          confidence?: number | null
          created_at?: string
          element_id: string
          id?: string
          notes?: string | null
          provenance?: string
          quantity?: number | null
          scene_id: string
          segment_id?: string | null
          status?: string
          text_anchor?: Json | null
          updated_at?: string
        }
        Update: {
          anchor_state?: string
          confidence?: number | null
          created_at?: string
          element_id?: string
          id?: string
          notes?: string | null
          provenance?: string
          quantity?: number | null
          scene_id?: string
          segment_id?: string | null
          status?: string
          text_anchor?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_elements_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_elements_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_revision_changes: {
        Row: {
          change_kind: string
          created_at: string
          revision_id: string
          scene_id: string
        }
        Insert: {
          change_kind: string
          created_at?: string
          revision_id: string
          scene_id: string
        }
        Update: {
          change_kind?: string
          created_at?: string
          revision_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_revision_changes_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_revision_changes_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_segments: {
        Row: {
          created_at: string
          id: string
          label: string | null
          ordinal: number
          page_eighths: number
          project_id: string
          scene_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          ordinal?: number
          page_eighths?: number
          project_id: string
          scene_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          ordinal?: number
          page_eighths?: number
          project_id?: string
          scene_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_segments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_segments_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_sources: {
        Row: {
          content_hash: string
          scene_id: string
          script_version_id: string
          text_anchor_end: number
          text_anchor_start: number
        }
        Insert: {
          content_hash: string
          scene_id: string
          script_version_id: string
          text_anchor_end: number
          text_anchor_start: number
        }
        Update: {
          content_hash?: string
          scene_id?: string
          script_version_id?: string
          text_anchor_end?: number
          text_anchor_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "scene_sources_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_sources_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          created_at: string
          id: string
          int_ext: string | null
          location_slug: string | null
          number_locked: boolean
          ordinal: number
          page_eighths: number | null
          project_id: string
          scene_number: string | null
          script_day: string | null
          script_id: string
          set_id: string | null
          status: string
          synopsis: string | null
          time_of_day: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          int_ext?: string | null
          location_slug?: string | null
          number_locked?: boolean
          ordinal: number
          page_eighths?: number | null
          project_id: string
          scene_number?: string | null
          script_day?: string | null
          script_id: string
          set_id?: string | null
          status?: string
          synopsis?: string | null
          time_of_day?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          int_ext?: string | null
          location_slug?: string | null
          number_locked?: boolean
          ordinal?: number
          page_eighths?: number | null
          project_id?: string
          scene_number?: string | null
          script_day?: string | null
          script_id?: string
          set_id?: string | null
          status?: string
          synopsis?: string | null
          time_of_day?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
        ]
      }
      script_versions: {
        Row: {
          created_by: string
          id: string
          imported_at: string
          label: string
          locked: boolean
          raw_source: string
          revision_id: string | null
          script_id: string
          source_format: string
        }
        Insert: {
          created_by: string
          id?: string
          imported_at?: string
          label: string
          locked?: boolean
          raw_source: string
          revision_id?: string | null
          script_id: string
          source_format?: string
        }
        Update: {
          created_by?: string
          id?: string
          imported_at?: string
          label?: string
          locked?: boolean
          raw_source?: string
          revision_id?: string | null
          script_id?: string
          source_format?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          created_at: string
          id: string
          project_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_days: {
        Row: {
          created_at: string
          date: string | null
          day_type: string
          id: string
          name: string | null
          ordinal: number
          project_id: string
          studio_or_location: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          day_type?: string
          id?: string
          name?: string | null
          ordinal?: number
          project_id: string
          studio_or_location?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          day_type?: string
          id?: string
          name?: string | null
          ordinal?: number
          project_id?: string
          studio_or_location?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoot_days_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      strips: {
        Row: {
          banner_text: string | null
          created_at: string
          id: string
          ordinal: number
          project_id: string
          scene_segment_id: string | null
          shoot_day_id: string
          type: string
          updated_at: string
        }
        Insert: {
          banner_text?: string | null
          created_at?: string
          id?: string
          ordinal?: number
          project_id: string
          scene_segment_id?: string | null
          shoot_day_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          banner_text?: string | null
          created_at?: string
          id?: string
          ordinal?: number
          project_id?: string
          scene_segment_id?: string | null
          shoot_day_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strips_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strips_scene_segment_id_fkey"
            columns: ["scene_segment_id"]
            isOneToOne: false
            referencedRelation: "scene_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strips_shoot_day_id_fkey"
            columns: ["shoot_day_id"]
            isOneToOne: false
            referencedRelation: "shoot_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      merge_characters: {
        Args: { p_absorbed: string; p_survivor: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

