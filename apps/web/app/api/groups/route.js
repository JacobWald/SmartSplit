import { NextResponse } from 'next/server'
import { createSSRClientFromRequest } from '../../../lib/supabaseSSR.js'
import { supabaseServer } from '../../../lib/supabaseServer.js'

export async function POST(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: response.headers })
    }
    const owner_id = userData.user.id

    const { name, base_currency = 'USD', member_ids = [] } = await request.json()

    const { data: groups, error: gErr } = await supabaseServer
      .from('groups')
      .insert([{ name, base_currency, owner_id }])
      .select()
      .limit(1)
    if (gErr) throw gErr
    const group = groups[0]

    const invited = [...new Set(member_ids)].filter(id => id && id !== owner_id)
    const now = new Date().toISOString()
    const rows = [
      { group_id: group.id, user_id: owner_id, role: 'ADMIN', status: 'ACCEPTED', joined_at: now },
      ...invited.map(id => ({ group_id: group.id, user_id: id, role: 'MEMBER', status: 'INVITED', invited_at: now })),
    ]
    const { error: gmErr } = await supabaseServer.from('group_members').insert(rows)
    if (gmErr) throw gmErr

    return NextResponse.json(group, { status: 201, headers: response.headers })
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: response.headers })
    }
    const uid = userData.user.id

    const { data: gmMine, error: gmMineErr } = await supabaseServer
      .from('group_members')
      .select('group_id')
      .eq('user_id', uid)
    if (gmMineErr) throw gmMineErr

    const groupIds = [...new Set((gmMine ?? []).map(r => r.group_id))]
    if (groupIds.length === 0) {
      return NextResponse.json([], { status: 200, headers: response.headers })
    }

    const { data: groups, error: gErr } = await supabaseServer
      .from('groups')
      .select('id, name, base_currency')
      .in('id', groupIds)
    if (gErr) throw gErr

    const { data: members, error: mErr } = await supabaseServer
      .from('group_members')
      .select('group_id, user_id, role, status')
      .in('group_id', groupIds)
    if (mErr) throw mErr

    const userIds = [...new Set(members.map(m => m.user_id))]
    const { data: profiles, error: pErr } = await supabaseServer
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    if (pErr) throw pErr

    const nameById = new Map(profiles.map(p => [p.id, p.full_name]))
    const membersByGroup = Object.fromEntries(groupIds.map(id => [id, []]))
    for (const m of members) {
      membersByGroup[m.group_id].push({
        user_id: m.user_id,
        full_name: nameById.get(m.user_id) || '(unknown)',
        role: m.role,
        status: m.status,
      })
    }

    const result = groups.map(g => ({
      id: g.id,
      name: g.name,
      base_currency: g.base_currency,
      members: membersByGroup[g.id] || [],
    }))

    return NextResponse.json(result, { status: 200, headers: response.headers })
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
