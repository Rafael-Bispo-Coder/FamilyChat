import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nhhhxemuuzydcikicvun.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_h3fK4XGDpYWFpW3MMAHBtg_0-9jXUv9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type Profile = {
  id: string
  name: string
  avatar_url: string | null
  role: string
  family_code: string
  created_at: string
}

export type Group = {
  id: string
  name: string
  family_code: string
  created_by: string
  created_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  profiles?: Profile
}

export type Message = {
  id: string
  group_id: string | null
  sender_id: string
  receiver_id: string | null
  content: string
  created_at: string
  profiles?: Profile
}
