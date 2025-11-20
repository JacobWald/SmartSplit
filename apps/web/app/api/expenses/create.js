import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { title, amount, group_id, payer_id, assigned } = body;

    const { data: expense, error: expErr } = await supabaseServer
      .from("expenses")
      .insert([
        {
          title,
          amount,
          group_id,
          payer_id,
          currency: "USD",
          occurred_at: new Date(),
          unit_price: amount,
        },
      ])
      .select("*")
      .single();

    if (expErr) throw expErr;

    // build assignment rows
    const assignedRows = assigned.map((m) => ({
      expense_id: expense.id,
      user_id: m.user_id,
      amount: m.amount,
    }));

    const { error: asgErr } = await supabaseServer
      .from("assigned_expenses")
      .insert(assignedRows);

    if (asgErr) throw asgErr;

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}