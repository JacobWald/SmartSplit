import { NextResponse } from 'next/server';
import { createSSRClientFromRequest } from '../../../lib/supabaseSSR.js';
import { supabaseServer } from '../../../lib/supabaseServer.js';

// Get expenses for a group or user
export async function GET(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request);

    // Who is the caller?
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: response.headers },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');

    if (groupId && userId) {
      return NextResponse.json(
        { error: 'Provide either groupId or userId, not both' },
        { status: 400, headers: response.headers },
      );
    }

    if (!groupId && !userId) {
      return NextResponse.json(
        { error: 'Missing groupId or userId query parameter' },
        { status: 400, headers: response.headers },
      );
    }

    // =====================================
    // 1) GROUP VIEW: expenses for a group
    // =====================================
    if (groupId) {
      const { data: expenses, error: eErr } = await supabaseServer
        .from('expenses')
        .select(
          `
          id,
          group_id,
          title,
          amount,
          note,
          occurred_at,
          fulfilled,
          assigned:assigned_expenses (
            id,
            user_id,
            amount,
            created_at,
            fulfilled
          )
        `,
        )
        .eq('group_id', groupId)
        .order('occurred_at', { ascending: false });

      if (eErr) throw eErr;

      return NextResponse.json(expenses ?? [], {
        status: 200,
        headers: response.headers,
      });
    }

    // =====================================
    // 2) USER VIEW: expenses user is attached to
    //    (via assigned_expenses.user_id)
    // =====================================
    const { data: assignments, error: aErr } = await supabaseServer
      .from('assigned_expenses')
      .select(
        `
        id,
        expense_id,
        user_id,
        amount,
        created_at,
        fulfilled
      `,
      )
      .eq('user_id', userId);

    if (aErr) throw aErr;

    if (!assignments || assignments.length === 0) {
      // User isn't attached to any assigned_expenses
      return NextResponse.json([], {
        status: 200,
        headers: response.headers,
      });
    }

    const expenseIds = [
      ...new Set(assignments.map((a) => a.expense_id)),
    ];

    const { data: expensesData, error: e2Err } = await supabaseServer
      .from('expenses')
      .select(
        `
        id,
        group_id,
        title,
        amount,
        note,
        occurred_at,
        fulfilled
      `,
      )
      .in('id', expenseIds);

    if (e2Err) throw e2Err;

    // Group assignments by expense
    const assignmentsByExpense = new Map();
    for (const a of assignments) {
      if (!assignmentsByExpense.has(a.expense_id)) {
        assignmentsByExpense.set(a.expense_id, []);
      }
      assignmentsByExpense.get(a.expense_id).push({
        id: a.id,
        user_id: a.user_id,
        amount: a.amount,
        created_at: a.created_at,
        fulfilled: a.fulfilled,
      });
    }

    const result =
      (expensesData ?? []).map((exp) => ({
        ...exp,
        // Only this user’s assignments for that expense
        assigned: assignmentsByExpense.get(exp.id) ?? [],
      })) ?? [];

    return NextResponse.json(result, {
      status: 200,
      headers: response.headers,
    });
  } catch (err) {
    console.error('GET /api/expenses error:', err);
    const message =
      err instanceof Error ? err.message : 'Server error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
