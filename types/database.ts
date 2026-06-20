export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Quiz question shape stored in quizzes.questions JSONB ───────────────────

export interface QuizQuestion {
  id: string;
  text: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: string[];
  correct_answer: string | string[];
  explanation?: string;
  points: number;
}

export interface QuizAnswers {
  [questionId: string]: string | string[];
}

// ─── Database schema ──────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          slug: string;
          thumbnail_url: string | null;
          difficulty_level: "complete_beginner" | "some_knowledge" | "intermediate" | "advanced" | null;
          is_published: boolean;
          creator_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          slug: string;
          thumbnail_url?: string | null;
          difficulty_level?: "complete_beginner" | "some_knowledge" | "intermediate" | "advanced" | null;
          is_published?: boolean;
          creator_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          slug?: string;
          thumbnail_url?: string | null;
          difficulty_level?: "complete_beginner" | "some_knowledge" | "intermediate" | "advanced" | null;
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          content: string | null;
          content_type: "video" | "text" | "interactive" | "audio";
          lesson_type: "standard" | "remedial" | "challenge";
          slides: Json | null;
          video_url: string | null;
          duration_minutes: number | null;
          position: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          content?: string | null;
          content_type?: "video" | "text" | "interactive" | "audio";
          lesson_type?: "standard" | "remedial" | "challenge";
          slides?: Json | null;
          video_url?: string | null;
          duration_minutes?: number | null;
          position?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string | null;
          content_type?: "video" | "text" | "interactive" | "audio";
          lesson_type?: "standard" | "remedial" | "challenge";
          slides?: Json | null;
          video_url?: string | null;
          duration_minutes?: number | null;
          position?: number;
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      adaptive_profiles: {
        Row: {
          id: string;
          user_id: string;
          rolling_score: number | null;
          difficulty_level: "foundational" | "standard" | "advanced";
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rolling_score?: number | null;
          difficulty_level?: "foundational" | "standard" | "advanced";
          updated_at?: string;
        };
        Update: {
          rolling_score?: number | null;
          difficulty_level?: "foundational" | "standard" | "advanced";
          updated_at?: string;
        };
        Relationships: [];
      };

      quizzes: {
        Row: {
          id: string;
          lesson_id: string | null;
          module_id: string | null;
          title: string;
          description: string | null;
          questions: Json;
          passing_score: number;
          time_limit_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id?: string | null;
          module_id?: string | null;
          title: string;
          description?: string | null;
          questions?: Json;
          passing_score?: number;
          time_limit_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          lesson_id?: string | null;
          module_id?: string | null;
          title?: string;
          description?: string | null;
          questions?: Json;
          passing_score?: number;
          time_limit_minutes?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          answers: Json;
          score: number | null;
          passed: boolean | null;
          time_taken_seconds: number | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          user_id: string;
          answers?: Json;
          score?: number | null;
          passed?: boolean | null;
          time_taken_seconds?: number | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          answers?: Json;
          score?: number | null;
          passed?: boolean | null;
          time_taken_seconds?: number | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };

      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          target_date: string | null;
          status: "active" | "completed" | "paused" | "abandoned";
          progress: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          target_date?: string | null;
          status?: "active" | "completed" | "paused" | "abandoned";
          progress?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          target_date?: string | null;
          status?: "active" | "completed" | "paused" | "abandoned";
          progress?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      tasks: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          priority: "low" | "medium" | "high";
          status: "todo" | "in_progress" | "done";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id?: string | null;
          title: string;
          description?: string | null;
          due_date?: string | null;
          priority?: "low" | "medium" | "high";
          status?: "todo" | "in_progress" | "done";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          goal_id?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          priority?: "low" | "medium" | "high";
          status?: "todo" | "in_progress" | "done";
          updated_at?: string;
        };
        Relationships: [];
      };

      weak_spots: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          topic: string;
          description: string | null;
          confidence_level: number | null;
          quiz_attempt_id: string | null;
          resolved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          topic: string;
          description?: string | null;
          confidence_level?: number | null;
          quiz_attempt_id?: string | null;
          resolved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string | null;
          topic?: string;
          description?: string | null;
          confidence_level?: number | null;
          quiz_attempt_id?: string | null;
          resolved?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          enrolled_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          enrolled_at?: string;
          completed_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
        };
        Relationships: [];
      };

      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed: boolean;
          completed_at: string | null;
          last_position_seconds: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          completed?: boolean;
          completed_at?: string | null;
          last_position_seconds?: number;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          last_position_seconds?: number;
        };
        Relationships: [];
      };

      tutor_sessions: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      tutor_messages: {
        Row: {
          id: string;
          session_id: string;
          role: "user" | "assistant";
          content: string;
          tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: "user" | "assistant";
          content: string;
          tokens_used?: number | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          tokens_used?: number | null;
        };
        Relationships: [];
      };
    };

    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      difficulty_level: "complete_beginner" | "some_knowledge" | "intermediate" | "advanced";
      content_type: "video" | "text" | "interactive" | "audio";
      goal_status: "active" | "completed" | "paused" | "abandoned";
      task_priority: "low" | "medium" | "high";
      task_status: "todo" | "in_progress" | "done";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
