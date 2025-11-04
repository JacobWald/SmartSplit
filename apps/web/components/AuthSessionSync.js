'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthSessionSync() {
  useEffect(() => {
    supabase.auth.getSession() // loads session and writes cookies if needed
    const { data: sub } = supabase.auth.onAuthStateChange(() => {})
    return () => sub?.subscription?.unsubscribe()
  }, [])
  return null
}
