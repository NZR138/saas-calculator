"use client"

import { createClient, SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = "https://bwtrrphotmhuilkxbxuq.supabase.co"
  const supabaseAnonKey = "sb_publishable_KVQVzrj712-OEXwvxC3xxQ_kY90Vur4"

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

  return supabaseClient
}
