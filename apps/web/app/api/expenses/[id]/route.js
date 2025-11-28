// app/api/expenses/[id]/route.js
import { NextResponse } from 'next/server';
import { createSSRClientFromRequest } from '@/lib/supabaseSSR';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PUT(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request);

    // Derive the expense id from the URL path
    const pathname = request.nextUrl?.pathname || '';
    const segments = pathname.split('/').filter(Boolean);
    const id = segments[segments.length - 1]; // last piece is the id

    console.log('PUT /api/expenses/[id] pathname =', pathname, 'derived id =', id);

    // Auth check
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: response.headers },
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing expense id in URL' },
        { status: 400, headers: response.headers },
      );
    }

    // Parse body
    const body = await request.json();
    const { title, amount, assigned } = body;

    if (!title || amount == null || !Array.isArray(assigned)) {
      return NextResponse.json(
        { error: 'Missing required fields for expense update' },
        { status: 400, headers: response.headers },
      );
    }

    const total = Number(amount);
    if (Number.isNaN(total) || total <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400, headers: response.headers },
      );
    }

    const totalAssigned = assigned.reduce(
      (sum, a) => sum + (Number(a.amount) || 0),
      0,
    );

    if (Math.abs(totalAssigned - total) > 0.05) {
      return NextResponse.json(
        {
          error:
            'Assigned amounts do not match total. Please recheck your split.',
        },
        { status: 400, headers: response.headers },
      );
    }

    // Verify expense exists
    const { data: existing, error: fetchErr } = await supabaseServer
      .from('expenses')
      .select('id, group_id, payer_id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404, headers: response.headers },
      );
    }

    // Update expense row
    const { error: expErr } = await supabaseServer
      .from('expenses')
      .update({
        title,
        amount: total,
        qty: 1,
        unit_price: total,
      })
      .eq('id', id);

    if (expErr) {
      console.error('Error updating expense:', expErr);
      throw expErr;
    }

    // Replace assigned_expenses
    const { error: delErr } = await supabaseServer
      .from('assigned_expenses')
      .delete()
      .eq('expense_id', id);

    if (delErr) {
      console.error('Error deleting old assignments:', delErr);
      throw delErr;
    }

    const rows = assigned.map((a) => ({
      expense_id: id,
      user_id: a.user_id,
      amount: a.amount,
    }));

    const { error: insErr } = await supabaseServer
      .from('assigned_expenses')
      .insert(rows);

    if (insErr) {
      console.error('Error inserting new assignments:', insErr);
      throw insErr;
    }

    return NextResponse.json(
      { success: true },
      { status: 200, headers: response.headers },
    );
  } catch (err) {
    console.error('PUT /api/expenses/[id] error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
