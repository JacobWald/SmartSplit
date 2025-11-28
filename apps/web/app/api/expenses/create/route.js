import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Create a new expense
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, amount, group_id, payer_id, assigned } = body;

    if (!title || !amount || !group_id || !payer_id || !assigned) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // INSERT INTO expenses
    const { data: expenseData, error: expenseErr } = await supabaseServer
      .from("expenses")
      .insert([
        {
          title,
          amount,
          group_id,
          payer_id,
          currency: "USD",
          occurred_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (expenseErr) throw expenseErr;

    const expenseId = expenseData.id;

    // INSERT INTO assigned_expenses (one row per member)
    const rows = assigned.map((a) => ({
      expense_id: expenseId,
      user_id: a.user_id,
      amount: a.amount,
    }));

    const { error: assignedErr } = await supabaseServer
      .from("assigned_expenses")
      .insert(rows);

    if (assignedErr) throw assignedErr;

    return NextResponse.json(
      { success: true, expense: expenseData },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}