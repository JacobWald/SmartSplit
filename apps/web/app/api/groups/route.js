import { NextResponse } from 'next/server'
import { createSSRClientFromRequest } from '../../../lib/supabaseSSR.js'
import { supabaseServer } from '../../../lib/supabaseServer.js'

// Create a new group
export async function POST(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: response.headers }
      )
    }
    const owner_id = userData.user.id

    const { name, base_currency = 'USD', member_ids = [] } = await request.json()

    const { data: groups, error: gErr } = await supabaseServer
      .from('groups')
      .insert([{ name, base_currency, owner_id, active: true }])
      .select()
      .limit(1)

    if (gErr) throw gErr
    const group = groups[0]

    const invited = [...new Set(member_ids)].filter(id => id && id !== owner_id)
    const now = new Date().toISOString()

    const rows = [
      {
        group_id: group.id,
        user_id: owner_id,
        role: 'ADMIN',
        status: 'ACCEPTED',
        joined_at: now,
      },
      ...invited.map(id => ({
        group_id: group.id,
        user_id: id,
        role: 'MEMBER',
        status: 'INVITED',
        invited_at: now,
      })),
    ]

    const { error: gmErr } = await supabaseServer.from('group_members').insert(rows)
    if (gmErr) throw gmErr

    return NextResponse.json(group, { status: 201, headers: response.headers })
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}

// Get groups for the current user (or a specific group if ?groupId=... is provided)
export async function GET(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request)

    // who is the caller?
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: response.headers }
      )
    }
    const uid = userData.user.id

    // optional ?groupId=... coming from GroupDetailPage
    const groupIdParam = request.nextUrl.searchParams.get('groupId')

    // 🔹 INCLUDE BOTH ACCEPTED + INVITED memberships for this user
    const { data: gmMine, error: gmMineErr } = await supabaseServer
      .from('group_members')
      .select('group_id, status')
      .eq('user_id', uid)
      .in('status', ['ACCEPTED', 'INVITED'])

    if (gmMineErr) throw gmMineErr

    const groupIds = [...new Set((gmMine ?? []).map(r => r.group_id))]
    if (groupIds.length === 0) {
      // no accepted or invited groups at all
      return NextResponse.json(
        groupIdParam ? null : [],
        { status: 200, headers: response.headers }
      )
    }

    // fetch groups
    const { data: groups, error: gErr } = await supabaseServer
      .from('groups')
      .select('id, name, base_currency, active')
      .in('id', groupIds)

    if (gErr) throw gErr

    // fetch members for those groups
    const { data: members, error: mErr } = await supabaseServer
      .from('group_members')
      .select('group_id, user_id, role, status')
      .in('group_id', groupIds)

    if (mErr) throw mErr

    // resolve member names (full_name + username)
    const userIds = [...new Set(members.map(m => m.user_id))]

    const { data: profiles, error: pErr } = await supabaseServer
      .from('profiles')
      .select('id, username, full_name')
      .in('id', userIds)

    if (pErr) throw pErr

    const profileById = new Map(
      profiles.map(p => [
        p.id,
        {
          full_name: p.full_name ?? null,
          username: p.username ?? null,
        },
      ])
    )

    const membersByGroup = Object.fromEntries(groupIds.map(id => [id, []]))

    for (const m of members) {
      const prof = profileById.get(m.user_id) || {}
      membersByGroup[m.group_id].push({
        user_id: m.user_id,
        full_name: prof.full_name || prof.username || '(unknown)',
        username: prof.username || null,
        role: m.role,
        status: m.status,
      })
    }

    const result = groups.map(g => ({
      id: g.id,
      name: g.name,
      base_currency: g.base_currency,
      active: g.active,
      members: membersByGroup[g.id] || [],
    }))

    // when ?groupId=... is provided, return just that group (or null)
    if (groupIdParam) {
      const wanted = result.find(g => g.id === groupIdParam)
      return NextResponse.json(
        wanted ?? null,
        { status: 200, headers: response.headers }
      )
    }

    // otherwise return all groups
    return NextResponse.json(
      result,
      { status: 200, headers: response.headers }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}

// Toggle a group's active flag (admin only)
export async function PATCH(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: response.headers }
      )
    }
    const currentUserId = userData.user.id

    const body = await request.json()
    const { group_id, active } = body || {}

    if (!group_id || typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing group_id or active (boolean)' },
        { status: 400, headers: response.headers }
      )
    }

    // Check caller is ADMIN in this group
    const { data: gm, error: gmErr } = await supabaseServer
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('user_id', currentUserId)
      .single()

    if (gmErr || !gm || gm.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only group admins can change active status' },
        { status: 403, headers: response.headers }
      )
    }

    const { data: updated, error: updErr } = await supabaseServer
      .from('groups')
      .update({ active })
      .eq('id', group_id)
      .select('id, name, base_currency, active')
      .single()

    if (updErr) throw updErr

    return NextResponse.json(
      updated,
      { status: 200, headers: response.headers }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}
