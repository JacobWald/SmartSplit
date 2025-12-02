import { NextResponse } from 'next/server'
import { createSSRClientFromRequest } from '../../../../lib/supabaseSSR.js'

export async function GET(request) {
  const { supabase, response } = createSSRClientFromRequest(request)

  const { data: userData, error } = await supabase.auth.getUser()
  if (error || !userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: response.headers })
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', userData.user.id)
    .single()

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500, headers: response.headers })
  }

  return NextResponse.json(profile, { status: 200, headers: response.headers })
}
