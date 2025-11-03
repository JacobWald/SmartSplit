import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/groups?owner_id=<uuid>
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner_id = searchParams.get("owner_id"); // optional filter

    let query = supabaseServer.from("groups").select("*").order("created_at", { ascending: false });
    if (owner_id) query = query.eq("owner_id", owner_id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

// POST /api/groups  { name, owner_id, base_currency? }
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, owner_id, base_currency = "USD" } = body;

    if (!name || !owner_id) {
      return NextResponse.json({ error: "name and owner_id are required" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("groups")
      .insert([{ name, owner_id, base_currency }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
