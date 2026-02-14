"use client"

import { createClient, SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  console.log("SUPABASE_URL:", supabaseUrl)
  console.log("SUPABASE_KEY exists:", !!supabaseAnonKey)

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

  return supabaseClient
}
