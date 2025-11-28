import { NextResponse } from 'next/server';
import { createSSRClientFromRequest } from '@/lib/supabaseSSR';
import { supabaseServer } from '@/lib/supabaseServer';

// Update an assigned expense (e.g., mark as fulfilled)
export async function PATCH(request, context) {
  const { id } = await context.params;

  try {
    if (!id) {
      return NextResponse.json(
        { error: 'Missing assigned_expense id in URL' },
        { status: 400 },
      );
    }

    const { supabase, response } = createSSRClientFromRequest(request);

    // who is calling?
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: response.headers },
      );
    }
    const currentUserId = userData.user.id;

    const body = await request.json();
    const { fulfilled } = body;

    if (typeof fulfilled !== 'boolean') {
      return NextResponse.json(
        { error: 'fulfilled must be a boolean' },
        { status: 400, headers: response.headers },
      );
    }

    // Get assignment + parent expense + group
    const { data: assignment, error: aErr } = await supabaseServer
      .from('assigned_expenses')
      .select(
        `
        id,
        user_id,
        fulfilled,
        expense:expenses (
          id,
          group_id
        )
      `,
      )
      .eq('id', id)
      .single();

    if (aErr || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404, headers: response.headers },
      );
    }

    const expenseId = assignment.expense.id;
    const groupId = assignment.expense.group_id;

    // Check role in this group
    const { data: gm, error: gmErr } = await supabaseServer
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single();

    if (gmErr && gmErr.code !== 'PGRST116') {
      console.error('Group membership error:', gmErr);
    }

    const role = gm?.role ?? null;
    const isAdmin = role === 'ADMIN';
    const isModerator = role === 'MODERATOR';
    const isSelf = assignment.user_id === currentUserId;

    if (!isSelf && !isAdmin && !isModerator) {
      return NextResponse.json(
        { error: 'Not allowed to modify this payment status' },
        { status: 403, headers: response.headers },
      );
    }

    // Update this assigned_expenses row
    const { error: updErr } = await supabaseServer
      .from('assigned_expenses')
      .update({ fulfilled })
      .eq('id', id);

    if (updErr) {
      console.error('Error updating assignment fulfilled:', updErr);
      throw updErr;
    }

    // Recompute parent expense.fulfilled
    const { data: allAssignments, error: allErr } = await supabaseServer
      .from('assigned_expenses')
      .select('fulfilled')
      .eq('expense_id', expenseId);

    if (allErr) {
      console.error('Error loading all assignments:', allErr);
      throw allErr;
    }

    const allPaid =
      allAssignments.length > 0 &&
      allAssignments.every((row) => row.fulfilled === true);

    const { error: expErr } = await supabaseServer
      .from('expenses')
      .update({ fulfilled: allPaid })
      .eq('id', expenseId);

    if (expErr) {
      console.error('Error updating expense.fulfilled:', expErr);
      throw expErr;
    }

    return NextResponse.json(
      { success: true, expenseId, fulfilled, expenseFulfilled: allPaid },
      { status: 200, headers: response.headers },
    );
  } catch (err) {
    console.error('PATCH /api/assigned-expenses/[id] error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
