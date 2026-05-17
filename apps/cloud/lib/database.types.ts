export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          title: string;
          agent_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          agent_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          agent_name?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          name: string;
          description: string;
          provider: string;
          system_prompt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          provider: string;
          system_prompt?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          provider?: string;
          system_prompt?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
