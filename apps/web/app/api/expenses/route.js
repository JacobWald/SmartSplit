import { NextResponse } from "next/server";
import { createSSRClientFromRequest } from "@/lib/supabaseSSR";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: response.headers }
      );
    }

    const params = request.nextUrl.searchParams;
    const groupId = params.get("groupId");
    const userId = params.get("userId");

    if (!groupId && !userId) {
      return NextResponse.json(
        { error: "Missing groupId or userId" },
        { status: 400, headers: response.headers }
      );
    }

    if (groupId) {
      const { data: expenses, error: eErr } = await supabaseServer
        .from("expenses")
        .select(
          `
          id,
          group_id,
          title,
          amount,
          note,
          occurred_at,
          assigned:assigned_expenses (
            id,
            user_id,
            amount,
            fulfilled
          )
        `
        )
        .eq("group_id", groupId)
        .order("occurred_at", { ascending: false });

      if (eErr) throw eErr;

      const mapped =
        expenses?.map((exp) => {
          const allFulfilled =
            exp.assigned?.length > 0 &&
            exp.assigned.every((a) => a.fulfilled === true);

          return { ...exp, fulfilled: allFulfilled };
        }) ?? [];

      return NextResponse.json(mapped, {
        status: 200,
        headers: response.headers,
      });
    }

    const { data: assignments, error: aErr } = await supabaseServer
      .from("assigned_expenses")
      .select("id, expense_id, user_id, amount, fulfilled")
      .eq("user_id", userId);

    if (aErr) throw aErr;

    if (!assignments?.length) {
      return NextResponse.json([], {
        status: 200,
        headers: response.headers,
      });
    }

    const expenseIds = [...new Set(assignments.map((a) => a.expense_id))];

    const { data: expensesData, error: e2Err } = await supabaseServer
      .from("expenses")
      .select("id, group_id, title, amount, note, occurred_at")
      .in("id", expenseIds);

    if (e2Err) throw e2Err;

    const byExpense = new Map();
    assignments.forEach((a) => {
      if (!byExpense.has(a.expense_id)) byExpense.set(a.expense_id, []);
      byExpense.get(a.expense_id).push(a);
    });

    const result =
      expensesData?.map((exp) => ({
        ...exp,
        assigned: byExpense.get(exp.id) || [],
      })) ?? [];

    return NextResponse.json(result, {
      status: 200,
      headers: response.headers,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, amount, group_id, payer_id, note, assigned } = body;

    if (!title || !amount || !group_id || !payer_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!Array.isArray(assigned) || assigned.length === 0) {
      return NextResponse.json({ error: "assigned must be non-empty" }, { status: 400 });
    }

    const { data: rows, error: expErr } = await supabaseServer
      .from("expenses")
      .insert([
        {
          title,
          amount,
          group_id,
          payer_id,
          note: note || null,
          occurred_at: new Date(),
        },
      ])
      .select()
      .limit(1);

    if (expErr) throw expErr;
    const expense = rows[0];

    const inserts = assigned.map((a) => ({
      expense_id: expense.id,
      user_id: a.user_id,
      amount: Number(a.amount),
      fulfilled: false,
    }));

    const { error: assignErr } = await supabaseServer
      .from("assigned_expenses")
      .insert(inserts);

    if (assignErr) throw assignErr;

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, amount, note, assigned } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing expense id" }, { status: 400 });
    }

    const { error: updateErr } = await supabaseServer
      .from("expenses")
      .update({
        title,
        amount,
        note: note || null,
      })
      .eq("id", id);

    if (updateErr) throw updateErr;

    await supabaseServer.from("assigned_expenses").delete().eq("expense_id", id);

    const inserts = assigned.map((a) => ({
      expense_id: id,
      user_id: a.user_id,
      amount: a.amount,
      fulfilled: false,
    }));

    const { error: aeErr } = await supabaseServer
      .from("assigned_expenses")
      .insert(inserts);

    if (aeErr) throw aeErr;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await supabaseServer
      .from("assigned_expenses")
      .delete()
      .eq("expense_id", id);

    await supabaseServer.from("expenses").delete().eq("id", id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}