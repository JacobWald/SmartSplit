import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export function createSSRClientFromRequest(request) {
  const response = new NextResponse(null)

  // Parse request cookies -> [{ name, value }]
  const raw = request.headers.get('cookie') || ''
  const parsed = raw
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(kv => {
      const eq = kv.indexOf('=')
      if (eq === -1) return null
      return { name: kv.slice(0, eq).trim(), value: kv.slice(eq + 1).trim() }
    })
    .filter(Boolean)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parsed
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  return { supabase, response }
}
