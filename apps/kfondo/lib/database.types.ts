export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          slug: string;
          name: string;
          location: string;
          color_from: string;
          color_to: string;
          meta_title: string;
          meta_description: string;
          meta_image: string;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          location: string;
          color_from: string;
          color_to: string;
          meta_title: string;
          meta_description: string;
          meta_image: string;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          location?: string;
          color_from?: string;
          color_to?: string;
          meta_title?: string;
          meta_description?: string;
          meta_image?: string;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      event_editions: {
        Row: {
          id: string;
          event_id: string;
          year: number;
          date: string;
          status: "upcoming" | "completed" | "ready" | "preparing" | "cancelled";
          url: string | null;
          comment: string | null;
          notice: string | null;
          created_at: string;
          updated_at: string;
          records_blob_url: string | null;
          sorted_records_blob_url: string | null;
          kom_records_blob_url: string | null;
          kom_sorted_records_blob_url: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          year: number;
          date: string;
          status?: "upcoming" | "completed" | "ready" | "preparing" | "cancelled";
          url?: string | null;
          comment?: string | null;
          notice?: string | null;
          created_at?: string;
          updated_at?: string;
          records_blob_url?: string | null;
          sorted_records_blob_url?: string | null;
          kom_records_blob_url?: string | null;
          kom_sorted_records_blob_url?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          year?: number;
          date?: string;
          status?: "upcoming" | "completed" | "ready" | "preparing" | "cancelled";
          url?: string | null;
          comment?: string | null;
          notice?: string | null;
          created_at?: string;
          updated_at?: string;
          records_blob_url?: string | null;
          sorted_records_blob_url?: string | null;
          kom_records_blob_url?: string | null;
          kom_sorted_records_blob_url?: string | null;
        };
      };
      courses: {
        Row: {
          id: string;
          edition_id: string;
          course_type: string;
          name: string;
          distance: number;
          elevation: number;
          registered_count: number;
          has_kom: boolean;
          official_site_url: string | null;
          strava_url: string | null;
          ride_with_gps_url: string | null;
          gpx_blob_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          course_type: string;
          name: string;
          distance: number;
          elevation: number;
          registered_count?: number;
          has_kom?: boolean;
          official_site_url?: string | null;
          strava_url?: string | null;
          ride_with_gps_url?: string | null;
          gpx_blob_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          edition_id?: string;
          course_type?: string;
          name?: string;
          distance?: number;
          elevation?: number;
          registered_count?: number;
          has_kom?: boolean;
          official_site_url?: string | null;
          strava_url?: string | null;
          ride_with_gps_url?: string | null;
          gpx_blob_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventEditionRow = Database["public"]["Tables"]["event_editions"]["Row"];
export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

