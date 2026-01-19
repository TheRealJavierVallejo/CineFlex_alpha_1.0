
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
            projects: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                    last_synced: string
                    settings: Json
                    user_id: string
                }
                Insert: {
                    id: string
                    name: string
                    created_at?: string
                    last_synced?: string
                    settings?: Json
                    user_id?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                    last_synced?: string
                    settings?: Json
                    user_id?: string
                }
            }
            scripts: {
                Row: {
                    id: string
                    project_id: string
                    content: Json
                    last_saved: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    content?: Json
                    last_saved?: string
                }
                Update: {
                    id?: string
                    project_id?: string
                    content?: Json
                    last_saved?: string
                }
            }
        }
    }
}
