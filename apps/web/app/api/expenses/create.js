import { NextResponse } from 'next/server';
import { createSSRClientFromRequest } from '../../../../lib/supabaseSSR.js';
import { supabaseServer } from '../../../../lib/supabaseServer.js';

export async function POST(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: response.headers }
      );
    }

    const { title, amount, group_id, payer_id, assigned } =
      await request.json();

    if (!title || !amount || !group_id || !payer_id || !Array.isArray(assigned)) {
      return NextResponse.json(
        { error: 'Missing required fields for expense creation' },
        { status: 400, headers: response.headers }
      );
    }

    const totalAssigned = assigned.reduce(
      (sum, a) => sum + (Number(a.amount) || 0),
      0
    );

    // soft validation: amounts should roughly match
    if (Math.abs(totalAssigned - Number(amount)) > 0.05) {
      return NextResponse.json(
        {
          error:
            'Assigned amounts do not match total. Please recheck your split.',
        },
        { status: 400, headers: response.headers }
      );
    }

    const now = new Date().toISOString();

    const { data: expenseRows, error: expErr } = await supabaseServer
      .from('expenses')
      .insert([
        {
          title,
          amount,
          group_id,
          payer_id,
          currency: 'USD',
          occurred_at: now,
          qty: 1,
          unit_price: amount,
        },
      ])
      .select()
      .limit(1);

    if (expErr) {
      console.error(expErr);
      throw expErr;
    }

    const expense = expenseRows[0];

    const assignedRows = assigned.map((a) => ({
      expense_id: expense.id,
      user_id: a.user_id,
      amount: a.amount,
    }));

    const { error: assignErr } = await supabaseServer
      .from('assigned_expenses')
      .insert(assignedRows);

    if (assignErr) {
      console.error(assignErr);
      throw assignErr;
    }

    return NextResponse.json(
      { expense, assigned: assignedRows },
      { status: 201, headers: response.headers }
    );
  } catch (err) {
    console.error('Error in /api/expenses/create:', err);
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    );
  }
}