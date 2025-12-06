// app/api/expenses/[id]/route.js
import { NextResponse } from 'next/server';
import { createSSRClientFromRequest } from '@/lib/supabaseSSR';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PUT(request, context) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request);
    const { id } = context.params;

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: response.headers });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing expense id' }, { status: 400, headers: response.headers });
    }

    const body = await request.json();
    const { title, amount, assigned, note } = body;

    if (!title || amount == null || !Array.isArray(assigned)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: response.headers });
    }

    const total = Number(amount);
    if (Number.isNaN(total) || total <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400, headers: response.headers });
    }

    const totalAssigned = assigned.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    if (Math.abs(totalAssigned - total) > 0.05) {
      return NextResponse.json({ error: 'Assigned amounts do not match total' }, { status: 400, headers: response.headers });
    }

    const { data: existing, error: fetchErr } = await supabaseServer
      .from('expenses')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404, headers: response.headers });
    }

    const { error: expErr } = await supabaseServer
      .from('expenses')
      .update({ title, amount: total, note: note || null })
      .eq('id', id);

    if (expErr) throw expErr;

    await supabaseServer.from('assigned_expenses').delete().eq('expense_id', id);

    const rows = assigned.map(a => ({
      expense_id: id,
      user_id: a.user_id,
      amount: a.amount,
      fulfilled: false,
    }));

    const { error: insErr } = await supabaseServer
      .from('assigned_expenses')
      .insert(rows);

    if (insErr) throw insErr;

    return NextResponse.json({ success: true }, { status: 200, headers: response.headers });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing expense id' }, { status: 400 });
    }

    const { supabase, response } = createSSRClientFromRequest(request);
    const { data: userData, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: response.headers });
    }

    const currentUserId = userData.user.id;

    const { data: expense, error: expErr } = await supabaseServer
      .from('expenses')
      .select('group_id')
      .eq('id', id)
      .single();

    if (expErr || !expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const { data: gm, error: gmErr } = await supabaseServer
      .from('group_members')
      .select('role')
      .eq('group_id', expense.group_id)
      .eq('user_id', currentUserId)
      .single();

    if (gmErr || !gm || gm.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only group admins can delete expenses' }, { status: 403 });
    }

    const { error: delErr } = await supabaseServer
      .from('expenses')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true }, { status: 200, headers: response.headers });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}