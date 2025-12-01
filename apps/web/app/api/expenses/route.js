import { NextResponse } from "next/server";
import { createSSRClientFromRequest } from "@/lib/supabaseSSR";
import { supabaseServer } from "@/lib/supabaseServer";

/* ----------------------------------------------------
   GET — Fetch expenses for a group OR for a user
---------------------------------------------------- */
export async function GET(request) {
  try {
    const { supabase, response } = createSSRClientFromRequest(request);

    // AUTH
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: response.headers }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId");
    const userId = searchParams.get("userId");

    if (!groupId && !userId) {
      return NextResponse.json(
        { error: "Missing groupId or userId" },
        { status: 400, headers: response.headers }
      );
    }

    /* --------------------------------------------
       GROUP VIEW — return all expenses in a group
    -------------------------------------------- */
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

      // Compute "fulfilled" if ALL assigned_expenses are fulfilled
      const computed = (expenses || []).map((exp) => {
        const allFulfilled =
          exp.assigned?.length > 0 &&
          exp.assigned.every((a) => a.fulfilled === true);

        return {
          ...exp,
          fulfilled: allFulfilled,
        };
      });

      return NextResponse.json(computed, {
        status: 200,
        headers: response.headers,
      });
    }

    /* --------------------------------------------
       USER VIEW — expenses where this user is assigned
    -------------------------------------------- */
    const { data: assignments, error: aErr } = await supabaseServer
      .from("assigned_expenses")
      .select(
        `
        id,
        expense_id,
        user_id,
        amount,
        fulfilled
      `
      )
      .eq("user_id", userId);

    if (aErr) throw aErr;

    if (!assignments || assignments.length === 0) {
      return NextResponse.json([], {
        status: 200,
        headers: response.headers,
      });
    }

    const expenseIds = [...new Set(assignments.map((a) => a.expense_id))];

    const { data: expensesData, error: e2Err } = await supabaseServer
      .from("expenses")
      .select(
        `
        id,
        group_id,
        title,
        amount,
        note,
        occurred_at
      `
      )
      .in("id", expenseIds);

    if (e2Err) throw e2Err;

    // Attach user's own assignments
    const assignmentsByExpense = new Map();
    for (const a of assignments) {
      if (!assignmentsByExpense.has(a.expense_id)) {
        assignmentsByExpense.set(a.expense_id, []);
      }
      assignmentsByExpense.get(a.expense_id).push(a);
    }

    const result =
      expensesData?.map((exp) => ({
        ...exp,
        assigned: assignmentsByExpense.get(exp.id) ?? [],
      })) ?? [];

    return NextResponse.json(result, {
      status: 200,
      headers: response.headers,
    });
  } catch (err) {
    console.error("GET /api/expenses error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/* ----------------------------------------------------
   POST — Create new expense
---------------------------------------------------- */
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, amount, group_id, payer_id, note, selectedMembers, splitMethod, customAmounts } =
      body;

    if (!title || !amount || !group_id || !payer_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Create expense
    const { data: expenseRows, error: expErr } = await supabaseServer
      .from("expenses")
      .insert([
        {
          title,
          amount,
          note: note || null,
          group_id,
          payer_id,
          occurred_at: new Date(),
        },
      ])
      .select()
      .limit(1);

    if (expErr) throw expErr;

    const expense = expenseRows[0];

    // 2. Insert assigned splits
    const rows = selectedMembers.map((uid) => ({
      expense_id: expense.id,
      user_id: uid,
      amount:
        splitMethod === "equal"
          ? Number(amount) / selectedMembers.length
          : Number(customAmounts?.[uid] ?? 0),
      fulfilled: false,
    }));

    const { error: assignErr } = await supabaseServer
      .from("assigned_expenses")
      .insert(rows);

    if (assignErr) throw assignErr;

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("POST /api/expenses error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/* ----------------------------------------------------
   PUT — Update existing expense
---------------------------------------------------- */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, amount, note, assigned } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing expense id" },
        { status: 400 }
      );
    }

    // Update expense
    const { error: updateErr } = await supabaseServer
      .from("expenses")
      .update({
        title,
        amount,
        note: note || null,
      })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // Replace assignments
    await supabaseServer.from("assigned_expenses").delete().eq("expense_id", id);

    const rows = assigned.map((a) => ({
      expense_id: id,
      user_id: a.user_id,
      amount: a.amount,
      fulfilled: false,
    }));

    const { error: aeErr } = await supabaseServer
      .from("assigned_expenses")
      .insert(rows);

    if (aeErr) throw aeErr;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/expenses error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/* ----------------------------------------------------
   DELETE — Delete expense
---------------------------------------------------- */
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    // Delete assignments
    await supabaseServer
      .from("assigned_expenses")
      .delete()
      .eq("expense_id", id);

    // Delete expense
    await supabaseServer.from("expenses").delete().eq("id", id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/expenses error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}