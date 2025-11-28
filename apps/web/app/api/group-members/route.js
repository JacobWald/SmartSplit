import { NextResponse } from 'next/server';
import { createSSRClientFromRequest } from '@/lib/supabaseSSR';
import { supabaseServer } from '@/lib/supabaseServer';

//Update a group member's role
export async function PATCH(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request);

    // Auth
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: response.headers }
      );
    }
    const currentUserId = userData.user.id;

    // Parse body
    const body = await request.json();
    const { group_id, user_id, role } = body || {};

    if (!group_id || !user_id || !role) {
      return NextResponse.json(
        { error: 'Missing group_id, user_id, or role' },
        { status: 400, headers: response.headers }
      );
    }

    if (!['MODERATOR', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be MODERATOR or MEMBER' },
        { status: 400, headers: response.headers }
      );
    }

    // Check caller is ADMIN in this group
    const { data: gm, error: gmErr } = await supabaseServer
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('user_id', currentUserId)
      .single();

    if (gmErr || !gm || gm.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only group admins can change member roles' },
        { status: 403, headers: response.headers }
      );
    }

    // Update target member's role
    const { data: updated, error: updErr } = await supabaseServer
      .from('group_members')
      .update({ role })
      .eq('group_id', group_id)
      .eq('user_id', user_id)
      .select('id, group_id, user_id, role, status')
      .single();

    if (updErr) {
      console.error('Error updating member role:', updErr);
      throw updErr;
    }

    return NextResponse.json(updated, {
      status: 200,
      headers: response.headers,
    });
  } catch (err) {
    console.error('PATCH /api/group-members error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
